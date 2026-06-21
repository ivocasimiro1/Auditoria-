const SB_URL = 'https://ubeqidccuvsjhjphybxz.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InViZXFpZGNjdXZzamhqcGh5Ynh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzNDI0NTYsImV4cCI6MjA5NTkxODQ1Nn0.wyCBBMSuRfxrz935XifGa3Chgv64o4-ACvP5rCj7t1U';
const TG_TOKEN = '8640253196:AAEP0aWxhijWwLnjOefiKbATvNkcLF1JH2Y';
const TG_GROUP = '-5587765450'; // grupo principal Despomar

async function sbGet(table, qs) {
  const r = await fetch(`${SB_URL}/rest/v1/${table}?${qs}`, {
    headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, Accept: 'application/json' }
  });
  return r.json();
}

async function tgSend(chatId, text, inlineBtn) {
  const body = { chat_id: chatId, text, parse_mode: 'Markdown' };
  if (inlineBtn) body.reply_markup = { inline_keyboard: [[inlineBtn]] };
  await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

async function tgAnswerCbq(id, text) {
  await fetch(`https://api.telegram.org/bot${TG_TOKEN}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: id, text })
  });
}

function shortName(str, sidHint) {
  if (!str) return str;
  const words = str.split(/\s+/).filter(w => w && w !== '&');
  if (words.length <= 2) return str;
  const busW = new Set(['surf','skate','shop','store','loja','sports','boards','escola','escolas']);
  const skipI = new Set(['de','da','do','das','dos','e','a','o','os','as']);
  const lastW = words[words.length - 1];
  let locW, brandW;
  if (!busW.has(lastW.toLowerCase())) { locW = lastW; brandW = words.slice(0, -1); }
  else { const h = (sidHint || '').split('-').pop(); locW = h && h.length > 2 ? h.charAt(0).toUpperCase() + h.slice(1) : ''; brandW = words; }
  const hasCode = /^\d/.test(brandW[0]);
  const init = hasCode
    ? brandW.filter(w => /^\d/.test(w) || !busW.has(w.toLowerCase())).map(w => /^\d/.test(w) ? w : w[0].toUpperCase()).filter(t => !skipI.has(t.toLowerCase())).join('')
    : brandW.filter(w => !skipI.has(w.toLowerCase())).map(w => w[0].toUpperCase()).join('');
  return locW ? `${init} ${locW}` : init || str;
}

function curMes() {
  const d = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Lisbon' }));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function mesLabel(ym) {
  const [y, m] = ym.split('-').map(Number);
  return ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'][m-1] + ' ' + y;
}

function fd(d) {
  if (!d) return '—';
  const [, m, day] = d.split('-');
  return `${day}/${m}`;
}

function getRefDate(r) {
  const sess = (r.sessoes || []).map(s => s.dataVendas).filter(Boolean).sort();
  return sess[0] || (r.criado_em || '').split('T')[0];
}

function hhmm() {
  return new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Lisbon' });
}

async function buildRankingText() {
  const mes = curMes();
  const since = mes + '-01';
  const [regs, cfgs] = await Promise.all([
    sbGet('dep_registos', `select=store_id,datadeposito,sessoes,talao,criado_em&criado_em=gte.${since}T00:00:00Z`),
    sbGet('dep_config', `select=store_id,emp`)
  ]);
  if (!Array.isArray(regs)) return `❌ Erro Supabase registos: ${JSON.stringify(regs).slice(0,120)}`;
  if (!Array.isArray(cfgs)) return `❌ Erro Supabase config: ${JSON.stringify(cfgs).slice(0,120)}`;
  const byStore = {};
  for (const r of regs) {
    if (!r.store_id || r.store_id === 'super') continue;
    if (!getRefDate(r).startsWith(mes)) continue;
    if (!byStore[r.store_id]) byStore[r.store_id] = { ok: 0, total: 0, noTalao: 0 };
    byStore[r.store_id].total++;
    if (r.datadeposito) { byStore[r.store_id].ok++; if (!r.talao) byStore[r.store_id].noTalao++; }
  }
  const storeIds = Object.keys(byStore);
  if (!storeIds.length) return `📊 Sem registos para ${mesLabel(mes)}\n(${regs.length} registos encontrados no total)`;
  const ranked = storeIds.map(sid => {
    const d = byStore[sid];
    const cfg = cfgs.find(c => c.store_id === sid);
    const pct = d.total > 0 ? Math.round(d.ok / d.total * 100) : 0;
    return { name: shortName(cfg?.emp || sid, sid), pct, noTalao: d.noTalao };
  }).sort((a, b) => b.pct - a.pct);
  const medals = ['🥇','🥈','🥉'];
  const lines = ranked.map((s, i) =>
    `${i < 3 ? medals[i] : (i + 1) + ' '} ${s.name} — ${s.pct}%${s.noTalao ? ` · 📄${s.noTalao}` : ''}`
  );
  const ok = ranked.filter(s => s.pct >= 80).length;
  const bad = ranked.filter(s => s.pct < 60).length;
  return `📊 *RANKING ${mesLabel(mes).toUpperCase()}*\n\n${lines.join('\n')}\n\n✅ ${ok} lojas OK  🔴 ${bad} com problemas\nActualizado às ${hhmm()}`;
}

async function buildStatusText(query) {
  const mes = curMes();
  const since = mes + '-01';
  const [regs, cfgs] = await Promise.all([
    sbGet('dep_registos', `select=store_id,tipo,datadeposito,sessoes,talao,criado_em&criado_em=gte.${since}T00:00:00Z`),
    sbGet('dep_config', `select=store_id,emp`)
  ]);
  if (!Array.isArray(regs)) return `❌ Erro registos: ${JSON.stringify(regs).slice(0,200)}`;
  if (!Array.isArray(cfgs)) return `❌ Erro config: ${JSON.stringify(cfgs).slice(0,200)}`;
  const cfg = cfgs.find(c =>
    c.store_id !== 'super' && (
      (c.emp || '').toLowerCase().includes(query) ||
      (c.store_id || '').toLowerCase().includes(query)
    )
  );
  if (!cfg) return null;
  const sid = cfg.store_id;
  const empName = shortName(cfg.emp || sid, sid);
  const sr = regs.filter(r => r.store_id === sid && getRefDate(r).startsWith(mes));
  if (!sr.length) return `🏪 *${empName}*\n\nSem dados para ${mesLabel(mes)}.`;
  const tipos = [...new Set(sr.map(r => r.tipo).filter(Boolean))];
  const pct = Math.round(sr.filter(r => r.datadeposito).length / sr.length * 100);
  const missTalao = sr.filter(r => r.datadeposito && !r.talao).length;
  const days = [...new Set(sr.flatMap(r => (r.sessoes || []).map(s => s.dataVendas).filter(Boolean)))].length;
  const tipoLines = tipos.map(tipo => {
    const tr = sr.filter(r => r.tipo === tipo);
    const pending = tr.filter(r => !r.datadeposito).length;
    const lastDep = tr.filter(r => r.datadeposito).sort((a, b) => a.datadeposito < b.datadeposito ? 1 : -1)[0]?.datadeposito;
    const icon = pending > 0 ? '⚠️' : '✅';
    return `${icon} *${tipo}*${pending ? ` — ${pending} por depositar` : ' — em dia'}${lastDep ? ` · último ${fd(lastDep)}` : ''}`;
  });
  return `🏪 *${empName.toUpperCase()} — ${mesLabel(mes)}*\n\n${tipoLines.join('\n')}\n\n📄 ${missTalao} sem talão · 📅 ${days} dias · ${pct}%\nActualizado às ${hhmm()}`;
}

// GET: setup webhook or health check
export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  if (url.searchParams.get('setup') === '1') {
    const webhookUrl = `${url.origin}/api/tg-webhook`;
    const r = await fetch(`https://api.telegram.org/bot${TG_TOKEN}/setWebhook?url=${encodeURIComponent(webhookUrl)}`);
    const data = await r.json();
    return new Response(JSON.stringify(data, null, 2), { headers: { 'Content-Type': 'application/json' } });
  }
  return new Response(JSON.stringify({ ok: true, status: 'Depositos TG bot active' }), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' }
  });
}

