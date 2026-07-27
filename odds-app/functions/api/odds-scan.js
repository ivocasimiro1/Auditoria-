// Cloudflare Pages Function — GET /api/odds-scan
// Busca odds à The Odds API (server-side, chave nunca exposta ao browser),
// deteta arbitragem (surebets) e value bets, e opcionalmente envia alerta Telegram.
//
// Env vars necessárias (Cloudflare Pages → Settings → Environment variables):
//   ODDS_API_KEY        (obrigatória)   — chave de https://the-odds-api.com
//   TELEGRAM_BOT_TOKEN   (opcional)     — só necessária para alertas
//   TELEGRAM_CHAT_ID     (opcional)     — só necessária para alertas

const ODDS_API_BASE = 'https://api.the-odds-api.com/v4';

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  if (!env.ODDS_API_KEY) {
    return json({ error: 'ODDS_API_KEY não configurada nas variáveis de ambiente do Cloudflare Pages.' }, 500);
  }

  const sport = url.searchParams.get('sport') || 'upcoming';
  const regions = url.searchParams.get('regions') || 'eu';
  const minEdge = parseFloat(url.searchParams.get('minEdge') || '3');
  const minArb = parseFloat(url.searchParams.get('minArb') || '0.5');
  const notify = url.searchParams.get('notify') === '1';
  const casasFiltro = (url.searchParams.get('casas') || '')
    .split(',').map(s => s.trim().toLowerCase()).filter(Boolean);

  const oddsUrl = `${ODDS_API_BASE}/sports/${encodeURIComponent(sport)}/odds/`
    + `?apiKey=${env.ODDS_API_KEY}&regions=${encodeURIComponent(regions)}&markets=h2h&oddsFormat=decimal`;

  let resp;
  try {
    resp = await fetch(oddsUrl);
  } catch (err) {
    return json({ error: 'Falha ao contactar The Odds API: ' + err.message }, 502);
  }

  if (!resp.ok) {
    const body = await resp.text();
    return json({ error: `The Odds API respondeu ${resp.status}`, details: body }, resp.status);
  }

  const events = await resp.json();
  const { arbitrages, valueBets } = analyzeEvents(events, { minEdge, minArb, casasFiltro });

  const meta = {
    sport,
    regions,
    casasFiltro,
    eventsAnalisados: events.length,
    requestsRestantes: resp.headers.get('x-requests-remaining'),
    requestsUsadas: resp.headers.get('x-requests-used'),
    geradoEm: new Date().toISOString(),
  };

  if (notify && env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID) {
    await sendTelegramAlert(env, arbitrages, valueBets);
  }

  return json({ meta, arbitrages, valueBets });
}

// --- Lógica de deteção ---------------------------------------------------

