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
  if (inlineBtn) {
    // 2D array = full keyboard; 1D array = single row; single object = single button
    const is2D = Array.isArray(inlineBtn) && Array.isArray(inlineBtn[0]);
    body.reply_markup = { inline_keyboard: is2D ? inlineBtn : [Array.isArray(inlineBtn) ? inlineBtn : [inlineBtn]] };
  }
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

function nowLisbon() {
  const d = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Lisbon' }));
  d.setHours(0, 0, 0, 0);
  return d;
}

function maisAntigaData(r) {
  const ds = (r.sessoes || []).filter(x => x.dataVendas).map(x => new Date(x.dataVendas));
  return ds.length ? new Date(Math.min(...ds)) : null;
}
function maisRecenteData(r) {
  const ds = (r.sessoes || []).filter(x => x.dataVendas).map(x => new Date(x.dataVendas));
  return ds.length ? new Date(Math.max(...ds)) : null;
}

// Exact replica of site's calcEstado
function calcEstado(r, storeCfg) {
  const today = nowLisbon();
  if (!r.sessoes || !r.sessoes.length) return { s: 'prog' };
  if (r.sessoes.some(s => !s.sessao || (parseFloat(s.valor) || 0) <= 0)) return { s: 'err' };
  const mr = maisRecenteData(r);
  const ma = maisAntigaData(r);
  if (!mr) return { s: 'prog' };
  const mesIni = storeCfg?.mes_inicio || '';
  if (mesIni && mr.toISOString().slice(0, 7) < mesIni) return { s: 'ok' };
  if (mr >= today) return { s: 'prog' };
  const tv = (r.sessoes || []).reduce((s, x) => s + (parseFloat(x.valor) || 0), 0);
  if (tv === 0) return { s: 'ok' };
  const diasDesde = Math.floor((today - ma) / 86400000);
  const span = Math.floor((mr - ma) / 86400000);
  let prazo = r.tipo === 'Depósito Direto' ? 2 : 7;
  let vencidoPorDiaRecolha = false;
  if (r.tipo !== 'Depósito Direto' && storeCfg) {
    const dStr = ({ Prosegur: storeCfg.prosegur_day, Lomis: storeCfg.lomis_day, 'Câmbio': storeCfg.cambio_dia })[r.tipo];
    if (dStr !== undefined && dStr !== '' && dStr !== null) {
      const dow = parseInt(dStr);
      if (!isNaN(dow)) {
        const mrDow = mr.getDay();
        let dist = (dow - mrDow + 7) % 7;
        if (dist === 0) dist = 7;
        const dRecolha = new Date(mr);
        dRecolha.setDate(mr.getDate() + dist);
        dRecolha.setHours(0, 0, 0, 0);
        vencidoPorDiaRecolha = dRecolha <= today;
        prazo = dist;
      }
    }
  }
  const vencido = diasDesde >= prazo || span > prazo || vencidoPorDiaRecolha;
  if (!r.foto) {
    if (r.talao || r.data_deposito) return vencido ? { s: 'err' } : { s: 'warn' };
    return vencido ? { s: 'err' } : { s: 'warn' };
  }
  if (!r.talao || !r.data_deposito) return vencido ? { s: 'err' } : { s: 'warn' };
  const dd = new Date(r.data_deposito);
  const diasParaDep = Math.floor((dd - mr) / 86400000);
  if (diasParaDep > prazo || span > prazo) return { s: 'warn' };
  return { s: 'ok' };
}

