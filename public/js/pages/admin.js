import { apiFetch, getUser, showToast } from '../app.js';

export async function render() {
  const user = getUser();
  if (!user?.is_admin) {
    document.getElementById('main-content').innerHTML = '<div class="empty-state"><div class="empty-icon">🚫</div><h3>Sem permissão</h3></div>';
    return;
  }
  const main = document.getElementById('main-content');
  main.innerHTML = '<div class="loading-center"><div class="spinner"></div></div>';

  const [users, stats, reports] = await Promise.all([
    apiFetch('/admin/users'),
    apiFetch('/stats'),
    apiFetch('/admin/reports'),
  ]);

  main.innerHTML = `
    <div class="page">
      <div class="page-header">
        <h2>🛡️ Painel de Administração</h2>
        <p>${users?.length || 0} utilizadores registados</p>
      </div>

      <!-- Stats -->
      <div class="card" style="margin-bottom:16px;">
        <div style="display:flex;gap:24px;flex-wrap:wrap;">
          <div><div style="font-size:24px;font-weight:800;color:var(--gold);">${stats?.users || 0}</div><div style="font-size:12px;color:var(--text-muted);">Utilizadores</div></div>
          <div><div style="font-size:24px;font-weight:800;color:var(--blue);">${stats?.trades_completed || 0}</div><div style="font-size:12px;color:var(--text-muted);">Trocas Feitas</div></div>
          <div><div style="font-size:24px;font-weight:800;">${stats?.stickers_available || 0}</div><div style="font-size:12px;color:var(--text-muted);">Cromos na Plataforma</div></div>
          <div><div style="font-size:24px;font-weight:800;color:var(--red);" id="report-count">${reports?.length || 0}</div><div style="font-size:12px;color:var(--text-muted);">Reports Pendentes</div></div>
        </div>
      </div>

      <!-- Reports section -->
      <div class="card" style="margin-bottom:16px;" id="reports-section">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
          <span style="font-size:15px;font-weight:800;">🚩 Nomes Reportados</span>
          ${reports?.length ? `<span style="background:var(--red);color:#fff;font-size:10px;font-weight:800;padding:2px 7px;border-radius:99px;">${reports.length}</span>` : ''}
        </div>
        ${!reports?.length ? `
          <div style="color:var(--text-muted);font-size:13px;padding:12px 0;">✅ Sem reports pendentes</div>
        ` : `
          <div id="reports-list">
            ${reports.map(r => `
              <div class="report-row" data-id="${r.id}" style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.05);flex-wrap:wrap;">
                <div style="flex:1;min-width:200px;">
                  <div style="font-size:11px;color:var(--text-muted);">#${String(r.number).padStart(3,'0')} · ${r.team_name} · Grupo ${r.group_name}</div>
                  <div style="margin-top:3px;">
                    <span style="color:var(--red);font-size:13px;text-decoration:line-through;">${r.current_name || '(sem nome)'}</span>
                    <span style="color:var(--text-muted);margin:0 6px;">→</span>
                    <span style="color:#22c55e;font-size:13px;font-weight:700;">${r.suggested_name}</span>
                  </div>
                  <div style="font-size:10px;color:var(--text-muted);margin-top:2px;">por ${r.reporter} · ${new Date(Number(r.created_at)).toLocaleDateString('pt-PT')}</div>
                </div>
                <div style="display:flex;gap:6px;flex-shrink:0;">
                  <button class="btn btn-primary btn-sm apply-report" data-id="${r.id}" style="font-size:11px;">✅ Aplicar</button>
                  <button class="btn btn-ghost btn-sm dismiss-report" data-id="${r.id}" style="font-size:11px;color:var(--text-muted);">✕ Ignorar</button>
                </div>
              </div>
            `).join('')}
          </div>
        `}
      </div>

      <!-- Users table -->
      <div class="card">
        <div style="font-size:15px;font-weight:800;margin-bottom:12px;">👥 Utilizadores</div>
        <div style="overflow-x:auto;">
          <table style="width:100%;border-collapse:collapse;font-size:13px;">
            <thead>
              <tr style="border-bottom:1px solid var(--border);color:var(--text-muted);">
                <th style="text-align:left;padding:8px 12px;">Username</th>
                <th style="text-align:left;padding:8px 12px;">Email</th>
                <th style="text-align:left;padding:8px 12px;">Local</th>
                <th style="text-align:left;padding:8px 12px;">Registado</th>
                <th style="text-align:left;padding:8px 12px;">Trocas</th>
              </tr>
            </thead>
            <tbody>
              ${(users || []).map(u => `
                <tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
                  <td style="padding:8px 12px;font-weight:600;">${u.username}${u.is_admin ? ' 🛡️' : ''}</td>
                  <td style="padding:8px 12px;color:var(--text-muted);">${u.email}</td>
                  <td style="padding:8px 12px;color:var(--text-muted);">${u.location || '—'}</td>
                  <td style="padding:8px 12px;color:var(--text-muted);">${new Date(Number(u.created_at)).toLocaleDateString('pt-PT')}</td>
                  <td style="padding:8px 12px;">${u.completed_trades || 0}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  // Report action handlers
  document.querySelectorAll('.apply-report').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      btn.disabled = true;
      try {
        await apiFetch(`/admin/reports/${id}/apply`, { method: 'POST' });
        btn.closest('.report-row').remove();
        showToast('Nome atualizado com sucesso!', 'success');
        const count = document.querySelectorAll('.report-row').length;
        document.getElementById('report-count').textContent = count;
        if (count === 0) document.getElementById('reports-list').innerHTML = '<div style="color:var(--text-muted);font-size:13px;padding:12px 0;">✅ Sem reports pendentes</div>';
      } catch (e) {
        showToast(e.message, 'error');
        btn.disabled = false;
      }
    });
  });

  document.querySelectorAll('.dismiss-report').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      btn.disabled = true;
      try {
        await apiFetch(`/admin/reports/${id}/dismiss`, { method: 'POST' });
        btn.closest('.report-row').remove();
        const count = document.querySelectorAll('.report-row').length;
        document.getElementById('report-count').textContent = count;
        if (count === 0) document.getElementById('reports-list').innerHTML = '<div style="color:var(--text-muted);font-size:13px;padding:12px 0;">✅ Sem reports pendentes</div>';
      } catch (e) {
        btn.disabled = false;
      }
    });
  });
}
