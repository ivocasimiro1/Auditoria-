import { apiFetch, getUser, showToast, relativeTime, STATUS_LABELS } from '../app.js';

export async function render() {
  const main = document.getElementById('main-content');
  main.innerHTML = '<div class="loading-center"><div class="spinner"></div></div>';

  const hash = window.location.hash;
  const idMatch = hash.match(/[?&]user=([^&]+)/);
  const user = getUser();
  const profileId = idMatch ? idMatch[1] : user?.id;
  const isOwnProfile = profileId === user?.id;

  const [profile, stats, trades] = await Promise.all([
    apiFetch(`/users/${profileId}`),
    isOwnProfile ? apiFetch('/stickers/collection/stats/me') : Promise.resolve(null),
    apiFetch(`/users/${profileId}/trades`),
  ]);

  if (!profile) { main.innerHTML = '<div class="empty-state"><div class="empty-icon">😔</div><h3>Perfil não encontrado</h3></div>'; return; }

  const initials = profile.username.slice(0, 2).toUpperCase();
  const rating = profile.rating ? profile.rating.toFixed(1) : null;
  const avatarHtml = profile.avatar_url
    ? `<div class="profile-avatar" style="padding:0;overflow:hidden;"><img src="${profile.avatar_url}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;"></div>`
    : `<div class="profile-avatar">${initials}</div>`;

  main.innerHTML = `
    <div class="page">
      <div class="card" style="margin-bottom:20px;">
        <div class="profile-header">
          <div style="position:relative;display:inline-block;">
            ${avatarHtml}
            ${isOwnProfile ? `<label for="avatar-upload" style="position:absolute;bottom:0;right:0;width:22px;height:22px;background:var(--gold);border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:11px;">📷</label><input type="file" id="avatar-upload" accept="image/*" style="display:none;">` : ''}
          </div>
          <div style="flex:1;">
            <div class="profile-name">${profile.username}</div>
            ${profile.location ? `<div class="profile-location">📍 ${profile.location}</div>` : ''}
            <div class="profile-rating">
              ${renderStars(rating)}
              <span style="font-size:13px;color:var(--text-muted);">${rating ? `${rating} (${profile.rating_count} avaliações)` : 'Sem avaliações'}</span>
            </div>
          </div>
          ${isOwnProfile ? `
            <button class="btn btn-ghost btn-sm" id="edit-profile-btn">✏️ Editar</button>
            <button class="btn btn-sm" style="background:transparent;border:1px solid var(--red);color:var(--red);padding:6px 12px;border-radius:8px;font-size:12px;" id="delete-account-btn">🗑️ Eliminar Conta</button>
          ` : ''}
        </div>
        <div style="display:flex;gap:24px;flex-wrap:wrap;margin-bottom:12px;">
          <div>
            <div style="font-size:24px;font-weight:800;color:var(--gold);">${profile.completed_trades}</div>
            <div style="font-size:12px;color:var(--text-muted);">Trocas Concluídas</div>
          </div>
          ${stats ? `
            <div>
              <div style="font-size:24px;font-weight:800;color:var(--blue);">${stats.completion_pct}%</div>
              <div style="font-size:12px;color:var(--text-muted);">Caderneta Completa</div>
            </div>
            <div>
              <div style="font-size:24px;font-weight:800;">${stats.have_to_trade}</div>
              <div style="font-size:12px;color:var(--text-muted);">Para Trocar</div>
            </div>
          ` : ''}
          <div>
            <div style="font-size:24px;font-weight:800;">${profile.rating_count}</div>
            <div style="font-size:12px;color:var(--text-muted);">Avaliações</div>
          </div>
        </div>
        <div style="font-size:14px;font-weight:600;color:var(--text-muted);margin-top:4px;">
          ✅ ${profile.trades_completed ?? profile.completed_trades} trocas concluídas
          · ❌ ${profile.trades_cancelled ?? 0} canceladas
          ${profile.positive_pct !== null && profile.positive_pct !== undefined ? `· ⭐ ${profile.positive_pct}% positivo` : ''}
        </div>
      </div>

      ${profile.reviews?.length ? `
        <div class="card" style="margin-bottom:20px;">
          <div class="card-title" style="margin-bottom:12px;">⭐ Avaliações (${profile.reviews.length})</div>
          ${profile.reviews.map(r => renderReviewCard(r)).join('')}
        </div>
      ` : ''}

      ${trades?.length ? `
        <div class="card">
          <div class="card-title" style="margin-bottom:12px;">📜 Histórico de Trocas</div>
          ${trades.map(t => `
            <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);">
              <div>
                <div style="font-size:13px;font-weight:600;">${t.proposer_username} ↔ ${t.receiver_username}</div>
                <div style="font-size:11px;color:var(--text-muted);">${relativeTime(t.updated_at)}</div>
              </div>
              <span class="badge badge-green">✅ Concluída</span>
            </div>
          `).join('')}
        </div>
      ` : ''}
    </div>
  `;

  if (isOwnProfile) {
    document.getElementById('edit-profile-btn')?.addEventListener('click', () => openEditModal(profile));
    document.getElementById('delete-account-btn')?.addEventListener('click', () => confirmDeleteAccount());
    document.getElementById('avatar-upload')?.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const formData = new FormData();
      formData.append('avatar', file);
      const token = localStorage.getItem('token');
      try {
        const res = await fetch('/api/users/me/avatar', { method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: formData });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro ao carregar foto');
        const stored = JSON.parse(localStorage.getItem('user') || '{}');
        stored.avatar_url = data.avatar_url;
        localStorage.setItem('user', JSON.stringify(stored));
        showToast('Foto de perfil atualizada!', 'success');
        await render();
      } catch (err) { showToast(err.message, 'error'); }
    });
  }
}

