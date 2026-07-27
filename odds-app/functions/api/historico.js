// Cloudflare Pages Function — GET /api/historico
//
// Resumo do histórico de acertos: quantas oportunidades foram detetadas por
// tipo, quantas já têm resultado confirmado, e a taxa de acerto real —
// alimentado pelos registos que odds-scan.js grava e verificar-resultados.js
// confirma. Precisa de ODDS_KV configurado; sem isso devolve disponivel:false.

export async function onRequestGet(context) {
  const { env } = context;

  if (!env.ODDS_KV) {
    return json({ disponivel: false });
  }

  const porTipo = {
    arbitragem: { total: 0, resolvidos: 0, acertos: 0 },
    value: { total: 0, resolvidos: 0, acertos: 0 },
    valorModelo: { total: 0, resolvidos: 0, acertos: 0 },
  };
  const recentes = [];

  let cursor;
  do {
    const lista = await env.ODDS_KV.list({ prefix: 'pred:', cursor });
    cursor = lista.cursor;
    for (const chaveInfo of lista.keys) {
      const registo = await env.ODDS_KV.get(chaveInfo.name, 'json');
      if (!registo || !porTipo[registo.tipo]) continue;

      porTipo[registo.tipo].total++;
      if (registo.resolvido) {
        porTipo[registo.tipo].resolvidos++;
        if (registo.acertou) porTipo[registo.tipo].acertos++;
        recentes.push(registo);
      }
    }
  } while (cursor);

  recentes.sort((a, b) => new Date(b.verificadoEm) - new Date(a.verificadoEm));

  return json({
    disponivel: true,
    porTipo,
    recentes: recentes.slice(0, 20),
  });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
