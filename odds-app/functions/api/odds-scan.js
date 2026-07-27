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
  // Chão bem baixo por omissão: o frontend já não filtra aqui por Edge/Lucro mín.
  // (isso é feito do lado do cliente, para as listas completas), esta função
  // devolve sempre o conjunto mais amplo possível dentro dos limites de segurança
  // (maxEdge/maxArb/minBooks/ao vivo), para a "Sugestão principal" nunca ficar
  // escondida por um limiar demasiado alto.
  const minEdge = parseFloat(url.searchParams.get('minEdge') || '0.5');
  const minArb = parseFloat(url.searchParams.get('minArb') || '0.1');
  const maxEdge = parseFloat(url.searchParams.get('maxEdge') || '25');
  const maxArb = parseFloat(url.searchParams.get('maxArb') || '15');
  const minBooks = parseInt(url.searchParams.get('minBooks') || '3', 10);
  const incluirAoVivo = url.searchParams.get('aoVivo') === '1';
  const notify = url.searchParams.get('notify') === '1';
  const diasJanela = parseFloat(url.searchParams.get('dias') || '7');
  // Value bets do modelo próprio: comparam a odd da casa contra a nossa própria
  // previsão estatística (não contra o consenso de outras casas). Tecto mais alto
  // que os value bets normais (35 vs 25) porque um modelo independente pode
  // legitimamente discordar mais do mercado do que as casas discordam entre si —
  // mas continua a existir, para não confiar cegamente num erro de mapeamento
  // de equipa ou numa estimativa maluca do modelo.
  const minEdgeModelo = parseFloat(url.searchParams.get('minEdgeModelo') || '5');
  const maxEdgeModelo = parseFloat(url.searchParams.get('maxEdgeModelo') || '35');
  const casasFiltro = (url.searchParams.get('casas') || '')
    .split(',').map(s => s.trim().toLowerCase()).filter(Boolean);

  // Garante explicitamente que cobrimos "a semana toda" (hoje até +N dias), em vez de
  // depender do que a The Odds API decide devolver por padrão para cada desporto.
  const agoraISO = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
  const ateISO = new Date(Date.now() + diasJanela * 86_400_000).toISOString().replace(/\.\d{3}Z$/, 'Z');

  const oddsUrl = `${ODDS_API_BASE}/sports/${encodeURIComponent(sport)}/odds/`
    + `?apiKey=${env.ODDS_API_KEY}&regions=${encodeURIComponent(regions)}&markets=h2h&oddsFormat=decimal`
    + `&commenceTimeFrom=${agoraISO}&commenceTimeTo=${ateISO}`;

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
  const { arbitrages, valueBets, eventosIgnorados } = analyzeEvents(events, {
    minEdge, minArb, maxEdge, maxArb, minBooks, casasFiltro, incluirAoVivo,
  });

  // Previsões por modelo estatístico próprio (histórico de golos), independente
  // de qualquer casa de apostas — dá sugestões mesmo quando não há discrepância
  // nenhuma entre bookmakers. Falhas (liga sem dados, equipa não reconhecida)
  // são silenciosas: o jogo simplesmente não aparece na lista de previsões.
  const previsoes = await calcularPrevisoes(events);

  // Value bets do modelo próprio: em vez de comparar casas entre si (o que só
  // encontra valor quando as casas discordam umas das outras), compara cada
  // odd contra a nossa própria estimativa. Encontra oportunidades que o
  // método de consenso nunca veria — quando TODAS as casas concordam entre si,
  // mas o nosso modelo, com dados históricos, discorda de todas ao mesmo tempo.
  const valueBetsModelo = await calcularValorModelo(events, casasFiltro, minEdgeModelo, maxEdgeModelo, Date.now());

  const meta = {
    sport,
    regions,
    casasFiltro,
    eventsAnalisados: events.length,
    eventosIgnorados,
    janelaAte: ateISO,
    requestsRestantes: resp.headers.get('x-requests-remaining'),
    requestsUsadas: resp.headers.get('x-requests-used'),
    geradoEm: new Date().toISOString(),
  };

  if (notify && env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID) {
    await sendTelegramAlert(env, arbitrages, valueBets, valueBetsModelo);
  }

  return json({ meta, arbitrages, valueBets, previsoes, valueBetsModelo });
}

// --- Lógica de deteção ---------------------------------------------------

