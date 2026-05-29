import { apiFetch, showToast, getUser } from '../app.js';

export async function render() {
  const main = document.getElementById('main-content');
  main.innerHTML = '<div class="loading-center"><div class="spinner"></div></div>';

  const matches = await apiFetch('/matches?limit=30');
  if (!matches) return;

  main.innerHTML = `
    <div class="page">
      <div class="page-header">
        <h2>🎯 Matches Automáticos</h2>
        <p>Utilizadores com quem podes trocar cromos mutuamente</p>
      </div>
      <div id="matches-content"></div>
    </div>
  `;

  const content = document.getElementById('matches-content');
  if (!matches.length) {
    content.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🔍</div>
        <h3>Sem matches encontrados</h3>
        <p>Vai ao catálogo e marca mais cromos como "Para Trocar" ou "Preciso" para encontrar matches!</p>
        <button class="btn btn-primary" style="margin-top:16px;" onclick="window.location.hash='/catalog'">
          📚 Ir ao Catálogo
        </button>
      </div>
    `;
    return;
  }

  content.innerHTML = matches.map(m => `
    <div class="match-card">
      <div class="match-card-header">
        <div class="match-score-badge">${m.match_score}</div>
        <div style="flex:1;">
          <div style="font-size:16px;font-weight:700;">${m.user.username}</div>
          <div style="font-size:12px;color:var(--text-muted);">
            ${m.user.location || 'Portugal'}
            ${m.user.rating ? `· ⭐ ${m.user.rating.toFixed(1)}` : ''}
          </div>
        </div>
        <button class="btn btn-primary btn-sm" data-user-id="${m.user.id}"
          data-give='${JSON.stringify(m.stickers_i_give.slice(0,5))}'
          data-receive='${JSON.stringify(m.stickers_i_receive.slice(0,5))}'>
          Propor Troca
        </button>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div>
          <div style="font-size:11px;color:var(--text-muted);font-weight:700;text-transform:uppercase;margin-bottom:4px;">
            📤 Podes dar (${m.stickers_i_give.length})
          </div>
          <div class="match-stickers">
            ${m.stickers_i_give.slice(0,8).map(id => `<span class="match-sticker-chip">${id}</span>`).join('')}
            ${m.stickers_i_give.length > 8 ? `<span class="match-sticker-chip">+${m.stickers_i_give.length-8}</span>` : ''}
          </div>
        </div>
        <div>
          <div style="font-size:11px;color:var(--text-muted);font-weight:700;text-transform:uppercase;margin-bottom:4px;">
            📥 Podes receber (${m.stickers_i_receive.length})
          </div>
          <div class="match-stickers">
            ${m.stickers_i_receive.slice(0,8).map(id => `<span class="match-sticker-chip">${id}</span>`).join('')}
            ${m.stickers_i_receive.length > 8 ? `<span class="match-sticker-chip">+${m.stickers_i_receive.length-8}</span>` : ''}
          </div>
        </div>
      </div>
    </div>
  `).join('');

  content.querySelectorAll('.btn[data-user-id]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const receiverId = btn.dataset.userId;
      const propStickers = JSON.parse(btn.dataset.give);
      const recvStickers = JSON.parse(btn.dataset.receive);

      btn.disabled = true; btn.textContent = 'A enviar...';
      try {
        await apiFetch('/trades', {
          method: 'POST',
          body: JSON.stringify({ receiver_id: receiverId, proposer_stickers: propStickers, receiver_stickers: recvStickers }),
        });
        showToast('Proposta de troca enviada!', 'success');
        btn.textContent = '✅ Enviado';
        btn.className = 'btn btn-success btn-sm';
      } catch (e) {
        showToast(e.message, 'error');
        btn.disabled = false; btn.textContent = 'Propor Troca';
      }
    });
  });
}