async function confirmDeleteAccount() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal" style="max-width:400px;">
      <div class="modal-header">
        <span class="modal-title">🗑️ Eliminar Conta</span>
        <button class="modal-close">✕</button>
      </div>
      <p style="color:var(--text-muted);margin-bottom:8px;">Tens a certeza? Esta ação é <strong style="color:var(--red);">irreversível</strong>.</p>
      <p style="color:var(--text-muted);font-size:13px;margin-bottom:20px;">Todos os teus dados, cromos e anúncios serão apagados.</p>
      <div style="display:flex;gap:8px;">
        <button class="btn btn-ghost" style="flex:1;" id="cancel-delete-btn">Cancelar</button>
        <button class="btn" style="flex:1;background:var(--red);color:#fff;" id="confirm-delete-btn">Sim, eliminar</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.querySelector('.modal-close').addEventListener('click', () => overlay.remove());
  document.getElementById('cancel-delete-btn').addEventListener('click', () => overlay.remove());
  document.getElementById('confirm-delete-btn').addEventListener('click', async () => {
    try {
      await apiFetch('/users/me', { method: 'DELETE' });
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.reload();
    } catch (e) {
      showToast(e.message, 'error');
      overlay.remove();
    }
  });
}

function renderStars(rating) {
  if (!rating) return '<span style="color:var(--text-muted);">☆☆☆☆☆</span>';
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5 ? 1 : 0;
  const empty = 5 - full - half;
  return '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(empty);
}

function renderStarsFixed(stars) {
  const filled = Math.min(5, Math.max(0, Math.round(stars)));
  const empty = 5 - filled;
  return `<span style="color:#f5a623;font-size:16px;letter-spacing:1px;">${'★'.repeat(filled)}${'☆'.repeat(empty)}</span>`;
}