function analyzeEvents(events, { minEdge, minArb, maxEdge, maxArb, minBooks, casasFiltro = [], incluirAoVivo }) {
  const arbitrages = [];
  const valueBets = [];
  let eventosIgnorados = 0;

  const passaFiltro = (titulo) =>
    casasFiltro.length === 0 || casasFiltro.some(f => titulo.toLowerCase().includes(f));

  const agora = Date.now();

  for (const ev of events) {
    // Jogos já começados (ao vivo) têm odds que mudam demasiado depressa — a snapshot da API
    // fica desatualizada em segundos e gera arbitragens/value bets "fantasma" (odds que já
    // não existem quando tentas apostar). Por omissão, só consideramos jogos ainda não começados.
    if (!incluirAoVivo && ev.commence_time && new Date(ev.commence_time).getTime() <= agora) {
      eventosIgnorados++;
      continue;
    }

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

    // Arbitragem: só entre as casas do filtro (senão a combinação não é realmente jogável).
    // Tecto de sanidade (maxArb): lucros muito acima do normal são quase sempre odds erradas/
    // desatualizadas, não vantagem real — filtramos em vez de mostrar como "grande oportunidade".
    if (outcomeNames.every(n => best[n])) {
      const arbSum = outcomeNames.reduce((s, n) => s + 1 / best[n].price, 0);
      if (arbSum < 1) {
        const arbPct = (1 - arbSum) * 100;
        if (arbPct >= minArb && arbPct <= maxArb) {
          const confianca = calcularConfianca(arbPct, booksWithFullMarket, ev.commence_time, agora, 1.5);
          arbitrages.push({
            evento: `${ev.home_team} vs ${ev.away_team}`,
            desporto: ev.sport_title,
            inicio: ev.commence_time,
            lucroPct: round2(arbPct),
            confianca: confianca.score,
            confiancaLabel: confianca.label,
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

    // Value bets: odd de uma casa (do filtro) vs probabilidade justa de consenso (todas as casas).
    // Exige pelo menos `minBooks` casas no consenso — com poucas casas (ligas pouco líquidas),
    // uma única odd mal colocada distorce a "odd justa" e gera edges gigantes e falsos.
    // Tecto de sanidade (maxEdge): edges muito acima do normal são quase sempre erro de dados.
    if (booksWithFullMarket < minBooks) continue;

    for (const n of outcomeNames) {
      const consensusFairP = fairProbSum[n] / booksWithFullMarket;
      if (!consensusFairP) continue;
      const fairOdd = 1 / consensusFairP;

      for (const bk of books) {
        if (!passaFiltro(bk.title)) continue;
        const outcome = bk.market.outcomes.find(o => o.name === n);
        if (!outcome) continue;
        const edgePct = (outcome.price * consensusFairP - 1) * 100;
        if (edgePct >= minEdge && edgePct <= maxEdge) {
          const confianca = calcularConfianca(edgePct, booksWithFullMarket, ev.commence_time, agora);
          valueBets.push({
            evento: `${ev.home_team} vs ${ev.away_team}`,
            desporto: ev.sport_title,
            inicio: ev.commence_time,
            resultado: n,
            casa: bk.title,
            odd: outcome.price,
            oddJusta: round2(fairOdd),
            edgePct: round2(edgePct),
            confianca: confianca.score,
            confiancaLabel: confianca.label,
          });
        }
      }
    }
  }

  arbitrages.sort((a, b) => b.confianca - a.confianca || b.lucroPct - a.lucroPct);
  valueBets.sort((a, b) => b.confianca - a.confianca || b.edgePct - a.edgePct);
  return { arbitrages, valueBets, eventosIgnorados };
}

// Score de confiança (0-100): combina três sinais independentes do valor %,
// para ajudar a decidir rapidamente onde vale a pena olhar primeiro.
//   - Robustez do mercado: quantas casas a API tinha para este evento (mais = dados mais fiáveis)
//   - Qualidade do valor: penaliza tanto valores marginais como valores extremos (mais suspeitos)
//   - Proximidade do jogo: jogos mais próximos têm odds mais "assentes"/menos propensas a mudar muito
//
// `idealPct` é o "ponto doce" da qualidade — nem marginal nem suspeito — e MUDA
// consoante o tipo de valor: arbitragem é tipicamente 0.3-3% (vs. minArb/maxArb
// de 0.5/15 por omissão), bem mais pequena que value bets (2-25%). Usar o mesmo
// ponto de referência para os dois subvalorizava sistematicamente arbitragens
// boas (ex: uma arb de 0.5% com 5 casas ficava "Média" só por a % ser pequena,
// quando essa % pequena é normal e saudável para arbitragem).
function calcularConfianca(valorPct, numCasas, inicioISO, agora, idealPct = 8) {
  const scoreRobustez = Math.min(100, numCasas * 20); // 3 casas=60, 5=100

  const scoreValor = Math.max(10, 100 - Math.abs(valorPct - idealPct) * 4);

  let scoreTempo = 40;
  if (inicioISO) {
    const horasAteJogo = (new Date(inicioISO).getTime() - agora) / 3_600_000;
    if (horasAteJogo <= 48) scoreTempo = 100;
    else if (horasAteJogo <= 168) scoreTempo = 70;
  }

  const score = Math.round(scoreRobustez * 0.4 + scoreValor * 0.4 + scoreTempo * 0.2);
  const label = score >= 75 ? 'Alta' : score >= 50 ? 'Média' : 'Baixa';
  return { score, label };
}

function round2(n) { return Math.round(n * 100) / 100; }

async function sendTelegramAlert(env, arbitrages, valueBets, valueBetsModelo = []) {
  if (arbitrages.length === 0 && valueBets.length === 0 && valueBetsModelo.length === 0) return;

  const lines = [];
  if (arbitrages.length) {
    lines.push(`*Arbitragem detetada (${arbitrages.length})*`);
    for (const a of arbitrages.slice(0, 5)) {
      lines.push(`• ${a.evento} — lucro ${a.lucroPct}% (confiança: ${a.confiancaLabel} ${a.confianca}/100)`);
      for (const p of a.pernas) lines.push(`   ${p.resultado}: ${p.odd} @ ${p.casa} (${p.stakePct}%)`);
    }
  }
  if (valueBets.length) {
    lines.push(`\n*Value bets (${valueBets.length})*`);
    for (const v of valueBets.slice(0, 5)) {
      lines.push(`• ${v.evento} — ${v.resultado} @ ${v.casa}: ${v.odd} (edge ${v.edgePct}%, justa ${v.oddJusta}, confiança: ${v.confiancaLabel} ${v.confianca}/100)`);
    }
  }
  if (valueBetsModelo.length) {
    lines.push(`\n*Value bets do modelo próprio (${valueBetsModelo.length})*`);
    for (const v of valueBetsModelo.slice(0, 5)) {
      lines.push(`• ${v.evento} — ${v.resultado} @ ${v.casa}: ${v.odd} (edge ${v.edgePct}%, odd modelo ${v.oddModelo}, confiança: ${v.confiancaLabel} ${v.confianca}/100)`);
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

// --- Previsões por modelo estatístico (histórico de golos) ---------------
//
// Modelo Poisson simplificado (a mesma ideia-base do Dixon-Coles do EdgeBet,
// sem a correção de baixa pontuação nem o decaimento temporal, para caber
// numa função Cloudflare sem bibliotecas de otimização): força de ataque/
// defesa de cada equipa a partir da média de golos marcados/sofridos na
// época mais recente, depois golos esperados = média da liga × ataque ×
// defesa do adversário, e probabilidades via distribuição de Poisson.
//
// Fonte de dados: football-data.co.uk (CSVs históricos gratuitos, sem
// necessidade de chave/conta). Cobre só as principais ligas europeias onde
// os nomes de equipas são razoavelmente previsíveis de mapear.

const LIGAS_FOOTBALL_DATA = [
  { codigo: 'E0',  match: (k, t) => /epl|premier_league|english_premier/i.test(k) || /premier league/i.test(t || '') },
  { codigo: 'SP1', match: (k, t) => /la_liga|spain/i.test(k) && !/segunda/i.test(k) },
  { codigo: 'I1',  match: (k, t) => /serie_a/i.test(k) && /italy/i.test(k) },
  { codigo: 'D1',  match: (k, t) => /bundesliga/i.test(k) && !/bundesliga2|bundesliga_2/i.test(k) },
  { codigo: 'F1',  match: (k, t) => /ligue_one|ligue1/i.test(k) },
  { codigo: 'P1',  match: (k, t) => /portugal/i.test(k) && /primeira/i.test(k) },
];

function codigoFootballData(sportKey, sportTitle){
  const liga = LIGAS_FOOTBALL_DATA.find(l => l.match(sportKey || '', sportTitle || ''));
  return liga ? liga.codigo : null;
}

// Época mais recente completa: a época europeia corre ago-mai; em jun/jul
// (entre épocas) usamos a que acabou de terminar, não a que ainda não começou.
function temporadaFootballData(agora = new Date()){
  const ano = agora.getUTCFullYear();
  const mes = agora.getUTCMonth() + 1;
  const anoInicio = mes >= 8 ? ano : ano - 1;
  const yy1 = String(anoInicio % 100).padStart(2, '0');
  const yy2 = String((anoInicio + 1) % 100).padStart(2, '0');
  return yy1 + yy2;
}

function normalizarNomeEquipa(nome){
  return String(nome || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove acentos
    .replace(/\b(fc|cf|afc|ac|sc|cd|sad)\b/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

// Aliases conhecidos onde a grafia da The Odds API e do football-data.co.uk
// divergem o suficiente para o normalizarNomeEquipa() não bater certo sozinho.
const ALIASES_EQUIPAS = {
  manchesterunited: 'manutd', manutd: 'manutd',
  manchestercity: 'mancity',
  tottenhamhotspur: 'tottenham', spurs: 'tottenham',
  wolverhamptonwanderers: 'wolves',
  newcastleunited: 'newcastle',
  brightonhovealbion: 'brighton',
  westhamunited: 'westham',
  nottinghamforest: 'nottmforest',
  athleticbilbao: 'athletic', athleticclub: 'athletic',
  atleticomadrid: 'atletico',
  realsociedad: 'sociedad',
  internazionale: 'inter',
  acmilan: 'milan',
  parisstgermain: 'psg', parissaintgermain: 'psg',
  sportingcp: 'sporting', sportinglisbon: 'sporting',
};

function chaveEquipa(nome){
  const n = normalizarNomeEquipa(nome);
  return ALIASES_EQUIPAS[n] || n;
}

// Cache de dados históricos por código de liga, para não pedir o mesmo CSV
// duas vezes dentro do mesmo pedido (vários jogos da mesma liga).
const cacheHistorico = new Map();

async function carregarHistoricoLiga(codigo){
  if(cacheHistorico.has(codigo)) return cacheHistorico.get(codigo);

  const temporada = temporadaFootballData();
  const url = `https://www.football-data.co.uk/mmz4281/${temporada}/${codigo}.csv`;

  let dados = null;
  try{
    const resp = await fetch(url);
    if(resp.ok){
      const texto = await resp.text();
      dados = calcularForcasEquipas(texto);
    }
  }catch(err){ /* sem dados históricos para esta liga agora — segue sem previsão */ }

  cacheHistorico.set(codigo, dados);
  return dados;
}

function calcularForcasEquipas(csvTexto){
  const linhas = csvTexto.split(/\r?\n/).filter(Boolean);
  if(linhas.length < 2) return null;

  const header = linhas[0].split(',');
  const idx = (col) => header.indexOf(col);
  const iHome = idx('HomeTeam'), iAway = idx('AwayTeam'), iFTHG = idx('FTHG'), iFTAG = idx('FTAG');
  if([iHome, iAway, iFTHG, iFTAG].some(i => i === -1)) return null;

  const stats = {}; // chave equipa -> { golosMarcadosCasa, jogosCasa, golosSofridosCasa, golosMarcadosFora, jogosFora, golosSofridosFora, nomeOriginal }
  let somaGolosCasa = 0, somaGolosFora = 0, totalJogos = 0;

  for(let i = 1; i < linhas.length; i++){
    const campos = linhas[i].split(',');
    const homeNome = campos[iHome], awayNome = campos[iAway];
    const gCasa = parseInt(campos[iFTHG], 10), gFora = parseInt(campos[iFTAG], 10);
    if(!homeNome || !awayNome || Number.isNaN(gCasa) || Number.isNaN(gFora)) continue;

    const kHome = chaveEquipa(homeNome), kAway = chaveEquipa(awayNome);
    if(!stats[kHome]) stats[kHome] = { golosMarcadosCasa:0, jogosCasa:0, golosSofridosCasa:0, golosMarcadosFora:0, jogosFora:0, golosSofridosFora:0, nomeOriginal:homeNome };
    if(!stats[kAway]) stats[kAway] = { golosMarcadosCasa:0, jogosCasa:0, golosSofridosCasa:0, golosMarcadosFora:0, jogosFora:0, golosSofridosFora:0, nomeOriginal:awayNome };

    stats[kHome].golosMarcadosCasa += gCasa;
    stats[kHome].golosSofridosCasa += gFora;
    stats[kHome].jogosCasa++;
    stats[kAway].golosMarcadosFora += gFora;
    stats[kAway].golosSofridosFora += gCasa;
    stats[kAway].jogosFora++;

    somaGolosCasa += gCasa;
    somaGolosFora += gFora;
    totalJogos++;
  }

  if(totalJogos < 20) return null; // dados insuficientes para uma estimativa minimamente estável

  const mediaGolosCasa = somaGolosCasa / totalJogos;
  const mediaGolosFora = somaGolosFora / totalJogos;

  const forcas = {};
  for(const k in stats){
    const s = stats[k];
    forcas[k] = {
      ataqueCasa: s.jogosCasa ? (s.golosMarcadosCasa / s.jogosCasa) / mediaGolosCasa : 1,
      defesaCasa: s.jogosCasa ? (s.golosSofridosCasa / s.jogosCasa) / mediaGolosFora : 1,
      ataqueFora: s.jogosFora ? (s.golosMarcadosFora / s.jogosFora) / mediaGolosFora : 1,
      defesaFora: s.jogosFora ? (s.golosSofridosFora / s.jogosFora) / mediaGolosCasa : 1,
    };
  }

  return { forcas, mediaGolosCasa, mediaGolosFora };
}

function poissonPmf(k, lambda){
  if(lambda <= 0) return k === 0 ? 1 : 0;
  let logP = -lambda + k * Math.log(lambda);
  for(let i = 2; i <= k; i++) logP -= Math.log(i);
  return Math.exp(logP);
}

function probabilidadesResultado(expGolosCasa, expGolosFora, maxGolos = 8){
  let pCasa = 0, pEmpate = 0, pFora = 0;
  for(let i = 0; i <= maxGolos; i++){
    for(let j = 0; j <= maxGolos; j++){
      const p = poissonPmf(i, expGolosCasa) * poissonPmf(j, expGolosFora);
      if(i > j) pCasa += p;
      else if(i === j) pEmpate += p;
      else pFora += p;
    }
  }
  return { pCasa, pEmpate, pFora };
}

// Converte os números crus da previsão numa frase única, ao estilo de um
// comentário de analista — para não obrigar a ler percentagens para perceber
// o que o modelo está a dizer sobre o jogo.
function comentarioEspecialista(casa, fora, pCasa, pEmpate, pFora, expCasa, expFora){
  const favoritoPct = Math.max(pCasa, pEmpate, pFora) * 100;
  const golosTotais = expCasa + expFora;

  let linha;
  if(favoritoPct >= pCasa * 100 && pCasa >= pFora && pCasa >= pEmpate){
    if(favoritoPct >= 60) linha = `Favorito claro: ${casa} deve vencer em casa, segundo o histórico de golos desta época.`;
    else if(favoritoPct >= 45) linha = `Ligeira vantagem para ${casa} em casa, mas sem grande margem de segurança.`;
    else linha = `Jogo em aberto — ${casa} tem uma ligeira preferência, mas nada decisivo.`;
  } else if(pFora >= pCasa && pFora >= pEmpate){
    if(favoritoPct >= 60) linha = `Favorito claro: ${fora} deve vencer fora, apesar de jogar fora de casa.`;
    else if(favoritoPct >= 45) linha = `Ligeira vantagem para ${fora}, mesmo a jogar fora.`;
    else linha = `Jogo em aberto — ${fora} tem uma ligeira preferência a visitar, mas nada decisivo.`;
  } else {
    linha = `Sem favorito claro — o empate é o resultado mais provável segundo o histórico.`;
  }

  if(golosTotais >= 3.2) linha += ' Espera-se um jogo com muitos golos.';
  else if(golosTotais <= 2.0) linha += ' Espera-se um jogo mais fechado, com poucos golos.';

  return linha;
}

// Núcleo do modelo, partilhado entre a lista de Previsões e a deteção de value
// bets do modelo próprio — calcula-se uma vez, usa-se para as duas coisas.
async function preverJogo(ev){
  const codigo = codigoFootballData(ev.sport_key, ev.sport_title);
  if(!codigo) return null;

  const historico = await carregarHistoricoLiga(codigo);
  if(!historico) return null;

  const kCasa = chaveEquipa(ev.home_team);
  const kFora = chaveEquipa(ev.away_team);
  const fCasa = historico.forcas[kCasa];
  const fFora = historico.forcas[kFora];
  if(!fCasa || !fFora) return null; // equipa não reconhecida nos dados históricos (nome não bateu certo)

  const expGolosCasa = historico.mediaGolosCasa * fCasa.ataqueCasa * fFora.defesaFora;
  const expGolosFora = historico.mediaGolosFora * fFora.ataqueFora * fCasa.defesaCasa;
  const { pCasa, pEmpate, pFora } = probabilidadesResultado(expGolosCasa, expGolosFora);
  return { pCasa, pEmpate, pFora, expGolosCasa, expGolosFora };
}

async function calcularPrevisoes(events){
  const previsoes = [];

  for(const ev of events){
    const p = await preverJogo(ev);
    if(!p) continue;
    const { pCasa, pEmpate, pFora, expGolosCasa, expGolosFora } = p;
    const favoritoPct = Math.max(pCasa, pEmpate, pFora) * 100;

    previsoes.push({
      evento: `${ev.home_team} vs ${ev.away_team}`,
      desporto: ev.sport_title,
      inicio: ev.commence_time,
      vitoriaCasa: round2(pCasa * 100),
      empate: round2(pEmpate * 100),
      vitoriaFora: round2(pFora * 100),
      golosEsperadosCasa: round2(expGolosCasa),
      golosEsperadosFora: round2(expGolosFora),
      favoritoPct: round2(favoritoPct),
      comentario: comentarioEspecialista(ev.home_team, ev.away_team, pCasa, pEmpate, pFora, expGolosCasa, expGolosFora),
    });
  }

  // Jogos com favoritismo mais claro primeiro — são os que têm "mais valor" para
  // ler rapidamente; jogos muito equilibrados (perto de 33/33/33) ficam no fim.
  previsoes.sort((a, b) => b.favoritoPct - a.favoritoPct);
  return previsoes;
}

// Value bets do modelo próprio: compara a odd de cada casa contra a NOSSA
// probabilidade (não contra o consenso de outras casas). Consegue encontrar
// valor mesmo quando todas as casas concordam entre si — coisa que o método
// de consenso (analyzeEvents) nunca consegue ver, porque esse precisa de
// discrepância entre casas para funcionar.
async function calcularValorModelo(events, casasFiltro, minEdgeModelo, maxEdgeModelo, agora){
  const valueBetsModelo = [];
  const passaFiltro = (titulo) =>
    casasFiltro.length === 0 || casasFiltro.some(f => titulo.toLowerCase().includes(f));

  for(const ev of events){
    const p = await preverJogo(ev);
    if(!p) continue;

    const books = (ev.bookmakers || [])
      .map(bk => ({ title: bk.title, market: (bk.markets || []).find(m => m.key === 'h2h') }))
      .filter(bk => bk.market && bk.market.outcomes && bk.market.outcomes.length >= 2);
    if(books.length === 0) continue;

    const probPorResultado = {
      [ev.home_team]: p.pCasa,
      [ev.away_team]: p.pFora,
      Draw: p.pEmpate,
    };

    for(const bk of books){
      if(!passaFiltro(bk.title)) continue;

      for(const outcome of bk.market.outcomes){
        const modelP = probPorResultado[outcome.name];
        if(!modelP || modelP <= 0) continue;

        const edgePct = (outcome.price * modelP - 1) * 100;
        if(edgePct >= minEdgeModelo && edgePct <= maxEdgeModelo){
          const confianca = calcularConfianca(edgePct, books.length, ev.commence_time, agora);
          valueBetsModelo.push({
            evento: `${ev.home_team} vs ${ev.away_team}`,
            desporto: ev.sport_title,
            inicio: ev.commence_time,
            resultado: outcome.name,
            casa: bk.title,
            odd: outcome.price,
            oddModelo: round2(1 / modelP),
            edgePct: round2(edgePct),
            confianca: confianca.score,
            confiancaLabel: confianca.label,
          });
        }
      }
    }
  }

  valueBetsModelo.sort((a, b) => b.confianca - a.confianca || b.edgePct - a.edgePct);
  return valueBetsModelo;
}
