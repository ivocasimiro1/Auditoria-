import { apiFetch, showToast } from '../app.js';
import { flagImg, fetchStickerMap, stickerChip } from '../stickers.js';

export async function render() {
  const main = document.getElementById('main-content');
  main.innerHTML = '<div class="loading-center"><div class="spinner"></div></div>';

  const matches = await apiFetch('/matches?limit=30');
  if (!matches) return;

  main.innerHTML = `
    <div class="page">
      <div class="page-header">
        <h2>🎯 Quem podes trocar?</h2>
        <p>O sistema encontrou ${matches.length} pessoa${matches.length !== 1 ? 's' : ''} com quem tens cromos para trocar</p>
      </div>
      <div id="matches-content"></div>
    </div>
  `;

  const content = document.getElementById('matches-content');

  if (!matches.length) {
    content.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🔍</div>
        <h3>Ainda sem matches</h3>
        <p>Vai ao catálogo, marca os cromos que tens e os que precisas. O sistema encontra automaticamente quem pode trocar contigo!</p>
        <button class="btn btn-primary" style="margin-top:16px;" onclick="window.location.hash='/catalog'">
          📚 Marcar os meus cromos
        </button>
      </div>
    `;
    return;
  }

  // Collect all sticker IDs to batch-fetch names at once
  const allIds = [...new Set(matches.flatMap(m => [...m.stickers_i_give.slice(0,8), ...m.stickers_i_receive.slice(0,8)]))];
  const stickerMap = await fetchStickerMap(apiFetch, allIds);

  content.innerHTML = matches.map(m => {
    const giveChips = m.stickers_i_give.slice(0, 6).map(id => stickerChip(id, stickerMap)).join('');
    const receiveChips = m.stickers_i_receive.slice(0, 6).map(id => stickerChip(id, stickerMap)).join('');
    const giveExtra = m.stickers_i_give.length > 6 ? `<span class="sticker-chip-simple">+${m.stickers_i_give.length - 6} mais</span>` : '';
    const receiveExtra = m.stickers_i_receive.length > 6 ? `<span class="sticker-chip-simple">+${m.stickers_i_receive.length - 6} mais</span>` : '';

    return `
      <div class="card" style="margin-bottom:14px;">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px;">
          <div style="width:42px;height:42px;border-radius:12px;background:linear-gradient(135deg,var(--blue),var(--purple));display:flex;align-items:center;justify-content:center;font-weight:800;font-size:16px;flex-shrink:0;">
            ${(m.user.username||'?')[0].toUpperCase()}
          </div>
          <div style="flex:1;min-width:0;">
            <div style="font-size:15px;font-weight:800;">${m.user.username}</div>
            <div style="font-size:12px;color:var(--text-muted);">📍 ${m.user.location || 'Portugal'}</div>
          </div>
          <button class="btn btn-primary btn-sm propose-btn"
            data-user-id="${m.user.id}"
            data-give='${JSON.stringify(m.stickers_i_give.slice(0,10))}'
            data-receive='${JSON.stringify(m.stickers_i_receive.slice(0,10))}'>
            🤝 Propor Troca
          </button>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          <div style="background:rgba(16,185,129,0.06);border:1px solid rgba(16,185,129,0.15);border-radius:8px;padding:10px;">
            <div style="font-size:11px;font-weight:700;color:var(--green);margin-bottom:6px;">
              📤 TU DÁS (${m.stickers_i_give.length})
            </div>
            <div class="sticker-chips-list">${giveChips}${giveExtra}</div>
          </div>
          <div style="background:rgba(59,130,246,0.06);border:1px solid rgba(59,130,246,0.15);border-radius:8px;padding:10px;">
            <div style="font-size:11px;font-weight:700;color:var(--blue);margin-bottom:6px;">
              📥 TU RECEBES (${m.stickers_i_receive.length})
            </div>
            <div class="sticker-chips-list">${receiveChips}${receiveExtra}</div>
          </div>
        </div>
      </div>
    `;
  }).join('');

  content.querySelectorAll('.propose-btn').forEach(btn => {
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
        showToast('✅ Proposta enviada! Aguarda a resposta na página Trocas.', 'success');
        btn.textContent = '✅ Proposta Enviada';
        btn.className = 'btn btn-success btn-sm';
      } catch (e) {
        showToast(e.message, 'error');
        btn.disabled = false; btn.textContent = '🤝 Propor Troca';
      }
    });
  });
}
