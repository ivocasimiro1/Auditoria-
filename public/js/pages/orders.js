import { apiFetch, getUser, showToast } from '../app.js';

const FLAG_CODES = {
  USA:'us',MEX:'mx',CAN:'ca',PAN:'pa',ENG:'gb-eng',ARG:'ar',NED:'nl',SEN:'sn',
  FRA:'fr',BRA:'br',BEL:'be',MAR:'ma',POR:'pt',ESP:'es',GER:'de',JPN:'jp',
  URU:'uy',COL:'co',KOR:'kr',CMR:'cm',CRO:'hr',AUS:'au',NGA:'ng',POL:'pl',
  ITA:'it',SUI:'ch',ECU:'ec',GHA:'gh',DEN:'dk',TUN:'tn',NZL:'nz',SAU:'sa',
  IRN:'ir',WAL:'gb-wls',CRC:'cr',SRB:'rs',EGY:'eg',SCO:'gb-sct',AUT:'at',
  TUR:'tr',QAT:'qa',HND:'hn',SVK:'sk',CMV:'cv',VEN:'ve',ZAF:'za',CZE:'cz',
  BIH:'ba',HAI:'ht',PAR:'py',CUW:'cw',CIV:'ci',SWE:'se',IRQ:'iq',NOR:'no',
  ALG:'dz',JOR:'jo',COD:'cd',UZB:'uz',
};

const STATUS_LABEL = {
  pending_payment: '⏳ Aguarda Pagamento',
  paid: '✅ Pago — Aguarda Envio',
  shipped: '📦 Enviado',
  completed: '🏆 Concluído',
  cancelled: '❌ Cancelado',
};

const STATUS_COLOR = {
  pending_payment: 'var(--text-muted)',
  paid: 'var(--gold)',
  shipped: 'var(--blue)',
  completed: 'var(--green)',
  cancelled: 'var(--red)',
};

export async function render() {
  const main = document.getElementById('main-content');
  main.innerHTML = '<div class="loading-center"><div class="spinner"></div></div>';

  const hash = window.location.hash;
  const paidOrderId = new URLSearchParams(hash.split('?')[1] || '').get('paid');

  if (paidOrderId) {
    await verifyPayment(paidOrderId);
    window.location.hash = '/orders';
    return;
  }

  const orders = await apiFetch('/orders/me');
  if (!orders) return;

  const user = getUser();

  main.innerHTML = `
    <div class="page">
      <div class="page-header">
        <h2>📦 As Minhas Encomendas</h2>
        <p>Acompanha as tuas compras e vendas</p>
      </div>
      <div id="orders-list"></div>
    </div>
  `;

  renderOrders(orders, user);
}

async function verifyPayment(orderId) {
  try {
    const order = await apiFetch(`/orders/${orderId}/verify`, { method: 'POST', body: '{}' });
    if (order && order.status === 'paid') {
      showToast('Pagamento confirmado! O vendedor será notificado para enviar.', 'success');
    }
  } catch (e) {
    console.error('Verify payment error:', e);
  }
}

