import { apiFetch, getUser, showToast, relativeTime, STATUS_LABELS, STATUS_ICONS } from '../app.js';

let activeTradeId = null;
let chatInterval = null;
let lastChatTs = 0;

export async function render() {
  clearInterval(chatInterval);
  chatInterval = null;
  lastChatTs = 0;

  const main = document.getElementById('main-content');
  main.innerHTML = '<div class="loading-center"><div class="spinner"></div></div>';

  // Check if opened from elsewhere with a specific trade
  const hash = window.location.hash;
  const idMatch = hash.match(/[?&]id=([^&]+)/);
  if (idMatch) activeTradeId = idMatch[1];

  const trades = await apiFetch('/trades');
  if (!trades) return;

  main.innerHTML = `
    <div class="page">
      <div class="page-header" style="display:flex;align-items:center;justify-content:space-between;">
        <div>
          <h2>🔄 As Minhas Trocas</h2>
          <p>Gerir propostas e trocas em curso</p>
        </div>
        <button class="btn btn-primary" id="new-trade-btn">+ Nova Troca</button>
      </div>

      <div class="tabs">
        <button class="tab-btn active" data-status="all">Todas</button>
        <button class="tab-btn" data-status="pending">Pendentes</button>
        <button class="tab-btn" data-status="accepted">Aceites</button>
        <button class="tab-btn" data-status="in_transit">Em Trânsito</button>
        <button class="tab-btn" data-status="completed">Concluídas</button>
      </div>

      <div id="trades-list"></div>
      <div id="trade-detail" style="display:none;"></div>
    </div>
  `;

  renderTradesList(trades, 'all');

  document.querySelectorAll('.tab-btn[data-status]').forEach(btn => {
    btn.addEventListener('click', async () => {
      document.querySelectorAll('.tab-btn[data-status]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const status = btn.dataset.status;
      const filtered = status === 'all' ? trades : trades.filter(t => t.status === status);
      renderTradesList(filtered, status);
    });
  });

  document.getElementById('new-trade-btn').addEventListener('click', showNewTradeModal);

  if (activeTradeId) {
    const trade = trades.find(t => t.id === activeTradeId);
    if (trade) openTradeDetail(trade);
  }
}

function renderTradesList(trades, status) {
  const user = getUser();
  const list = document.getElementById('trades-list');
  const detail = document.getElementById('trade-detail');
  if (detail) detail.style.display = 'none';
  if (list) list.style.display = 'block';

  if (!trades.length) {
    list.innerHTML = `<div class="empty-state"><div class="empty-icon">🔄</div><h3>Sem trocas ${status !== 'all' ? STATUS_LABELS[status]?.toLowerCase() || '' : ''}</h3><p>Vai aos matches para propor trocas!</p></div>`;
    return;
  }

  list.innerHTML = trades.map(t => {
    const isProposer = t.proposer_id === user?.id;
    const otherUser = isProposer ? t.receiver_username : t.proposer_username;
    const role = isProposer ? 'Proposta enviada' : 'Proposta recebida';
    return `
      <div class="trade-card" data-id="${t.id}">
        <div class="trade-card-header">
          <div>
            <div class="trade-card-users">
              ${STATUS_ICONS[t.status]} Com <strong>${otherUser}</strong>
            </div>
            <div class="trade-card-meta">${role} · ${relativeTime(t.created_at)}</div>
          </div>
          <span class="badge ${statusBadgeClass(t.status)}">${STATUS_LABELS[t.status] || t.status}</span>
        </div>
        <div style="font-size:12px;color:var(--text-muted);margin-top:6px;">
          Ofereces: ${JSON.parse(t.proposer_stickers||'[]').length} cromo(s) ·
          Recebes: ${JSON.parse(t.receiver_stickers||'[]').length} cromo(s)
        </div>
      </div>
    `;
  }).join('');

  list.querySelectorAll('.trade-card[data-id]').forEach(card => {
    card.addEventListener('click', async () => {
      const trade = await apiFetch(`/trades/${card.dataset.id}`);
      if (trade) openTradeDetail(trade);
    });
  });
}

function statusBadgeClass(s) {
  const m = { pending:'badge-gold', accepted:'badge-blue', in_transit:'badge-gray', completed:'badge-green', cancelled:'badge-red' };
  return m[s] || 'badge-gray';
}

async function openTradeDetail(trade) {
  lastChatTs = 0;
  clearInterval(chatInterval);
  chatInterval = null;
  const user = getUser();
  const list = document.getElementById('trades-list');
  const detail = document.getElementById('trade-detail');
  list.style.display = 'none';
  detail.style.display = 'block';

  const isProposer = trade.proposer_id === user.id;
  const otherUser = isProposer ? trade.receiver_username : trade.proposer_username;
  const propStickers = JSON.parse(trade.proposer_stickers || '[]');
  const recvStickers = JSON.parse(trade.receiver_stickers || '[]');

  const shipment = ['accepted','in_transit','completed'].includes(trade.status)
    ? await apiFetch(`/trades/${trade.id}/shipping`).catch(() => null)
    : null;

  detail.innerHTML = `
    <button class="btn btn-ghost btn-sm" id="back-btn" style="margin-bottom:16px;">← Voltar</button>

    <div class="card" style="margin-bottom:16px;">
      <div class="card-header">
        <span class="card-title">${STATUS_ICONS[trade.status]} Troca com ${otherUser}</span>
        <span class="badge ${statusBadgeClass(trade.status)}">${STATUS_LABELS[trade.status]}</span>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:8px;">
        <div>
          <div style="font-size:12px;color:var(--text-muted);margin-bottom:6px;">${isProposer ? 'Ofereces' : `${trade.proposer_username} oferece`}</div>
          <div style="display:flex;flex-wrap:wrap;gap:4px;">
            ${propStickers.map(id => `<span class="match-sticker-chip">📌 ${id}</span>`).join('')}
          </div>
        </div>
        <div>
          <div style="font-size:12px;color:var(--text-muted);margin-bottom:6px;">${isProposer ? `${trade.receiver_username} oferece` : 'Ofereces'}</div>
          <div style="display:flex;flex-wrap:wrap;gap:4px;">
            ${recvStickers.map(id => `<span class="match-sticker-chip">📌 ${id}</span>`).join('')}
          </div>
        </div>
      </div>
      ${trade.message ? `<div style="margin-top:12px;padding:10px;background:var(--bg-card2);border-radius:8px;font-size:13px;font-style:italic;" id="trade-msg-display"></div>` : ''}
      <div style="margin-top:16px;display:flex;flex-wrap:wrap;gap:8px;" id="trade-actions">
        ${renderTradeActions(trade, isProposer)}
      </div>
    </div>

    ${renderShipping(trade, shipment, isProposer)}

    <div class="card">
      <div class="card-title" style="margin-bottom:12px;">💬 Chat</div>
      <div class="chat-container">
        <div class="chat-messages" id="chat-messages"><div style="text-align:center;color:var(--text-muted);padding:20px;font-size:13px;">Sem mensagens ainda</div></div>
        ${['cancelled','completed'].includes(trade.status) ? '' : `
          <div class="chat-input-row">
            <input type="text" class="form-input" id="chat-input" placeholder="Escreve uma mensagem..." maxlength="500">
            <button class="btn btn-primary" id="chat-send">Enviar</button>
          </div>
        `}
      </div>
    </div>

    ${trade.status === 'completed' ? renderRating(trade) : ''}
  `;

  document.getElementById('back-btn').addEventListener('click', () => {
    clearInterval(chatInterval);
    list.style.display = 'block';
    detail.style.display = 'none';
  });

  // Set trade message safely (XSS prevention)
  const msgEl = document.getElementById('trade-msg-display');
  if (msgEl && trade.message) msgEl.textContent = `"${trade.message}"`;

  // Action buttons
  setupTradeActions(trade, isProposer);

  // Advance tracking (demo)
  const advBtn = document.getElementById('advance-tracking-btn');
  if (advBtn) {
    advBtn.addEventListener('click', async () => {
      try {
        const r = await apiFetch(`/trades/${trade.id}/shipping/advance`, { method: 'POST' });
        showToast(`Estado: ${r.status}`, 'success');
        const updated = await apiFetch(`/trades/${trade.id}`);
        if (updated) openTradeDetail(updated);
      } catch (e) { showToast(e.message, 'error'); }
    });
  }

  // Rating
  const ratingCard = document.getElementById('rating-card');
  if (ratingCard) {
    let selectedScore = 0;
    ratingCard.querySelectorAll('.star').forEach(star => {
      star.addEventListener('mouseover', () => {
        ratingCard.querySelectorAll('.star').forEach((s, i) => {
          s.classList.toggle('filled', i < parseInt(star.dataset.score));
        });
      });
      star.addEventListener('click', () => {
        selectedScore = parseInt(star.dataset.score);
        ratingCard.querySelectorAll('.star').forEach((s, i) => {
          s.classList.toggle('filled', i < selectedScore);
        });
      });
    });
    ratingCard.addEventListener('mouseleave', () => {
      ratingCard.querySelectorAll('.star').forEach((s, i) => {
        s.classList.toggle('filled', i < selectedScore);
      });
    });
    document.getElementById('submit-rating-btn')?.addEventListener('click', async () => {
      if (!selectedScore) { showToast('Escolhe uma pontuação', 'error'); return; }
      const comment = document.getElementById('rating-comment').value.trim();
      try {
        await apiFetch(`/trades/${trade.id}/rate`, { method: 'POST', body: JSON.stringify({ score: selectedScore, comment }) });
        showToast('Avaliação enviada! ⭐', 'success');
        ratingCard.innerHTML = '<div style="text-align:center;padding:16px;color:var(--success);">⭐ Avaliação submetida, obrigado!</div>';
      } catch (e) { showToast(e.message, 'error'); }
    });
  }

  // Chat
  loadChat(trade.id);
  if (!['cancelled','completed'].includes(trade.status)) {
    clearInterval(chatInterval);
    chatInterval = setInterval(() => loadChat(trade.id), 5000);
    const sendBtn = document.getElementById('chat-send');
    const chatInput = document.getElementById('chat-input');
    if (sendBtn) {
      sendBtn.addEventListener('click', () => sendMessage(trade.id, chatInput));
      chatInput.addEventListener('keydown', e => { if (e.key === 'Enter') sendMessage(trade.id, chatInput); });
    }
  }
}

function renderTradeActions(trade, isProposer) {
  if (trade.status === 'pending' && !isProposer) {
    return `
      <button class="btn btn-success" data-action="accept">✅ Aceitar</button>
      <button class="btn btn-danger" data-action="reject">❌ Recusar</button>
    `;
  }
  if (trade.status === 'pending' && isProposer) {
    return `<button class="btn btn-ghost" data-action="cancel">Cancelar Proposta</button>`;
  }
  if (trade.status === 'accepted') {
    return `<button class="btn btn-primary" id="setup-shipping-btn">📦 Configurar Envio</button>`;
  }
  if (trade.status === 'in_transit' ) {
    return `<button class="btn btn-success" data-action="complete">✅ Marcar Recebido</button>`;
  }
  return '';
}

function setupTradeActions(trade, isProposer) {
  document.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const action = btn.dataset.action;
      try {
        await apiFetch(`/trades/${trade.id}/status`, { method: 'PATCH', body: JSON.stringify({ action }) });
        showToast('Estado atualizado!', 'success');
        const updated = await apiFetch(`/trades/${trade.id}`);
        if (updated) openTradeDetail(updated);
      } catch (e) { showToast(e.message, 'error'); }
    });
  });

  const shippingBtn = document.getElementById('setup-shipping-btn');
  if (shippingBtn) shippingBtn.addEventListener('click', () => openShippingModal(trade));
}

