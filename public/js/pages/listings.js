import { apiFetch, getUser, showToast } from '../app.js';

const FLAG_CODES = {
  USA:'us',MEX:'mx',CAN:'ca',PAN:'pa',ENG:'gb-eng',ARG:'ar',NED:'nl',SEN:'sn',
  FRA:'fr',BRA:'br',BEL:'be',MAR:'ma',POR:'pt',ESP:'es',GER:'de',JPN:'jp',
  URU:'uy',COL:'co',KOR:'kr',CMR:'cm',CRO:'hr',AUS:'au',NGA:'ng',POL:'pl',
  ITA:'it',SUI:'ch',ECU:'ec',GHA:'gh',DEN:'dk',TUN:'tn',NZL:'nz',SAU:'sa',
  IRN:'ir',WAL:'gb-wls',CRC:'cr',SRB:'rs',EGY:'eg',SCO:'gb-sct',AUT:'at',
  TUR:'tr',QAT:'qa',HND:'hn',SVK:'sk',CMV:'cv',VEN:'ve',MEX2:'mx',MEX3:'mx',CMR2:'cm',
};

const TYPE_LABEL = { trade:'🔄 Troca', sell:'💶 Venda', gift:'🎁 Oferta' };
const TYPE_CLASS = { trade:'listing-type-trade', sell:'listing-type-sell', gift:'listing-type-gift' };

export async function render() {
  const main = document.getElementById('main-content');
  main.innerHTML = '<div class="loading-center"><div class="spinner"></div></div>';

  const listings = await apiFetch('/listings');
  if (!listings) return;

  main.innerHTML = `
    <div class="page">
      <div class="page-header" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
        <div>
          <h2>🏪 Anúncios de Cromos</h2>
          <p>Vê, troca ou compra cromos de outros colecionadores</p>
        </div>
        <button class="btn btn-gold" id="new-listing-btn">+ Anunciar Cromo</button>
      </div>

      <div class="filter-bar">
        <input type="text" class="form-input" id="search-listings"
          placeholder="🔍 Pesquisar..." style="max-width:200px;flex:1;">
        <select class="form-input form-select" id="type-filter" style="max-width:140px;">
          <option value="">Todos os tipos</option>
          <option value="trade">🔄 Troca</option>
          <option value="sell">💶 Venda</option>
          <option value="gift">🎁 Oferta</option>
        </select>
        <input type="text" class="form-input" id="location-filter"
          placeholder="📍 Localização" style="max-width:140px;">
      </div>

      <div id="listings-grid"></div>
    </div>
  `;

  renderGrid(listings);

  document.getElementById('search-listings').addEventListener('input', async (e) => {
    await reloadListings();
  });
  document.getElementById('type-filter').addEventListener('change', reloadListings);
  document.getElementById('location-filter').addEventListener('input', reloadListings);
  document.getElementById('new-listing-btn').addEventListener('click', openNewListingModal);
}

async function reloadListings() {
  const search = document.getElementById('search-listings')?.value || '';
  const type = document.getElementById('type-filter')?.value || '';
  const location = document.getElementById('location-filter')?.value || '';
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (type) params.set('type', type);
  if (location) params.set('location', location);
  const data = await apiFetch(`/listings?${params}`);
  if (data) renderGrid(data);
}

