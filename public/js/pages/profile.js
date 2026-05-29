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

  main.innerHTML = `
    <div class="page">
      <div class="card" style="margin-bottom:20px;">
        <div class="profile-header">
          <div class="profile-avatar">${initials}</div>
          <div style="flex:1;">
            <div class="profile-name">${profile.username}</div>
            ${profile.location ? `<div class="profile-location">📍 ${profile.location}</div>` : ''}
            <div class="profile-rating">
              ${renderStars(rating)}
              <span style="font-size:13px;color:var(--text-muted);">${rating ? `${rating} (${profile.rating_count} avaliações)` : 'Sem avaliações'}</span>
            </div>
          </div>
          ${isOwnProfile ? `<button class="btn btn-ghost btn-sm" id="edit-profile-btn">✏️ Editar</button>` : ''}
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
  }
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
        <label class="form-label">Localização</label>
        <input type="text" class="form-input" id="edit-location" value="${profile.location || ''}">
      </div>
      <button class="btn btn-primary" style="width:100%;" id="save-profile-btn">Guardar</button>
    </div>
  `;
  document.body.appendChild(overlay);

  overlay.querySelector('.modal-close').addEventListener('click', () => overlay.remove());
  overlay.querySelector('#save-profile-btn').addEventListener('click', async () => {
    const username = document.getElementById('edit-username').value.trim();
    const location = document.getElementById('edit-location').value.trim();
    try {
      await apiFetch('/users/me', { method: 'PUT', body: JSON.stringify({ username, location }) });
      overlay.remove();
      showToast('Perfil atualizado!', 'success');
      const stored = JSON.parse(localStorage.getItem('user') || '{}');
      stored.username = username; stored.location = location;
      localStorage.setItem('user', JSON.stringify(stored));
      document.getElementById('nav-username').textContent = username;
      await render();
    } catch (e) { showToast(e.message, 'error'); }
  });
}
