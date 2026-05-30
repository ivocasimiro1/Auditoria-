import { apiFetch, getUser } from '../app.js';

export async function render() {
  const user = getUser();
  if (!user?.is_admin) {
    document.getElementById('main-content').innerHTML = '<div class="empty-state"><div class="empty-icon">🚫</div><h3>Sem permissão</h3></div>';
    return;
  }
  const main = document.getElementById('main-content');
  main.innerHTML = '<div class="loading-center"><div class="spinner"></div></div>';

  const [users, stats] = await Promise.all([
    apiFetch('/admin/users'),
    apiFetch('/stats'),
  ]);

  main.innerHTML = `
    <div class="page">
      <div class="page-header">
        <h2>🛡️ Painel de Administração</h2>
        <p>${users?.length || 0} utilizadores registados</p>
      </div>
      <div class="card" style="margin-bottom:16px;">
        <div style="display:flex;gap:24px;flex-wrap:wrap;">
          <div><div style="font-size:24px;font-weight:800;color:var(--gold);">${stats?.users || 0}</div><div style="font-size:12px;color:var(--text-muted);">Utilizadores</div></div>
          <div><div style="font-size:24px;font-weight:800;color:var(--blue);">${stats?.trades_completed || 0}</div><div style="font-size:12px;color:var(--text-muted);">Trocas Feitas</div></div>
          <div><div style="font-size:24px;font-weight:800;">${stats?.stickers_available || 0}</div><div style="font-size:12px;color:var(--text-muted);">Cromos na Plataforma</div></div>
        </div>
      </div>
      <div class="card">
        <div class="card-title" style="margin-bottom:12px;">👥 Utilizadores</div>
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
}
