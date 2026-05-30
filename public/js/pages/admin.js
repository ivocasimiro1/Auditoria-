import { apiFetch, getUser, showToast } from '../app.js';

let refreshTimer = null;

export async function render() {
  const user = getUser();
  if (!user?.is_admin) {
    document.getElementById('main-content').innerHTML =
      '<div class="empty-state"><div class="empty-icon">🚫</div><h3>Sem permissão</h3></div>';
    return;
  }

  clearInterval(refreshTimer);

  const main = document.getElementById('main-content');
  main.innerHTML = `
    <div class="page">
      <div class="page-header" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;">
        <div>
          <h2>🛡️ Painel de Administração</h2>
          <p id="admin-subtitle">A carregar...</p>
        </div>
        <button class="btn btn-ghost btn-sm" id="refresh-btn">🔄 Actualizar</button>
      </div>

      <div class="tabs" style="margin-bottom:20px;">
        <button class="tab-btn active" data-tab="activity">📊 Atividade</button>
        <button class="tab-btn" data-tab="reports">🚩 Reports</button>
        <button class="tab-btn" data-tab="users">👥 Utilizadores</button>
      </div>

      <div id="tab-activity"></div>
      <div id="tab-reports"  style="display:none;"></div>
      <div id="tab-users"    style="display:none;"></div>
    </div>
  `;

  document.querySelectorAll('.tab-btn[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn[data-tab]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      ['activity','reports','users'].forEach(t =>
        document.getElementById(`tab-${t}`).style.display = t === btn.dataset.tab ? 'block' : 'none'
      );
    });
  });

  document.getElementById('refresh-btn').addEventListener('click', () => loadAll());

  await loadAll();
  refreshTimer = setInterval(loadAll, 30_000);
}

async function loadAll() {
  const [activity, users, reports, stats] = await Promise.all([
    apiFetch('/admin/activity'),
    apiFetch('/admin/users'),
    apiFetch('/admin/reports'),
    apiFetch('/stats'),
  ]);

  document.getElementById('admin-subtitle').textContent =
    `${stats?.users || 0} utilizadores · ${stats?.trades_completed || 0} trocas · ${activity?.online?.length || 0} online agora`;

  renderActivity(activity);
  renderReports(reports);
  renderUsers(users, stats);
}