function renderOrders(orders, user) {
  const list = document.getElementById('orders-list');
  if (!list) return;

  if (!orders.length) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📦</div>
        <h3>Sem encomendas ainda</h3>
        <p>As tuas compras e vendas aparecerão aqui.</p>
        <button class="btn btn-gold" style="margin-top:16px;" onclick="window.location.hash='/listings'">
          Ver Anúncios
        </button>
      </div>`;
    return;
  }

  list.innerHTML = orders.map(o => orderCardHtml(o, user)).join('');

  orders.forEach(o => {
    const shipBtn = document.getElementById(`ship-${o.id}`);
    if (shipBtn) shipBtn.addEventListener('click', () => openShipModal(o));

    const confirmBtn = document.getElementById(`confirm-${o.id}`);
    if (confirmBtn) confirmBtn.addEventListener('click', () => confirmReceipt(o.id));
  });
}

function orderCardHtml(o, user) {
  const isBuyer = o.buyer_id === user?.id;
  const flagCode = FLAG_CODES[o.team_code];
  const flagSrc = flagCode ? `https://flagcdn.com/w40/${flagCode}.png` : '';
  const role = isBuyer ? '🛒 Compra' : '💶 Venda';
  const otherUser = isBuyer ? o.seller_username : o.buyer_username;

  let actionHtml = '';
  if (!isBuyer && o.status === 'paid') {
    actionHtml = `<button class="btn btn-primary" style="margin-top:12px;width:100%;" id="ship-${o.id}">📦 Marcar como Enviado</button>`;
  }
  if (isBuyer && o.status === 'shipped') {
    actionHtml = `<button class="btn btn-gold" style="margin-top:12px;width:100%;" id="confirm-${o.id}">✅ Confirmar Receção</button>`;
  }

  return `
    <div class="card" style="margin-bottom:12px;">
      <div style="display:flex;gap:16px;align-items:flex-start;">
        <div style="width:56px;height:56px;background:var(--bg3);border-radius:8px;overflow:hidden;flex-shrink:0;display:flex;align-items:center;justify-content:center;">
          ${o.listing_image
            ? `<img src="${o.listing_image}" style="width:100%;height:100%;object-fit:cover;">`
            : (flagSrc ? `<img src="${flagSrc}" style="max-width:90%;object-fit:contain;">` : '<span style="font-size:24px;">⚽</span>')}
        </div>
        <div style="flex:1;min-width:0;">
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px;">
            <span style="font-size:12px;color:var(--text-muted);">${role}</span>
            <span style="font-size:12px;color:${STATUS_COLOR[o.status] || 'var(--text-muted)'};">${STATUS_LABEL[o.status] || o.status}</span>
          </div>
          <div style="font-weight:700;font-size:15px;margin-bottom:2px;">${o.player_name || o.team_name}</div>
          <div style="font-size:12px;color:var(--text-muted);">${o.team_name} · #${String(o.number).padStart(3,'0')}</div>
          <div style="font-size:13px;margin-top:6px;">
            <span style="font-weight:700;color:var(--gold);">€${parseFloat(o.amount_eur).toFixed(2)}</span>
            <span style="color:var(--text-muted);margin-left:8px;">com ${isBuyer ? 'vendedor' : 'comprador'}: <strong>${otherUser}</strong></span>
          </div>
          ${o.tracking_info ? `<div style="font-size:12px;color:var(--text-muted);margin-top:4px;">📮 Tracking: ${o.tracking_info}</div>` : ''}
          ${actionHtml}
        </div>
      </div>
    </div>
  `;
}

function openShipModal(order) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal" style="max-width:420px;">
      <div class="modal-header">
        <span class="modal-title">📦 Marcar como Enviado</span>
        <button class="modal-close">✕</button>
      </div>
      <p style="color:var(--text-muted);margin-bottom:16px;font-size:14px;">
        Confirma que enviaste o cromo <strong>${order.player_name || order.team_name}</strong> ao comprador <strong>${order.buyer_username}</strong>.
      </p>
      <div class="form-group">
        <label class="form-label">Número de Tracking <span style="color:var(--text-muted)">(opcional)</span></label>
        <input type="text" class="form-input" id="tracking-input" placeholder="Ex: CT123456789PT">
      </div>
      <button class="btn btn-primary" style="width:100%;" id="confirm-ship-btn">Confirmar Envio</button>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.querySelector('.modal-close').addEventListener('click', () => overlay.remove());

  document.getElementById('confirm-ship-btn').addEventListener('click', async () => {
    const tracking_info = document.getElementById('tracking-input').value.trim();
    const btn = document.getElementById('confirm-ship-btn');
    btn.disabled = true; btn.textContent = 'A guardar...';
    try {
      await apiFetch(`/orders/${order.id}/ship`, { method: 'POST', body: JSON.stringify({ tracking_info }) });
      overlay.remove();
      showToast('Marcado como enviado! O comprador será notificado.', 'success');
      await render();
    } catch (e) {
      showToast(e.message, 'error');
      btn.disabled = false; btn.textContent = 'Confirmar Envio';
    }
  });
}

async function confirmReceipt(orderId) {
  if (!confirm('Confirmas que recebeste o cromo em boas condições?')) return;
  try {
    await apiFetch(`/orders/${orderId}/confirm`, { method: 'POST', body: '{}' });
    showToast('Receção confirmada! A venda está concluída.', 'success');
    await render();
  } catch (e) {
    showToast(e.message, 'error');
  }
}
