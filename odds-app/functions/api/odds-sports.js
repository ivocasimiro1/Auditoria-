// Cloudflare Pages Function — GET /api/odds-sports
// Lista os desportos/ligas disponíveis na The Odds API (para preencher o dropdown do dashboard).

export async function onRequestGet(context) {
  const { env } = context;

  if (!env.ODDS_API_KEY) {
    return json({ error: 'ODDS_API_KEY não configurada nas variáveis de ambiente do Cloudflare Pages.' }, 500);
  }

  let resp;
  try {
    resp = await fetch(`https://api.the-odds-api.com/v4/sports/?apiKey=${env.ODDS_API_KEY}`);
  } catch (err) {
    return json({ error: 'Falha ao contactar The Odds API: ' + err.message }, 502);
  }

  if (!resp.ok) {
    const body = await resp.text();
    return json({ error: `The Odds API respondeu ${resp.status}`, details: body }, resp.status);
  }

  const sports = await resp.json();
  return json({ sports: sports.filter(s => s.active) });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
