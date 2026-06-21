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

function since3months() {
  const d = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Lisbon' }));
  d.setMonth(d.getMonth() - 3);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

// Weekly services (Prosegur/Lomis): deposits happen once a week, not daily
const isWeekly = (tipo) => /prosegur|lomis/i.test(tipo || '');

// For weekly services: % based on records (deposited/total)
// For daily services: % based on session days (deposited days / all days incl. missing)
function calcMetrics(storeRegs, mes) {
  const [year, month] = mes.split('-').map(Number);
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Lisbon' }));
  const upToDay = mes === curMes() ? now.getDate() - 1 : new Date(year, month, 0).getDate();

  const dailyRegs = storeRegs.filter(r => !isWeekly(r.tipo));
  const weeklyRegs = storeRegs.filter(r => isWeekly(r.tipo));

  // Weekly services: simple record count
  const wDep = weeklyRegs.filter(r => r.data_deposito).length;
  const wPend = weeklyRegs.filter(r => !r.data_deposito).length;

  // Daily services: per-day coverage
  const depDays = new Set();
  const pendDays = new Set();
  for (const r of dailyRegs) {
    for (const s of (r.sessoes || [])) {
      if (s.dataVendas && s.dataVendas.startsWith(mes)) {
        if (r.data_deposito) depDays.add(s.dataVendas);
        else pendDays.add(s.dataVendas);
      }
    }
  }
  const netPend = [...pendDays].filter(d => !depDays.has(d));
  const missingDates = [];
  if (dailyRegs.length) {
    for (let d = 1; d <= upToDay; d++) {
      const ds = `${year}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      if (!depDays.has(ds) && !pendDays.has(ds)) missingDates.push(ds);
    }
  }

  // Combined pct: weekly records + daily days
  const totalOk = wDep + depDays.size;
  const totalAll = wDep + wPend + depDays.size + netPend.length + missingDates.length;
  const pct = totalAll > 0 ? Math.round(totalOk / totalAll * 100) : null;
  return { pct, wPend, pend: netPend.length, missing: missingDates.length, missingDates };
}

async function buildRankingText() {
  const mes = curMes();
  const since = since3months();
  const [regs, cfgs] = await Promise.all([
    sbGet('dep_registos', `select=store_id,tipo,data_deposito,sessoes,talao,criado_em&criado_em=gte.${since}T00:00:00Z`),
    sbGet('dep_config', `select=store_id,emp`)
  ]);
  if (!Array.isArray(regs)) return `❌ Erro Supabase registos: ${JSON.stringify(regs).slice(0,120)}`;
  if (!Array.isArray(cfgs)) return `❌ Erro Supabase config: ${JSON.stringify(cfgs).slice(0,120)}`;

  const sids = [...new Set(regs.filter(r => r.store_id && r.store_id !== 'super').map(r => r.store_id))];
  if (!sids.length) return `📊 Sem registos para ${mesLabel(mes)}`;

  const ranked = sids.map(sid => {
    const cfg = cfgs.find(c => c.store_id === sid);
    const srMes = regs.filter(r => r.store_id === sid && getRefDate(r).startsWith(mes));
    const { pct, wPend, pend, missing, missingDates } = calcMetrics(srMes, mes);
    const noTalao = srMes.filter(r => r.data_deposito && !r.talao).length;
    const overdue = regs.filter(r => r.store_id === sid && !r.data_deposito && getRefDate(r) < mes + '-01').length;
    return { name: shortName(cfg?.emp || sid, sid), pct: pct ?? 0, wPend, pend, missing, missingDates, noTalao, overdue };
  }).sort((a, b) => b.pct - a.pct);

  const medals = ['🥇','🥈','🥉'];
  const lines = [];
  for (let i = 0; i < ranked.length; i++) {
    const s = ranked[i];
    const flags = [
      s.wPend ? `⏳${s.wPend}` : '',
      s.pend ? `⏳${s.pend}d` : '',
      s.overdue ? `🔴${s.overdue}` : '',
      s.noTalao ? `📄${s.noTalao}` : ''
    ].filter(Boolean).join(' ');
    lines.push(`${i < 3 ? medals[i] : (i + 1) + ' '} ${s.name} — ${s.pct}%${flags ? '  ' + flags : ''}`);
    if (s.missingDates && s.missingDates.length) {
      lines.push(`   ❌ ${s.missingDates.map(fd).join(' · ')}`);
    }
  }
  const ok = ranked.filter(s => s.pct >= 80 && !s.overdue && !s.missing && !s.wPend).length;
  const bad = ranked.filter(s => s.pct < 60 || s.overdue > 0 || s.missing > 0 || s.wPend > 0).length;
  return `📊 *RANKING ${mesLabel(mes).toUpperCase()}*\n\n${lines.join('\n')}\n\n✅ ${ok} lojas OK  🔴 ${bad} com problemas\nActualizado às ${hhmm()}`;
}

async function buildStatusText(query) {
  const mes = curMes();
  const since = since3months();
  const [regs, cfgs] = await Promise.all([
    sbGet('dep_registos', `select=store_id,tipo,data_deposito,sessoes,talao,criado_em&criado_em=gte.${since}T00:00:00Z`),
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
  const allStore = regs.filter(r => r.store_id === sid);
  const sr = allStore.filter(r => getRefDate(r).startsWith(mes));
  const overdueRegs = allStore.filter(r => !r.data_deposito && getRefDate(r) < mes + '-01');

  const { pct, pend, missing, missingDates } = calcMetrics(sr, mes);
  if (pct === null && !overdueRegs.length) return `🏪 *${empName}*\n\nSem dados para ${mesLabel(mes)}.`;

  const lines = [];
  const tipos = [...new Set(sr.map(r => r.tipo).filter(Boolean))];
  for (const tipo of tipos) {
    const tr = sr.filter(r => r.tipo === tipo);
    const pendR = tr.filter(r => !r.data_deposito).length;
    const lastDep = tr.filter(r => r.data_deposito).sort((a, b) => a.data_deposito < b.data_deposito ? 1 : -1)[0]?.data_deposito;
    const icon = pendR > 0 ? '⏳' : '✅';
    lines.push(`${icon} *${tipo}*${pendR ? ` — ${pendR} por depositar` : ' — em dia'}${lastDep ? ` · último ${fd(lastDep)}` : ''}`);
  }
  if (missing > 0) {
    const showDates = missingDates.slice(-5).map(fd).join(' · ');
    lines.push(`❌ *${missing} dias sem registo*${missing <= 5 ? ': ' + showDates : ' (últimos: ' + showDates + ')'}`);
  }
  const missTalao = sr.filter(r => r.data_deposito && !r.talao).length;
  lines.push(``, `📄 ${missTalao} s/talão · ${pct ?? 0}%`);

  if (overdueRegs.length) {
    const byMes = {};
    for (const r of overdueRegs) { const m = getRefDate(r).slice(0,7); byMes[m] = (byMes[m]||0)+1; }
    lines.push(``, `🔴 *EM ATRASO:* ` + Object.keys(byMes).sort().map(m => `${mesLabel(m)} (${byMes[m]})`).join(', '));
  }
  return `🏪 *${empName.toUpperCase()} — ${mesLabel(mes)}*\n\n${lines.join('\n')}\nActualizado às ${hhmm()}`;
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
  if (url.searchParams.get('debug') === '1') {
    const mes = curMes();
    const since = since3months();
    const qs = `select=store_id,data_deposito,sessoes,criado_em&criado_em=gte.${since}T00:00:00Z`;
    const rows = await sbGet('dep_registos', qs);
    if (!Array.isArray(rows)) return new Response(JSON.stringify(rows), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
    const byStore = {};
    for (const r of rows) {
      if (!r.store_id || r.store_id === 'super') continue;
      const ref = getRefDate(r);
      const isCur = ref.startsWith(mes);
      const isPending = !r.data_deposito;
      if (!byStore[r.store_id]) byStore[r.store_id] = { cur: 0, curPending: 0, overdue: 0 };
      if (isCur) { byStore[r.store_id].cur++; if (isPending) byStore[r.store_id].curPending++; }
      else if (isPending) byStore[r.store_id].overdue++;
    }
    return new Response(JSON.stringify({ mes, totalRows: rows.length, byStore }, null, 2), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
  }
  return new Response(JSON.stringify({ ok: true, status: 'Depositos TG bot active', v: 4 }), {
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