// ── ACTIVITY TAB ─────────────────────────────────────────────────────────────
function renderActivity(data) {
  const el = document.getElementById('tab-activity');
  if (!data) { el.innerHTML = '<div class="empty-state"><p>Erro ao carregar</p></div>'; return; }

  const { online, feed, topUsers } = data;

  const onlineHtml = online.length ? online.map(u => {
    const mins = Math.round((Date.now() - Number(u.last_seen)) / 60000);
    const col = mins < 2 ? '#22c55e' : mins < 5 ? '#84cc16' : '#eab308';
    return `
      <div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
        <div style="width:9px;height:9px;border-radius:50%;background:${col};flex-shrink:0;box-shadow:0 0 6px ${col};"></div>
        <span style="font-weight:700;font-size:13px;">${u.username}</span>
        <span style="font-size:11px;color:var(--text-muted);">${u.location || ''}</span>
        <span style="font-size:11px;color:var(--text-muted);margin-left:auto;">${mins < 1 ? 'agora' : `${mins}m atrás`}</span>
      </div>`;
  }).join('') : '<div style="color:var(--text-muted);font-size:13px;padding:8px 0;">Nenhum utilizador ativo nos últimos 10 min</div>';

  const feedIcons = { nova_conta:'🆕', proposta_troca:'📤', troca_concluida:'🎉', mensagem:'💬', report_cromo:'🚩' };
  const feedText  = {
    nova_conta:       f => `<strong>${f.actor}</strong> registou-se`,
    proposta_troca:   f => `<strong>${f.actor}</strong> propôs troca a <strong>${f.other}</strong>`,
    troca_concluida:  f => `<strong>${f.actor}</strong> e <strong>${f.other}</strong> concluíram uma troca 🎉`,
    mensagem:         f => `<strong>${f.actor}</strong> enviou mensagem`,
    report_cromo:     f => `<strong>${f.actor}</strong> reportou nome → <em>"${f.other}"</em>`,
  };

  const feedHtml = feed.length ? feed.map(f => {
    const mins = Math.round((Date.now() - Number(f.ts)) / 60000);
    const t = mins < 1 ? 'agora' : mins < 60 ? `${mins}m` : mins < 1440 ? `${Math.round(mins/60)}h` : `${Math.round(mins/1440)}d`;
    const txt = feedText[f.type] ? feedText[f.type](f) : f.type;
    return `
      <div style="display:flex;align-items:flex-start;gap:10px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.04);">
        <span style="font-size:15px;flex-shrink:0;">${feedIcons[f.type] || '•'}</span>
        <span style="font-size:13px;flex:1;line-height:1.5;">${txt}</span>
        <span style="font-size:11px;color:var(--text-muted);flex-shrink:0;white-space:nowrap;">${t}</span>
      </div>`;
  }).join('') : '<div style="color:var(--text-muted);font-size:13px;padding:8px 0;">Sem atividade nas últimas 24h</div>';

  const topHtml = topUsers.map((u, i) => {
    const total = parseInt(u.trades) + parseInt(u.messages);
    const max = parseInt(topUsers[0]?.trades || 0) + parseInt(topUsers[0]?.messages || 0) || 1;
    const bar = Math.round((total / max) * 100);
    return `
      <div style="display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid rgba(255,255,255,0.04);">
        <span style="font-size:12px;color:var(--text-muted);width:16px;text-align:right;">${i+1}</span>
        <span style="font-weight:700;font-size:13px;flex:1;">${u.username}</span>
        <span style="font-size:11px;color:var(--text-muted);">🔄${u.trades} · 💬${u.messages}</span>
        <div style="width:50px;height:4px;background:rgba(255,255,255,0.08);border-radius:2px;overflow:hidden;">
          <div style="height:100%;width:${bar}%;background:var(--blue);border-radius:2px;"></div>
        </div>
      </div>`;
  }).join('') || '<div style="color:var(--text-muted);font-size:13px;">Sem dados</div>';

  el.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">
      <div class="card">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
          <span style="font-size:15px;font-weight:800;">🟢 Online Agora</span>
          <span style="background:var(--green);color:#fff;font-size:10px;font-weight:800;padding:2px 8px;border-radius:99px;">${online.length}</span>
        </div>
        <div style="max-height:240px;overflow-y:auto;">${onlineHtml}</div>
      </div>
      <div class="card">
        <div style="font-size:15px;font-weight:800;margin-bottom:12px;">🏆 Mais Ativos (7 dias)</div>
        <div style="max-height:240px;overflow-y:auto;">${topHtml}</div>
      </div>
    </div>
    <div class="card">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
        <span style="font-size:15px;font-weight:800;">📋 Atividade Recente (24h)</span>
        <span style="font-size:11px;color:var(--text-muted);">${feed.length} eventos</span>
        <span style="font-size:11px;color:var(--text-muted);margin-left:auto;">Atualiza em 30s</span>
      </div>
      <div style="max-height:450px;overflow-y:auto;">${feedHtml}</div>
    </div>
  `;
}

// ── REPORTS TAB ───────────────────────────────────────────────────────────────
function renderReports(reports) {
  const el = document.getElementById('tab-reports');
  if (!reports) { el.innerHTML = ''; return; }

  el.innerHTML = `
    <div class="card">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px;">
        <span style="font-size:15px;font-weight:800;">🚩 Nomes Reportados</span>
        ${reports.length ? `<span style="background:var(--red);color:#fff;font-size:10px;font-weight:800;padding:2px 8px;border-radius:99px;">${reports.length}</span>` : ''}
      </div>
      ${!reports.length ? '<div style="color:var(--text-muted);font-size:13px;">✅ Sem reports pendentes</div>' : `
        <div id="reports-list">
          ${reports.map(r => `
            <div class="report-row" data-id="${r.id}" style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.05);flex-wrap:wrap;">
              <div style="flex:1;min-width:180px;">
                <div style="font-size:11px;color:var(--text-muted);">#${String(r.number).padStart(3,'0')} · ${r.team_name} · Grupo ${r.group_name}</div>
                <div style="margin-top:3px;">
                  <span style="color:var(--red);font-size:13px;text-decoration:line-through;">${r.current_name || '(sem nome)'}</span>
                  <span style="color:var(--text-muted);margin:0 6px;">→</span>
                  <span style="color:#22c55e;font-size:13px;font-weight:700;">${r.suggested_name}</span>
                </div>
                <div style="font-size:10px;color:var(--text-muted);margin-top:2px;">por ${r.reporter} · ${new Date(Number(r.created_at)).toLocaleDateString('pt-PT')}</div>
              </div>
              <div style="display:flex;gap:6px;flex-shrink:0;">
                <button class="btn btn-primary btn-sm apply-report" data-id="${r.id}">✅ Aplicar</button>
                <button class="btn btn-ghost btn-sm dismiss-report" data-id="${r.id}" style="color:var(--text-muted);">✕</button>
              </div>
            </div>
          `).join('')}
        </div>
      `}
    </div>
  `;

  document.querySelectorAll('.apply-report').forEach(btn => {
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      try {
        await apiFetch(`/admin/reports/${btn.dataset.id}/apply`, { method: 'POST' });
        btn.closest('.report-row').remove();
        showToast('Nome atualizado!', 'success');
      } catch (e) { showToast(e.message, 'error'); btn.disabled = false; }
    });
  });
  document.querySelectorAll('.dismiss-report').forEach(btn => {
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      try {
        await apiFetch(`/admin/reports/${btn.dataset.id}/dismiss`, { method: 'POST' });
        btn.closest('.report-row').remove();
      } catch { btn.disabled = false; }
    });
  });
}

// ── USERS TAB ─────────────────────────────────────────────────────────────────
function renderUsers(users, stats) {
  const el = document.getElementById('tab-users');
  el.innerHTML = `
    <div class="card" style="margin-bottom:16px;">
      <div style="display:flex;gap:24px;flex-wrap:wrap;">
        <div><div style="font-size:24px;font-weight:800;color:var(--gold);">${stats?.users||0}</div><div style="font-size:12px;color:var(--text-muted);">Utilizadores</div></div>
        <div><div style="font-size:24px;font-weight:800;color:var(--blue);">${stats?.trades_completed||0}</div><div style="font-size:12px;color:var(--text-muted);">Trocas Concluídas</div></div>
        <div><div style="font-size:24px;font-weight:800;">${stats?.stickers_available||0}</div><div style="font-size:12px;color:var(--text-muted);">Cromos</div></div>
      </div>
    </div>
    <div class="card">
      <div style="font-size:15px;font-weight:800;margin-bottom:12px;">👥 Todos os Utilizadores</div>
      <div style="overflow-x:auto;">
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <thead>
            <tr style="border-bottom:1px solid var(--border);color:var(--text-muted);">
              <th style="text-align:left;padding:8px 10px;">Username</th>
              <th style="text-align:left;padding:8px 10px;">Local</th>
              <th style="text-align:left;padding:8px 10px;">Registado</th>
              <th style="text-align:left;padding:8px 10px;">Trocas</th>
              <th style="text-align:left;padding:8px 10px;">Última visita</th>
            </tr>
          </thead>
          <tbody>
            ${(users||[]).map(u => {
              const ls = u.last_seen ? Number(u.last_seen) : 0;
              const online = ls > Date.now() - 10 * 60 * 1000;
              const lastStr = ls
                ? online ? '<span style="color:#22c55e;font-weight:700;">● online</span>'
                  : new Date(ls).toLocaleString('pt-PT',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})
                : '—';
              return `<tr style="border-bottom:1px solid rgba(255,255,255,0.04);">
                <td style="padding:8px 10px;font-weight:600;">${u.username}${u.is_admin?' 🛡️':''}</td>
                <td style="padding:8px 10px;color:var(--text-muted);">${u.location||'—'}</td>
                <td style="padding:8px 10px;color:var(--text-muted);">${new Date(Number(u.created_at)).toLocaleDateString('pt-PT')}</td>
                <td style="padding:8px 10px;">${u.completed_trades||0}</td>
                <td style="padding:8px 10px;font-size:12px;">${lastStr}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}