function analyzeEvents(events, { minEdge, minArb, casasFiltro = [] }) {
  const arbitrages = [];
  const valueBets = [];

  const passaFiltro = (titulo) =>
    casasFiltro.length === 0 || casasFiltro.some(f => titulo.toLowerCase().includes(f));

  for (const ev of events) {
    const books = (ev.bookmakers || [])
      .map(bk => ({ key: bk.key, title: bk.title, market: (bk.markets || []).find(m => m.key === 'h2h') }))
      .filter(bk => bk.market && bk.market.outcomes && bk.market.outcomes.length >= 2);

    if (books.length < 2) continue;

    const outcomeNames = [...new Set(books.flatMap(bk => bk.market.outcomes.map(o => o.name)))];
    if (outcomeNames.length < 2) continue;

    // Probabilidade "justa" de consenso usa SEMPRE todas as casas disponíveis (estimativa mais robusta),
    // independentemente do filtro — o filtro só decide que odds são mostradas/utilizáveis.
    const best = {}; // outcome -> { price, bookmaker } — só entre casas que passam o filtro
    const fairProbSum = {}; // outcome -> soma das probabilidades sem vig (todas as casas)
    let booksWithFullMarket = 0;

    for (const bk of books) {
      const prices = {};
      for (const o of bk.market.outcomes) prices[o.name] = o.price;
      if (outcomeNames.some(n => !(n in prices))) continue; // mercado incompleto nesta casa
      booksWithFullMarket++;

      const overround = outcomeNames.reduce((s, n) => s + 1 / prices[n], 0);
      const elegivel = passaFiltro(bk.title);
      for (const n of outcomeNames) {
        const fairP = (1 / prices[n]) / overround;
        fairProbSum[n] = (fairProbSum[n] || 0) + fairP;

        if (elegivel && (!best[n] || prices[n] > best[n].price)) {
          best[n] = { price: prices[n], bookmaker: bk.title };
        }
      }
    }

    if (booksWithFullMarket < 2) continue;

    // Arbitragem: só entre as casas do filtro (senão a combinação não é realmente jogável)
    if (outcomeNames.every(n => best[n])) {
      const arbSum = outcomeNames.reduce((s, n) => s + 1 / best[n].price, 0);
      if (arbSum < 1) {
        const arbPct = (1 - arbSum) * 100;
        if (arbPct >= minArb) {
          arbitrages.push({
            evento: `${ev.home_team} vs ${ev.away_team}`,
            desporto: ev.sport_title,
            inicio: ev.commence_time,
            lucroPct: round2(arbPct),
            pernas: outcomeNames.map(n => ({
              resultado: n,
              casa: best[n].bookmaker,
              odd: best[n].price,
              stakePct: round2((1 / best[n].price / arbSum) * 100),
            })),
          });
        }
      }
    }

    // Value bets: odd de uma casa (do filtro) vs probabilidade justa de consenso (todas as casas)
    for (const n of outcomeNames) {
      const consensusFairP = fairProbSum[n] / booksWithFullMarket;
      if (!consensusFairP) continue;
      const fairOdd = 1 / consensusFairP;

      for (const bk of books) {
        if (!passaFiltro(bk.title)) continue;
        const outcome = bk.market.outcomes.find(o => o.name === n);
        if (!outcome) continue;
        const edgePct = (outcome.price * consensusFairP - 1) * 100;
        if (edgePct >= minEdge) {
          valueBets.push({
            evento: `${ev.home_team} vs ${ev.away_team}`,
            desporto: ev.sport_title,
            inicio: ev.commence_time,
            resultado: n,
            casa: bk.title,
            odd: outcome.price,
            oddJusta: round2(fairOdd),
            edgePct: round2(edgePct),
          });
        }
      }
    }
  }

  arbitrages.sort((a, b) => b.lucroPct - a.lucroPct);
  valueBets.sort((a, b) => b.edgePct - a.edgePct);
  return { arbitrages, valueBets };
}

function round2(n) { return Math.round(n * 100) / 100; }

async function sendTelegramAlert(env, arbitrages, valueBets) {
  if (arbitrages.length === 0 && valueBets.length === 0) return;

  const lines = [];
  if (arbitrages.length) {
    lines.push(`*Arbitragem detetada (${arbitrages.length})*`);
    for (const a of arbitrages.slice(0, 5)) {
      lines.push(`• ${a.evento} — lucro ${a.lucroPct}%`);
      for (const p of a.pernas) lines.push(`   ${p.resultado}: ${p.odd} @ ${p.casa} (${p.stakePct}%)`);
    }
  }
  if (valueBets.length) {
    lines.push(`\n*Value bets (${valueBets.length})*`);
    for (const v of valueBets.slice(0, 5)) {
      lines.push(`• ${v.evento} — ${v.resultado} @ ${v.casa}: ${v.odd} (edge ${v.edgePct}%, justa ${v.oddJusta})`);
    }
  }

  const text = lines.join('\n');
  await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: env.TELEGRAM_CHAT_ID, text, parse_mode: 'Markdown' }),
  });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