function renderGrid(listings) {
  const grid = document.getElementById('listings-grid');
  if (!grid) return;

  if (!listings.length) {
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🏪</div>
        <h3>Sem anúncios ainda</h3>
        <p>Sê o primeiro a anunciar um cromo!</p>
        <button class="btn btn-gold" style="margin-top:16px;" id="new-listing-btn2">
          + Anunciar Cromo
        </button>
      </div>`;
    document.getElementById('new-listing-btn2')?.addEventListener('click', openNewListingModal);
    return;
  }

  grid.innerHTML = `<div class="listing-grid">${listings.map(l => listingCardHtml(l)).join('')}</div>`;

  grid.querySelectorAll('.listing-card[data-id]').forEach(card => {
    card.addEventListener('click', () => openListingDetail(card.dataset.id, listings));
  });
}

function listingCardHtml(l) {
  const flagCode = FLAG_CODES[l.team_code];
  const flagSrc = flagCode ? `https://flagcdn.com/w80/${flagCode}.png` : '';

  const imgHtml = l.image_url
    ? `<img src="${l.image_url}" alt="${l.player_name || l.team_name}" loading="lazy">`
    : (flagSrc
        ? `<img src="${flagSrc}" alt="${l.team_name}" loading="lazy" style="max-width:80%;max-height:80%;object-fit:contain;">`
        : `<span style="font-size:48px;">⚽</span>`);

  const price = l.type === 'sell' && l.price_eur
    ? `<div class="listing-price">€${parseFloat(l.price_eur).toFixed(2)}</div>`
    : `<div class="listing-price ${TYPE_CLASS[l.type]}">${TYPE_LABEL[l.type]}</div>`;

  return `
    <div class="listing-card" data-id="${l.id}">
      <div class="listing-img" style="display:flex;align-items:center;justify-content:center;overflow:hidden;">
        ${imgHtml}
      </div>
      <div class="listing-info">
        <div class="listing-title">${l.player_name || l.team_name}</div>
        <div class="listing-meta">
          ${l.team_name} · #${String(l.number).padStart(3,'0')}
        </div>
        <div class="listing-meta" style="margin-top:3px;">
          👤 ${l.username}${l.user_location ? ` · 📍 ${l.user_location}` : ''}
        </div>
        ${price}
        ${l.description ? `<div style="font-size:11px;color:var(--text-muted);margin-top:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${l.description}</div>` : ''}
      </div>
    </div>
  `;
}

async function openListingDetail(id, listings) {
  const l = listings.find(x => x.id === id) || await apiFetch(`/listings/${id}`);
  if (!l) return;
  const user = getUser();
  const isOwn = l.user_id === user?.id;
  const flagCode = FLAG_CODES[l.team_code];
  const flagSrc = flagCode ? `https://flagcdn.com/w80/${flagCode}.png` : '';

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal" style="max-width:520px;">
      <div class="modal-header">
        <span class="modal-title">${l.player_name || l.team_name}</span>
        <button class="modal-close">✕</button>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">
        <div style="background:var(--bg-card2);border-radius:8px;overflow:hidden;aspect-ratio:3/4;display:flex;align-items:center;justify-content:center;">
          ${l.image_url
            ? `<img src="${l.image_url}" style="width:100%;height:100%;object-fit:cover;">`
            : (flagSrc ? `<img src="${flagSrc}" style="max-width:80%;max-height:80%;object-fit:contain;">` : `<span style="font-size:64px;">⚽</span>`)}
        </div>
        <div>
          <div style="font-size:20px;font-weight:800;margin-bottom:4px;">${l.player_name || l.team_name}</div>
          <div style="color:var(--text-muted);font-size:13px;">${l.team_name} · Cromo #${String(l.number).padStart(3,'0')}</div>
          <div style="margin:12px 0;">
            <span class="badge ${l.rarity === 'holographic' ? 'badge-gold' : l.rarity === 'foil' ? 'badge-gray' : 'badge-gray'}" style="margin-bottom:6px;">
              ${l.rarity === 'holographic' ? '💎 Holográfico' : l.rarity === 'foil' ? '✨ Foil' : '📄 Comum'}
            </span>
          </div>
          <div style="font-size:22px;font-weight:800;color:var(--gold);margin-bottom:8px;">
            ${l.type === 'sell' && l.price_eur ? `€${parseFloat(l.price_eur).toFixed(2)}` : TYPE_LABEL[l.type]}
          </div>
          ${l.description ? `<div style="font-size:13px;color:var(--text-muted);font-style:italic;">"${l.description}"</div>` : ''}
          <div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--border);">
            <div style="font-size:13px;font-weight:600;">👤 ${l.username}</div>
            ${l.user_location ? `<div style="font-size:12px;color:var(--text-muted);">📍 ${l.user_location}</div>` : ''}
          </div>
        </div>
      </div>

      ${!isOwn ? `
        <button class="btn btn-primary" style="width:100%;margin-bottom:8px;" id="contact-btn">
          💬 Contactar Vendedor
        </button>
      ` : `
        <button class="btn btn-danger" style="width:100%;" id="close-listing-btn">
          🗑️ Fechar Anúncio
        </button>
      `}
    </div>
  `;
  document.body.appendChild(overlay);

  overlay.querySelector('.modal-close').addEventListener('click', () => overlay.remove());

  const contactBtn = document.getElementById('contact-btn');
  if (contactBtn) {
    contactBtn.addEventListener('click', () => {
      overlay.remove();
      // Navigate to trades page to create a proposal
      window._proposeUserId = l.user_id;
      window.location.hash = '/trades';
      showToast(`Vai para Trocas e propõe uma troca a ${l.username}`, 'info');
    });
  }

  const closeBtn = document.getElementById('close-listing-btn');
  if (closeBtn) {
    closeBtn.addEventListener('click', async () => {
      try {
        await apiFetch(`/listings/${l.id}/close`, { method: 'PATCH' });
        overlay.remove();
        showToast('Anúncio fechado', 'success');
        await render();
      } catch (e) { showToast(e.message, 'error'); }
    });
  }
}

async function openNewListingModal() {
  const stickers = await apiFetch('/stickers/collection/me');
  const myStickers = (stickers || []).filter(s => s.status === 'have_to_trade' || s.status === 'have_double');

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal" style="max-width:480px;">
      <div class="modal-header">
        <span class="modal-title">📢 Novo Anúncio</span>
        <button class="modal-close">✕</button>
      </div>

      ${!myStickers.length ? `
        <div class="empty-state" style="padding:24px 0;">
          <div class="empty-icon">😔</div>
          <p>Marca primeiro alguns cromos como "Para Trocar" no catálogo!</p>
          <button class="btn btn-primary" style="margin-top:12px;" onclick="this.closest('.modal-overlay').remove();window.location.hash='/catalog'">
            Ir ao Catálogo
          </button>
        </div>
      ` : `
        <div class="form-group">
          <label class="form-label">Cromo</label>
          <select class="form-input form-select" id="lst-sticker">
            <option value="">-- Escolhe um cromo --</option>
            ${myStickers.map(s => `<option value="${s.id}">#${String(s.number).padStart(3,'0')} ${s.player_name || s.team_name} (${s.team_name})</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Tipo de Anúncio</label>
          <select class="form-input form-select" id="lst-type">
            <option value="trade">🔄 Troca</option>
            <option value="sell">💶 Venda</option>
            <option value="gift">🎁 Oferta Grátis</option>
          </select>
        </div>
        <div class="form-group" id="price-group" style="display:none;">
          <label class="form-label">Preço (€)</label>
          <input type="number" class="form-input" id="lst-price" placeholder="Ex: 2.50" min="0" step="0.50">
        </div>
        <div class="form-group">
          <label class="form-label">Descrição <span style="color:var(--text-muted)">(opcional)</span></label>
          <textarea class="form-input" id="lst-desc" placeholder="Estado do cromo, condições de troca..." style="resize:none;height:70px;"></textarea>
        </div>
        <div class="form-group">
          <label class="form-label">Foto do Cromo <span style="color:var(--text-muted)">(opcional mas recomendado)</span></label>
          <div id="lst-photo-preview" style="width:100%;height:120px;background:var(--bg-card2);border-radius:8px;display:flex;align-items:center;justify-content:center;margin-bottom:8px;overflow:hidden;border:2px dashed var(--border);cursor:pointer;">
            <span style="color:var(--text-muted);font-size:13px;">📷 Clica para adicionar foto</span>
          </div>
          <input type="file" id="lst-photo" accept="image/*" style="display:none;">
        </div>
        <button class="btn btn-gold" style="width:100%;" id="submit-listing-btn">
          📢 Publicar Anúncio
        </button>
      `}
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.querySelector('.modal-close').addEventListener('click', () => overlay.remove());

  if (!myStickers.length) return;

  // Show/hide price field
  document.getElementById('lst-type').addEventListener('change', e => {
    document.getElementById('price-group').style.display = e.target.value === 'sell' ? 'block' : 'none';
  });

  // Photo preview
  let photoFile = null;
  const photoPreview = document.getElementById('lst-photo-preview');
  const photoInput = document.getElementById('lst-photo');
  photoPreview.addEventListener('click', () => photoInput.click());
  photoInput.addEventListener('change', e => {
    photoFile = e.target.files[0];
    if (!photoFile) return;
    const reader = new FileReader();
    reader.onload = ev => {
      photoPreview.innerHTML = `<img src="${ev.target.result}" style="width:100%;height:100%;object-fit:cover;">`;
    };
    reader.readAsDataURL(photoFile);
  });

  // Submit
  document.getElementById('submit-listing-btn').addEventListener('click', async () => {
    const sticker_id = document.getElementById('lst-sticker').value;
    const type = document.getElementById('lst-type').value;
    const price_eur = document.getElementById('lst-price')?.value || '';
    const description = document.getElementById('lst-desc').value.trim();
    const btn = document.getElementById('submit-listing-btn');

    if (!sticker_id) { showToast('Escolhe um cromo', 'error'); return; }

    btn.disabled = true; btn.textContent = 'A publicar...';

    try {
      const formData = new FormData();
      formData.append('sticker_id', sticker_id);
      formData.append('type', type);
      if (price_eur) formData.append('price_eur', price_eur);
      if (description) formData.append('description', description);
      if (photoFile) formData.append('image', photoFile);

      const token = localStorage.getItem('token');
      const res = await fetch('/api/listings', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao publicar');

      overlay.remove();
      showToast('Anúncio publicado! 🎉', 'success');
      await render();
    } catch (e) {
      showToast(e.message, 'error');
      btn.disabled = false; btn.textContent = '📢 Publicar Anúncio';
    }
  });
}