function renderShipping(trade, shipment, isProposer) {
  if (!shipment) return '';
  const states = ['label_created','picked_up','in_transit','delivered'];
  const currentIdx = states.indexOf(shipment.status);
  const labels = { label_created:'Etiqueta Criada', picked_up:'Recolhido', in_transit:'Em Trânsito', delivered:'Entregue' };
  return `
    <div class="card" style="margin-bottom:16px;">
      <div class="card-title" style="margin-bottom:12px;">📦 Envio ${shipment.carrier}</div>
      <div style="font-size:13px;color:var(--text-muted);margin-bottom:12px;">
        Tracking: <strong style="color:var(--gold);">${shipment.tracking_number}</strong>
        · Custo: <strong>€${shipment.cost_eur.toFixed(2)}</strong>
      </div>
      <div class="tracking-timeline">
        ${states.map((s, i) => `
          <div class="tracking-step ${i < currentIdx ? 'done' : i === currentIdx ? 'current' : ''}">
            <div class="tracking-dot"></div>
            <div class="tracking-step-label">${labels[s]}</div>
          </div>
        `).join('')}
      </div>
      ${shipment.status !== 'delivered' ? `
        <button class="btn btn-ghost btn-sm" style="margin-top:8px;" id="advance-tracking-btn">
          Avançar Estado (Demo)
        </button>
      ` : ''}
    </div>
  `;
}