// POST: receive Telegram webhook updates
export async function onRequestPost(context) {
  try {
    const body = await context.request.json();

    // Handle inline button presses (share to group)
    const cbq = body.callback_query;
    if (cbq) {
      const data = cbq.data || '';
      await tgAnswerCbq(cbq.id, '📤 A enviar para o grupo...');
      if (data === 'share:ranking') {
        const txt = await buildRankingText();
        if (txt) await tgSend(TG_GROUP, txt);
      } else if (data.startsWith('share:status:')) {
        const query = data.slice(13);
        const txt = await buildStatusText(query);
        if (txt) await tgSend(TG_GROUP, txt);
      }
      return new Response('ok');
    }

    const msg = body.message;
    if (!msg?.text) return new Response('ok');

    const chatId = msg.chat.id;
    const isPrivate = msg.chat.type === 'private';
    const text = msg.text.trim().replace(/@\w+$/, '');

    if (text === '/help') {
      await tgSend(chatId, '📋 *Comandos disponíveis*\n\n/ranking — ranking do mês actual\n/status — lista todas as lojas\n/status [nome] — estado detalhado\n\nExemplos:\n`/status ericeira`\n`/status guia`\n`/status billabong`');

    } else if (text === '/ranking') {
      const txt = await buildRankingText();
      if (!txt) { await tgSend(chatId, `📊 Sem dados para ${mesLabel(curMes())}`); return new Response('ok'); }
      // In private chat: add "share to group" button
      const btn = isPrivate ? { text: '📤 Partilhar no grupo', callback_data: 'share:ranking' } : null;
      await tgSend(chatId, txt, btn);

    } else if (text.startsWith('/status')) {
      const query = text.slice(7).trim().toLowerCase();
      if (!query) {
        const cfgs = await sbGet('dep_config', `select=store_id,emp&store_id=neq.super`);
        const lojas = cfgs.map(c => {
          const sn = shortName(c.emp || c.store_id, c.store_id);
          return `• /status ${sn.toLowerCase().replace(/ /g, '_')} — ${sn}`;
        });
        await tgSend(chatId, `🏪 *Lojas disponíveis:*\n\n${lojas.join('\n')}\n\nOu usa parte do nome, ex: \`/status guia\``);
      } else {
        const txt = await buildStatusText(query);
        if (!txt) { await tgSend(chatId, `❓ Loja não encontrada: *${query}*\n\nUsa /status para ver todas as lojas.`); return new Response('ok'); }
        const btn = isPrivate ? { text: '📤 Partilhar no grupo', callback_data: `share:status:${query}` } : null;
        await tgSend(chatId, txt, btn);
      }
    }
  } catch (e) {
    console.error('tg-webhook error:', e);
    try {
      const msg2 = body?.message;
      if (msg2?.chat?.id) await tgSend(msg2.chat.id, `❌ Erro interno: ${String(e).slice(0,200)}`);
    } catch (_) {}
  }
  return new Response('ok');
}