function renderReviewCard(r) {
  // Use textContent via a temporary element approach is not available here (vanilla template),
  // so we sanitise by not using innerHTML for user content — we build it as a structure.
  return `
    <div style="background:var(--bg-card2);border-radius:10px;padding:14px 16px;margin-bottom:10px;border:1px solid var(--border);">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
        <div style="display:flex;align-items:center;gap:8px;">
          ${renderStarsFixed(r.stars)}
          <span style="font-size:13px;font-weight:600;color:var(--text);">${r.stars}/5</span>
        </div>
        <span style="font-size:11px;color:var(--text-muted);">${relativeTime(r.created_at)}</span>
      </div>
      <div style="font-size:12px;color:var(--text-muted);margin-bottom:6px;">por <strong>${escapeHtml(r.reviewer_username)}</strong></div>
      ${r.comment ? `<div style="font-size:13px;color:var(--text);font-style:italic;margin-bottom:6px;">"${escapeHtml(r.comment)}"</div>` : ''}
      ${r.reply ? `
        <div style="margin-top:8px;padding:8px 12px;background:var(--bg-card);border-left:3px solid var(--gold);border-radius:4px;font-size:12px;color:var(--text-muted);">
          <strong>Resposta:</strong> ${escapeHtml(r.reply)}
        </div>
      ` : ''}
    </div>
  `;
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

async function openEditModal(profile) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-header">
        <span class="modal-title">✏️ Editar Perfil</span>
        <button class="modal-close">✕</button>
      </div>
      <div class="form-group">
        <label class="form-label">Username</label>
        <input type="text" class="form-input" id="edit-username" value="${profile.username}">
      </div>
      <div class="form-group">
        <label class="form-label">Localização <span style="color:var(--text-muted)">(cidade)</span></label>
        <input type="text" class="form-input" id="edit-location" placeholder="Ex: Lisboa" value="${profile.location || ''}">
      </div>
      <div class="form-group">
        <label class="form-label">Novo Email <span style="color:var(--text-muted)">(deixa em branco para não alterar)</span></label>
        <input type="email" class="form-input" id="edit-email" placeholder="${profile.email || ''}">
      </div>
      <hr style="border-color:var(--border);margin:12px 0;">
      <div class="form-group">
        <label class="form-label">Nova Password <span style="color:var(--text-muted)">(deixa em branco para não alterar)</span></label>
        <input type="password" class="form-input" id="edit-new-password" placeholder="Nova password">
      </div>
      <div class="form-group" id="current-pass-group" style="display:none;">
        <label class="form-label">Password Atual <span style="color:var(--red)">*obrigatório</span></label>
        <input type="password" class="form-input" id="edit-current-password" placeholder="Password atual">
      </div>
      <button class="btn btn-primary" style="width:100%;" id="save-profile-btn">Guardar</button>
    </div>
  `;
  document.body.appendChild(overlay);

  overlay.querySelector('.modal-close').addEventListener('click', () => overlay.remove());
  document.getElementById('edit-new-password').addEventListener('input', (e) => {
    document.getElementById('current-pass-group').style.display = e.target.value ? 'block' : 'none';
  });

  overlay.querySelector('#save-profile-btn').addEventListener('click', async () => {
    const username = document.getElementById('edit-username').value.trim();
    const location = document.getElementById('edit-location').value.trim();
    const email = document.getElementById('edit-email').value.trim();
    const new_password = document.getElementById('edit-new-password').value;
    const current_password = document.getElementById('edit-current-password').value;
    const body = { username, location };
    if (email) body.email = email;
    if (new_password) { body.new_password = new_password; body.current_password = current_password; }
    try {
      await apiFetch('/users/me', { method: 'PUT', body: JSON.stringify(body) });
      overlay.remove();
      showToast('Perfil atualizado!', 'success');
      const stored = JSON.parse(localStorage.getItem('user') || '{}');
      stored.username = username; stored.location = location;
      if (email) stored.email = email;
      localStorage.setItem('user', JSON.stringify(stored));
      document.getElementById('nav-username').textContent = username;
      await render();
    } catch (e) { showToast(e.message, 'error'); }
  });
}