function renderRating(trade) {
  return `
    <div class="card" id="rating-card">
      <div class="card-title" style="margin-bottom:12px;">⭐ Avaliar Troca</div>
      <div class="stars" id="rating-stars">
        ${[1,2,3,4,5].map(n => `<span class="star" data-score="${n}">★</span>`).join('')}
      </div>
      <textarea class="form-input" id="rating-comment" placeholder="Deixa um comentário (opcional)" style="margin-top:10px;resize:none;height:70px;"></textarea>
      <button class="btn btn-gold" style="margin-top:10px;width:100%;" id="submit-rating-btn">Enviar Avaliação</button>
    </div>
  `;
}

async function openShippingModal(trade) {
  const quotes = await apiFetch(`/trades/${trade.id}/shipping/quotes`);
  if (!quotes) return;

  let selectedCarrier = null;
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-header">
        <span class="modal-title">📦 Configurar Envio</span>
        <button class="modal-close">✕</button>
      </div>
      <p style="font-size:13px;color:var(--text-muted);margin-bottom:16px;">Escolhe a transportadora para esta troca:</p>
      ${quotes.map(q => `
        <div class="carrier-option" data-carrier="${q.carrier}">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <div class="carrier-name">${q.carrier}</div>
            <div class="carrier-price">€${q.cost_eur.toFixed(2)}</div>
          </div>
          <div class="carrier-meta">${q.description} · ${q.estimated_days}</div>
        </div>
      `).join('')}
      <button class="btn btn-primary" style="width:100%;margin-top:8px;" id="confirm-shipping-btn" disabled>
        Confirmar Envio
      </button>
    </div>
  `;
  document.body.appendChild(overlay);

  overlay.querySelector('.modal-close').addEventListener('click', () => overlay.remove());
  overlay.querySelectorAll('.carrier-option').forEach(opt => {
    opt.addEventListener('click', () => {
      overlay.querySelectorAll('.carrier-option').forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
      selectedCarrier = opt.dataset.carrier;
      overlay.querySelector('#confirm-shipping-btn').disabled = false;
    });
  });

  overlay.querySelector('#confirm-shipping-btn').addEventListener('click', async () => {
    try {
      const result = await apiFetch(`/trades/${trade.id}/shipping`, {
        method: 'POST',
        body: JSON.stringify({ carrier: selectedCarrier }),
      });
      overlay.remove();
      showToast(`Envio ${selectedCarrier} criado! Tracking: ${result.tracking_number}`, 'success');
      const updated = await apiFetch(`/trades/${trade.id}`);
      if (updated) openTradeDetail(updated);
    } catch (e) { showToast(e.message, 'error'); }
  });
}

async function loadChat(tradeId) {
  try {
    const messages = await apiFetch(`/trades/${tradeId}/messages?since=${lastChatTs}`);
    if (!messages || !messages.length) return;
    const user = getUser();
    const container = document.getElementById('chat-messages');
    if (!container) return;
    if (lastChatTs === 0) container.innerHTML = '';
    messages.forEach(m => {
      lastChatTs = Math.max(lastChatTs, m.created_at);
      const div = document.createElement('div');
      div.className = `message-bubble ${m.sender_id === user?.id ? 'mine' : 'theirs'}`;
      const bodyText = document.createTextNode(m.body);
      const meta = document.createElement('div');
      meta.className = 'message-meta';
      meta.textContent = `${m.sender_username} · ${new Date(m.created_at).toLocaleTimeString('pt-PT', {hour:'2-digit',minute:'2-digit'})}`;
      div.appendChild(bodyText);
      div.appendChild(meta);
      container.appendChild(div);
    });
    container.scrollTop = container.scrollHeight;
  } catch {}
}

async function sendMessage(tradeId, input) {
  const body = input.value.trim();
  if (!body) return;
  try {
    await apiFetch(`/trades/${tradeId}/messages`, { method: 'POST', body: JSON.stringify({ body }) });
    input.value = '';
    await loadChat(tradeId);
  } catch (e) { showToast(e.message, 'error'); }
}

async function showNewTradeModal() {
  const users = await apiFetch('/matches?limit=30');
  if (!users) return;

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-header">
        <span class="modal-title">➕ Nova Proposta de Troca</span>
        <button class="modal-close">✕</button>
      </div>
      <p style="font-size:13px;color:var(--text-muted);margin-bottom:12px;">Baseada nos teus matches automáticos:</p>
      <div style="max-height:300px;overflow-y:auto;">
        ${users.map(m => `
          <div class="trade-card" data-user-id="${m.user.id}" data-give='${JSON.stringify(m.stickers_i_give.slice(0,5))}' data-receive='${JSON.stringify(m.stickers_i_receive.slice(0,5))}'>
            <div style="font-weight:700;">${m.user.username} <span style="color:var(--text-muted);font-weight:400;">${m.user.location || ''}</span></div>
            <div style="font-size:12px;color:var(--text-muted);">Score: ${m.match_score} · Dás ${m.stickers_i_give.length} · Recebes ${m.stickers_i_receive.length}</div>
          </div>
        `).join('')}
      </div>
      ${!users.length ? '<div class="empty-state" style="padding:24px 0;"><div class="empty-icon">😔</div><p>Sem matches disponíveis. Vai ao catálogo marcar os teus cromos!</p></div>' : ''}
      <textarea class="form-input" id="trade-message" placeholder="Mensagem para o outro utilizador (opcional)" style="margin-top:12px;resize:none;height:70px;"></textarea>
      <button class="btn btn-primary" style="width:100%;margin-top:8px;" id="send-trade-btn" disabled>Enviar Proposta</button>
    </div>
  `;
  document.body.appendChild(overlay);

  overlay.querySelector('.modal-close').addEventListener('click', () => overlay.remove());

  let selected = null;
  overlay.querySelectorAll('.trade-card[data-user-id]').forEach(card => {
    card.addEventListener('click', () => {
      overlay.querySelectorAll('.trade-card[data-user-id]').forEach(c => c.style.borderColor = '');
      card.style.borderColor = 'var(--gold)';
      selected = card;
      overlay.querySelector('#send-trade-btn').disabled = false;
    });
  });

  overlay.querySelector('#send-trade-btn').addEventListener('click', async () => {
    if (!selected) return;
    const receiverId = selected.dataset.userId;
    const propStickers = JSON.parse(selected.dataset.give);
    const recvStickers = JSON.parse(selected.dataset.receive);
    const message = overlay.querySelector('#trade-message').value.trim();
    try {
      await apiFetch('/trades', {
        method: 'POST',
        body: JSON.stringify({ receiver_id: receiverId, proposer_stickers: propStickers, receiver_stickers: recvStickers, message }),
      });
      overlay.remove();
      showToast('Proposta enviada!', 'success');
      await render();
    } catch (e) { showToast(e.message, 'error'); }
  });
}