// Exact replica of site's getMissingDays (per loja)
function getMissingDays(allRegs, mes, lojaFil, mesIni) {
  if (mesIni && mes < mesIni) return [];
  const [year, month] = mes.split('-').map(Number);
  const today = nowLisbon();
  const lastDay = mes === curMes() ? today.getDate() : new Date(year, month, 0).getDate();
  const covered = new Set();
  for (const r of allRegs) {
    if (lojaFil && r.loja !== lojaFil) continue;
    for (const s of (r.sessoes || [])) {
      if (s.dataVendas && s.dataVendas.startsWith(mes)) covered.add(s.dataVendas);
    }
  }
  const missing = [];
  for (let d = 1; d <= lastDay; d++) {
    const ds = `${year}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const dt = new Date(ds); dt.setHours(0, 0, 0, 0);
    if (dt <= today && !covered.has(ds)) missing.push(ds);
  }
  return missing;
}

// For weekly services: cutoff = last pickup date (exclusive) — days on/after cutoff are accumulating
function displayCutoff(storeCfg) {
  const now = nowLisbon();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yestStr = yesterday.toISOString().split('T')[0];
  const days = [parseInt(storeCfg?.prosegur_day), parseInt(storeCfg?.lomis_day)].filter(d => !isNaN(d));
  if (!days.length) return yestStr; // daily service: up to yesterday
  const pickups = days.map(dow => {
    let back = (now.getDay() - dow + 7) % 7;
    if (back === 0) back = 7;
    const d = new Date(now); d.setDate(d.getDate() - back);
    return d.toISOString().split('T')[0];
  });
  return pickups.sort().pop(); // most recent pickup = cutoff (days before it are overdue)
}

// Exact replica of site's storeComplianceMes
function storeComplianceMes(allRegs, sid, mes, storeCfg) {
  const mr = allRegs.filter(r => r.store_id === sid && getRefDate(r).startsWith(mes));
  const lojas = storeCfg?.lojas?.length ? storeCfg.lojas : [...new Set(mr.map(r => r.loja).filter(Boolean))];
  const mesIni = storeCfg?.mes_inicio || '';
  const allMissing = [...new Set(lojas.flatMap(l => getMissingDays(allRegs, mes, l, mesIni)))];
  const today = nowLisbon();
  const todayS = today.toISOString().split('T')[0];
  const pastMissing = allMissing.filter(d => d < todayS).length;
  const dueRecs = mr.filter(r => calcEstado(r, storeCfg).s !== 'prog');
  if (!dueRecs.length && !pastMissing) return { pct: null, allMissing, semDep: 0 };
  const withDep = dueRecs.filter(r => r.data_deposito);
  const depFeito = withDep.filter(r => calcEstado(r, storeCfg).s !== 'err').length;
  const depIncompl = withDep.filter(r => calcEstado(r, storeCfg).s === 'err').length;
  const semDep = dueRecs.filter(r => !r.data_deposito).length;
  const hasWeekly = (storeCfg?.prosegur_day || '') !== '' || (storeCfg?.lomis_day || '') !== '';
  const prazo = hasWeekly ? 7 : 2;
  const num = depFeito * 100 + depIncompl * 60;
  const den = depFeito + depIncompl + semDep * 3 + (pastMissing / prazo);
  const pct = den > 0 ? Math.round(num / den) : null;
  return { pct, allMissing, semDep };
}

async function fetchRegsAndCfgs(since) {
  return Promise.all([
    sbGet('dep_registos', `select=store_id,loja,tipo,foto,data_deposito,sessoes,talao,criado_em&criado_em=gte.${since}T00:00:00Z`),
    sbGet('dep_config', `select=store_id,emp,prosegur_day,lomis_day,cambio_dia,lojas,mes_inicio`)
  ]);
}

async function buildRankingText() {
  const mes = curMes();
  const [regs, cfgs] = await fetchRegsAndCfgs(since3months());
  if (!Array.isArray(regs)) return `❌ Erro Supabase registos: ${JSON.stringify(regs).slice(0,120)}`;
  if (!Array.isArray(cfgs)) return `❌ Erro Supabase config: ${JSON.stringify(cfgs).slice(0,120)}`;

  const sids = [...new Set(regs.filter(r => r.store_id && r.store_id !== 'super').map(r => r.store_id))];
  if (!sids.length) return `📊 Sem registos para ${mesLabel(mes)}`;

  const ranked = sids.map(sid => {
    const cfg = cfgs.find(c => c.store_id === sid);
    const { pct, allMissing, semDep } = storeComplianceMes(regs, sid, mes, cfg);
    const cutoff = displayCutoff(cfg);
    const missingPast = allMissing.filter(d => d < cutoff);
    const srMes = regs.filter(r => r.store_id === sid && getRefDate(r).startsWith(mes));
    const noTalao = srMes.filter(r => r.data_deposito && !r.talao).length;
    const overdue = regs.filter(r => r.store_id === sid && !r.data_deposito && getRefDate(r) < mes + '-01').length;
    return { name: shortName(cfg?.emp || sid, sid), pct: pct ?? 0, semDep, missingDates: missingPast, noTalao, overdue };
  }).sort((a, b) => b.pct - a.pct);

  const medals = ['🥇','🥈','🥉'];
  const lines = [];
  for (let i = 0; i < ranked.length; i++) {
    const s = ranked[i];
    const flags = [
      s.semDep ? `⏳${s.semDep}` : '',
      s.overdue ? `🔴${s.overdue}` : '',
      s.noTalao ? `📄${s.noTalao}` : ''
    ].filter(Boolean).join(' ');
    lines.push(`${i < 3 ? medals[i] : (i + 1) + ' '} ${s.name} — ${s.pct}%${flags ? '  ' + flags : ''}`);
    if (s.missingDates.length) lines.push(`   ❌ ${s.missingDates.map(fd).join(' · ')}`);
  }
  const ok = ranked.filter(s => s.pct >= 80 && !s.overdue && !s.missingDates.length).length;
  const bad = ranked.filter(s => s.pct < 60 || s.overdue > 0 || s.missingDates.length > 0).length;
  return `📊 *RANKING DEPÓSITOS — ${mesLabel(mes).toUpperCase()}*\n\n${lines.join('\n')}\n\n✅ ${ok} lojas OK  🔴 ${bad} com problemas\nActualizado às ${hhmm()}`;
}

async function buildStatusText(query) {
  const mes = curMes();
  const [regs, cfgs] = await fetchRegsAndCfgs(since3months());
  if (!Array.isArray(regs)) return `❌ Erro registos: ${JSON.stringify(regs).slice(0,200)}`;
  if (!Array.isArray(cfgs)) return `❌ Erro config: ${JSON.stringify(cfgs).slice(0,200)}`;
  const norm = s => s.toLowerCase().replace(/[-_ ]/g, '');
  const cfg = cfgs.find(c =>
    c.store_id !== 'super' && (
      (c.emp || '').toLowerCase().includes(query) ||
      (c.store_id || '').toLowerCase().includes(query) ||
      norm(c.store_id || '').includes(norm(query)) ||
      norm(c.emp || '').includes(norm(query))
    )
  );
  if (!cfg) return null;
  const sid = cfg.store_id;
  const empName = shortName(cfg.emp || sid, sid);
  const { pct, allMissing, semDep } = storeComplianceMes(regs, sid, mes, cfg);
  const cutoff = displayCutoff(cfg);
  const missingPast = allMissing.filter(d => d < cutoff);
  const srMes = regs.filter(r => r.store_id === sid && getRefDate(r).startsWith(mes));
  const overdueRegs = regs.filter(r => r.store_id === sid && !r.data_deposito && getRefDate(r) < mes + '-01');
  if (pct === null && !overdueRegs.length) return `🏪 *${empName}*\n\nSem dados para ${mesLabel(mes)}.`;

  const lines = [];
  const tipos = [...new Set(srMes.map(r => r.tipo).filter(Boolean))];
  for (const tipo of tipos) {
    const tr = srMes.filter(r => r.tipo === tipo);
    const pendR = tr.filter(r => !r.data_deposito).length;
    const lastDep = tr.filter(r => r.data_deposito).sort((a, b) => a.data_deposito < b.data_deposito ? 1 : -1)[0]?.data_deposito;
    const icon = pendR > 0 ? '⏳' : '✅';
    lines.push(`${icon} *${tipo}*${pendR ? ` — ${pendR} por depositar` : ' — em dia'}${lastDep ? ` · último ${fd(lastDep)}` : ''}`);
  }
  if (missingPast.length) {
    const show = missingPast.slice(-5).map(fd).join(' · ');
    lines.push(`❌ *${missingPast.length} dias sem registo*${missingPast.length <= 5 ? ': ' + show : ' (últimos: ' + show + ')'}`);
  }
  const missTalao = srMes.filter(r => r.data_deposito && !r.talao).length;
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

    // Handle inline button presses
    const cbq = body.callback_query;
    if (cbq) {
      const data = cbq.data || '';
      const cbqChatId = cbq.message?.chat?.id;
      if (data.startsWith('status:')) {
        await tgAnswerCbq(cbq.id, '🔍 A carregar...');
        const query = data.slice(7);
        const txt = await buildStatusText(query);
        if (txt && cbqChatId) {
          const btns = [
            { text: '📤 Partilhar no grupo', callback_data: `share:status:${query}` },
            { text: '💬 Partilhar no WhatsApp', url: `https://wa.me/?text=${encodeURIComponent(txt)}` }
          ];
          await tgSend(cbqChatId, txt, btns);
        }
      } else {
        await tgAnswerCbq(cbq.id, '📤 A enviar para o grupo...');
        if (data === 'share:ranking') {
          const txt = await buildRankingText();
          if (txt) {
            const waBtn = { text: '💬 Partilhar no WhatsApp', url: `https://wa.me/?text=${encodeURIComponent(txt)}` };
            await tgSend(TG_GROUP, txt, waBtn);
          }
        } else if (data.startsWith('share:status:')) {
          const query = data.slice(13);
          const txt = await buildStatusText(query);
          if (txt) {
            const waBtn = { text: '💬 Partilhar no WhatsApp', url: `https://wa.me/?text=${encodeURIComponent(txt)}` };
            await tgSend(TG_GROUP, txt, waBtn);
          }
        }
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
      const btns = isPrivate ? [
        { text: '📤 Partilhar no grupo', callback_data: 'share:ranking' },
        { text: '💬 Partilhar no WhatsApp', url: `https://wa.me/?text=${encodeURIComponent(txt)}` }
      ] : null;
      await tgSend(chatId, txt, btns);

    } else if (text.startsWith('/status')) {
      const query = text.slice(7).trim().toLowerCase();
      if (!query) {
        const cfgs = await sbGet('dep_config', `select=store_id,emp&store_id=neq.super`);
        const seen = new Set();
        const unique = cfgs.filter(c => { if (seen.has(c.store_id)) return false; seen.add(c.store_id); return true; });
        const lojaLabel = c => {
          const sn = shortName(c.emp || c.store_id, c.store_id);
          const parts = c.store_id.split('-');
          const loc = parts.length > 1 ? parts[parts.length - 1] : '';
          const locCap = loc ? loc.charAt(0).toUpperCase() + loc.slice(1) : '';
          return locCap && !sn.toLowerCase().includes(loc.toLowerCase()) ? `${sn} ${locCap}` : sn;
        };
        const rows = unique.map(c => [{ text: lojaLabel(c), callback_data: `status:${c.store_id}` }]);
        await tgSend(chatId, '🏪 *Escolhe uma loja:*', rows);
      } else {
        const txt = await buildStatusText(query);
        if (!txt) { await tgSend(chatId, `❓ Loja não encontrada: *${query}*\n\nUsa /status para ver todas as lojas.`); return new Response('ok'); }
        const btns = isPrivate ? [
          { text: '📤 Partilhar no grupo', callback_data: `share:status:${query}` },
          { text: '💬 Partilhar no WhatsApp', url: `https://wa.me/?text=${encodeURIComponent(txt)}` }
        ] : null;
        await tgSend(chatId, txt, btns);
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
