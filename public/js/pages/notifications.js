import { apiFetch, relativeTime } from '../app.js';

const NOTIF_ICONS = {
  trade_proposal: '📩',
  trade_accepted: '✅',
  message: '💬',
  trade_completed: '🎉',
  rating: '⭐',
  match_found: '🎯',
  novo_match: '🎯',
};

export async function render() {
  const main = document.getElementById('main-content');
  main.innerHTML = '<div class="loading-center"><div class="spinner"></div></div>';

  const notifications = await apiFetch('/notifications');
  if (!notifications) return;

  main.innerHTML = `
    <div class="page">
      <div class="page-header" style="display:flex;align-items:center;justify-content:space-between;">
        <div>
          <h2>🔔 Notificações</h2>
          <p>${notifications.filter(n => !n.read).length} não lidas</p>
        </div>
        ${notifications.some(n => !n.read) ? `
          <button class="btn btn-ghost btn-sm" id="mark-all-read">Marcar todas como lidas</button>
        ` : ''}
      </div>
      <div id="notif-list"></div>
    </div>
  `;

  renderList(notifications);

  const markAllBtn = document.getElementById('mark-all-read');
  if (markAllBtn) {
    markAllBtn.addEventListener('click', async () => {
      await apiFetch('/notifications/read-all', { method: 'PATCH' });
      const updated = await apiFetch('/notifications');
      renderList(updated || []);
      const badge = document.getElementById('notif-count');
      if (badge) { badge.textContent = '0'; badge.classList.remove('visible'); }
      markAllBtn.remove();
    });
  }
}

function renderList(notifications) {
  const list = document.getElementById('notif-list');
  if (!list) return;

  if (!notifications.length) {
    list.innerHTML = `<div class="empty-state"><div class="empty-icon">🔔</div><h3>Sem notificações</h3><p>Tudo limpo por aqui!</p></div>`;
    return;
  }

  list.innerHTML = `<div class="card" style="padding:8px;">` +
    notifications.map(n => {
      const payload = JSON.parse(n.payload || '{}');
      const text = getNotifText(n.type, payload);
      return `
        <div class="notif-item ${n.read ? '' : 'unread'}" data-id="${n.id}" ${payload.tradeId ? `data-trade="${payload.tradeId}"` : ''}>
          <div class="notif-icon">${NOTIF_ICONS[n.type] || '🔔'}</div>
          <div class="notif-body">
            <div class="notif-text">${text}</div>
            <div class="notif-time">${relativeTime(n.created_at)}</div>
          </div>
          ${!n.read ? `<div style="width:8px;height:8px;border-radius:50%;background:var(--blue);flex-shrink:0;margin-top:6px;"></div>` : ''}
        </div>
      `;
    }).join('') + `</div>`;

  list.querySelectorAll('.notif-item').forEach(item => {
    item.addEventListener('click', async () => {
      await apiFetch(`/notifications/${item.dataset.id}/read`, { method: 'PATCH' });
      item.classList.remove('unread');
      if (item.dataset.trade) window.location.hash = `/trades?id=${item.dataset.trade}`;
    });
  });
}

function getNotifText(type, payload) {
  switch (type) {
    case 'trade_proposal': return `<strong>${payload.fromUser}</strong> enviou-te uma proposta de troca`;
    case 'trade_accepted': return `<strong>${payload.fromUser}</strong> aceitou a tua proposta`;
    case 'message': return `<strong>${payload.fromUser}</strong>: "${payload.preview || ''}"`;
    case 'trade_completed': return `Troca com <strong>${payload.fromUser}</strong> concluída!`;
    case 'rating': return `<strong>${payload.fromUser}</strong> avaliou-te com ${payload.score}⭐`;
    case 'match_found': return `Novo match encontrado com <strong>${payload.fromUser}</strong>`;
    case 'novo_match':  return `<strong>${payload.matchUsername}</strong> tem um cromo que precisas — vê os teus matches!`;
    default: return 'Nova notificação';
  }
}
