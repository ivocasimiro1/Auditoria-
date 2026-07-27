// Cloudflare Pages Function — GET /api/verificar-resultados
//
// Confirma o resultado real dos jogos cujas oportunidades já foram registadas
// (ver odds-scan.js → registarPrevisoes) e ainda não foram resolvidas, usando
// o endpoint de resultados da The Odds API. Chamar periodicamente via cron
// externo (mesmo mecanismo já usado para os alertas Telegram) — não corre
// sozinho, este projeto não tem cron interno.
//
// Precisa de ODDS_KV configurado (Cloudflare Pages → Settings → Functions →
// KV namespace bindings) — sem isso, devolve erro e não faz nada.

const ODDS_API_BASE = 'https://api.the-odds-api.com/v4';
const MARGEM_MS = 3 * 3_600_000; // espera 3h depois do início do jogo antes de tentar verificar

export async function onRequestGet(context) {
  const { env } = context;

  if (!env.ODDS_API_KEY) {
    return json({ error: 'ODDS_API_KEY não configurada.' }, 500);
  }
  if (!env.ODDS_KV) {
    return json({ error: 'ODDS_KV não configurado — histórico de acertos desativado.' }, 400);
  }

  const agora = Date.now();
  const pendentes = [];

  let cursor;
  do {
    const lista = await env.ODDS_KV.list({ prefix: 'pred:', cursor });
    cursor = lista.cursor;
    for (const chaveInfo of lista.keys) {
      const registo = await env.ODDS_KV.get(chaveInfo.name, 'json');
      if (!registo || registo.resolvido || !registo.inicio || !registo.sportKey) continue;
      if (new Date(registo.inicio).getTime() + MARGEM_MS > agora) continue; // ainda não deu tempo
      pendentes.push({ chave: chaveInfo.name, registo });
    }
  } while (cursor);

  if (pendentes.length === 0) {
    return json({ verificados: 0, acertos: 0, falhas: 0, mensagem: 'Nada pendente para verificar.' });
  }

  // Agrupa por desporto para pedir os resultados uma vez por desporto, não por jogo.
  const porDesporto = {};
  for (const p of pendentes) {
    (porDesporto[p.registo.sportKey] ||= []).push(p);
  }

  let verificados = 0, acertos = 0, falhas = 0;

  for (const sportKey in porDesporto) {
    let scores;
    try {
      const resp = await fetch(
        `${ODDS_API_BASE}/sports/${encodeURIComponent(sportKey)}/scores/?apiKey=${env.ODDS_API_KEY}&daysFrom=3`
      );
      if (!resp.ok) continue;
      scores = await resp.json();
    } catch (err) { continue; }

    if (!Array.isArray(scores)) continue;

    for (const { chave, registo } of porDesporto[sportKey]) {
      const jogo = scores.find(s => s.completed && `${s.home_team} vs ${s.away_team}` === registo.evento);
      if (!jogo || !Array.isArray(jogo.scores)) continue;

      const scoreCasa = jogo.scores.find(s => s.name === jogo.home_team);
      const scoreFora = jogo.scores.find(s => s.name === jogo.away_team);
      const golosCasa = parseInt(scoreCasa?.score, 10);
      const golosFora = parseInt(scoreFora?.score, 10);
      if (Number.isNaN(golosCasa) || Number.isNaN(golosFora)) continue;

      const resultadoReal = golosCasa > golosFora ? jogo.home_team : golosCasa < golosFora ? jogo.away_team : 'Draw';

      // Arbitragem é lucro garantido por construção matemática — o "acerto" aqui é
      // sobre a deteção ter sido válida (jogo aconteceu normalmente), não sobre
      // adivinhar o resultado, que é irrelevante para arbitragem.
      const acertou = registo.tipo === 'arbitragem' ? true : registo.resultado === resultadoReal;

      registo.resolvido = true;
      registo.resultadoReal = resultadoReal;
      registo.golosCasa = golosCasa;
      registo.golosFora = golosFora;
      registo.acertou = acertou;
      registo.verificadoEm = new Date().toISOString();

      await env.ODDS_KV.put(chave, JSON.stringify(registo));
      verificados++;
      if (acertou) acertos++; else falhas++;
    }
  }

  return json({ verificados, acertos, falhas, pendentesTotal: pendentes.length });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
