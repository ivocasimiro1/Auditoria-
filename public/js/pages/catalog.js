import { apiFetch, showToast, TYPE_LABELS } from '../app.js';

// flagcdn.com country codes — free, no API key
const FLAG_CODES = {
  USA:'us', MEX:'mx', CAN:'ca', PAN:'pa', ENG:'gb-eng', ARG:'ar', NED:'nl', SEN:'sn',
  FRA:'fr', BRA:'br', BEL:'be', MAR:'ma', POR:'pt', ESP:'es', GER:'de', JPN:'jp',
  URU:'uy', COL:'co', KOR:'kr', CMR:'cm', CRO:'hr', AUS:'au', NGA:'ng', POL:'pl',
  ITA:'it', SUI:'ch', ECU:'ec', GHA:'gh', DEN:'dk', TUN:'tn', NZL:'nz', SAU:'sa',
  IRN:'ir', WAL:'gb-wls', CRC:'cr', SRB:'rs', EGY:'eg', SCO:'gb-sct', AUT:'at',
  TUR:'tr', QAT:'qa', HND:'hn', SVK:'sk', CMV:'cv', VEN:'ve',
  MEX2:'mx', MEX3:'mx', CMR2:'cm',
};

const TYPE_ICONS = { player:'⚽', badge:'🛡️', logo:'🏷️', special:'✨', stadium:'🏟️' };
const TYPE_LABEL_SHORT = { have_to_trade:'TROCA', need:'FALTA', have_double:'DUPLO' };

let allStickers = [];
let collection = {}; // stickerId → { status, custom_image_url }
let activeFilter = 'all';
let activeGroup = 'all';
let searchTerm = '';

export async function render() {
  const main = document.getElementById('main-content');
  main.innerHTML = '<div class="loading-center"><div class="spinner"></div></div>';

  const [stickers, col] = await Promise.all([
    apiFetch('/stickers'),
    apiFetch('/stickers/collection/me'),
  ]);

  allStickers = stickers || [];
  collection = {};
  if (col) col.forEach(s => {
    if (s.status) collection[s.id] = { status: s.status, custom_image_url: s.custom_image_url };
  });

  const groups = [...new Set(allStickers.map(s => s.group_name))].filter(g => g !== 'ESPECIAL').sort();

  main.innerHTML = `
    <div class="page">
      <div class="page-header">
        <h2>📚 Catálogo de Cromos</h2>
        <p>Clica num cromo para mudar o estado · Duplo clique para ver detalhe</p>
      </div>

      <div class="filter-bar">
        <input type="text" class="form-input" id="search-input"
          placeholder="🔍 Pesquisar jogador, equipa..." style="max-width:240px;flex:1;">
        <select class="form-input form-select" id="group-filter" style="max-width:160px;">
          <option value="all">Todos os Grupos</option>
          ${groups.map(g => `<option value="${g}">Grupo ${g}</option>`).join('')}
          <option value="ESPECIAL">Especiais</option>
        </select>
      </div>

      <div class="filter-bar" style="margin-top:-8px;">
        <button class="filter-btn active" data-f="all">Todos</button>
        <button class="filter-btn" data-f="need">❤️ Faltam</button>
        <button class="filter-btn" data-f="have_to_trade">🔄 Para Trocar</button>
        <button class="filter-btn" data-f="have_double">✌️ Duplos</button>
        <button class="filter-btn" data-f="none">⬜ Sem Estado</button>
      </div>

      <div style="font-size:12px;color:var(--text-muted);margin-bottom:16px;">
        💡 <strong>1 clique</strong> = muda estado &nbsp;|&nbsp;
        <strong>📷</strong> = adicionar foto do cromo real
      </div>

      <div id="catalog-content"></div>
    </div>
  `;

  document.querySelectorAll('.filter-btn[data-f]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn[data-f]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeFilter = btn.dataset.f;
      renderStickers();
    });
  });

  document.getElementById('group-filter').addEventListener('change', e => {
    activeGroup = e.target.value;
    renderStickers();
  });

  document.getElementById('search-input').addEventListener('input', e => {
    searchTerm = e.target.value.toLowerCase();
    renderStickers();
  });

  renderStickers();
}

function renderStickers() {
  let filtered = allStickers.filter(s => {
    if (activeFilter === 'none') return !collection[s.id];
    if (activeFilter !== 'all') return collection[s.id]?.status === activeFilter;
    return true;
  });
  if (activeGroup !== 'all') filtered = filtered.filter(s => s.group_name === activeGroup);
  if (searchTerm) filtered = filtered.filter(s =>
    s.player_name?.toLowerCase().includes(searchTerm) ||
    s.team_name?.toLowerCase().includes(searchTerm) ||
    s.id.toLowerCase().includes(searchTerm)
  );

  const byTeam = {};
  for (const s of filtered) {
    if (!byTeam[s.team_code]) byTeam[s.team_code] = { name: s.team_name, group: s.group_name, stickers: [] };
    byTeam[s.team_code].stickers.push(s);
  }

  const content = document.getElementById('catalog-content');
  if (!content) return;

  if (filtered.length === 0) {
    content.innerHTML = '<div class="empty-state"><div class="empty-icon">🔍</div><h3>Nenhum cromo encontrado</h3><p>Tenta outros filtros</p></div>';
    return;
  }

  content.innerHTML = Object.entries(byTeam).map(([code, team]) => {
    const have = team.stickers.filter(s => collection[s.id]?.status && collection[s.id]?.status !== 'need').length;
    const pct = Math.round((have / team.stickers.length) * 100);
    const flagCode = FLAG_CODES[code];
    const flagSrc = flagCode ? `https://flagcdn.com/w40/${flagCode}.png` : '';

    return `
      <div class="team-section">
        <div class="team-header">
          ${flagSrc
            ? `<img class="team-flag-img" src="${flagSrc}" alt="${team.name}" loading="lazy" onerror="this.style.display='none'">`
            : `<span style="font-size:22px;">🌐</span>`}
          <div>
            <div class="team-title">${team.name}</div>
            <div class="team-subtitle">Grupo ${team.group}</div>
          </div>
          <div class="team-count">
            ${have}/${team.stickers.length}
            <div class="team-progress-bar">
              <div class="team-progress-fill" style="width:${pct}%"></div>
            </div>
          </div>
        </div>
        <div class="sticker-grid">
          ${team.stickers.map(s => stickerCardHtml(s, code)).join('')}
        </div>
      </div>
    `;
  }).join('');

  attachListeners(content);
}

function stickerCardHtml(s, teamCode) {
  const entry = collection[s.id];
  const status = entry?.status;
  const customImg = entry?.custom_image_url;
  const flagCode = FLAG_CODES[teamCode] || FLAG_CODES[s.team_code];
  const flagSrc = flagCode ? `https://flagcdn.com/w80/${flagCode}.png` : '';

  let imgContent;
  if (customImg) {
    imgContent = `<img src="${customImg}" alt="${s.player_name || s.team_name}" loading="lazy" onerror="this.src='${flagSrc}'">`;
  } else if (s.card_type === 'player' && flagSrc) {
    imgContent = `<img src="${flagSrc}" alt="${s.team_name}" loading="lazy" onerror="this.style.display='none'"><span class="card-emoji" style="position:absolute;bottom:6px;right:6px;font-size:20px;z-index:3;">⚽</span>`;
  } else {
    const icons = { badge:'🛡️', logo:'🏷️', special:'✨', stadium:'🏟️', player:'⚽' };
    imgContent = `<span class="card-emoji">${icons[s.card_type] || '📄'}</span>`;
  }

  const teamColor = `var(--c-${teamCode}, var(--blue))`;

  return `
    <div class="sticker-card rarity-${s.rarity} ${customImg ? 'has-user-photo' : ''}"
         data-id="${s.id}" data-team="${teamCode}"
         style="--team-color:${teamColor};">
      <div class="card-band"></div>
      ${s.rarity !== 'common' ? `<div class="rarity-crown">${s.rarity === 'holographic' ? '💎' : '✨'}</div>` : ''}
      ${status ? `<div class="sticker-status-badge status-${status}">${TYPE_LABEL_SHORT[status] || status}</div>` : ''}
      <div class="sticker-img" style="position:relative;">
        ${imgContent}
      </div>
      <div class="sticker-info">
        <div class="sticker-number">#${String(s.number).padStart(3,'0')} · ${s.card_type.toUpperCase()}</div>
        <div class="sticker-name">${s.player_name || s.team_name}</div>
        <div class="sticker-team">${s.team_name}</div>
      </div>
      ${status && status !== 'need' ? `
        <div style="padding:0 6px 6px;z-index:5;position:relative;">
          <button class="btn btn-ghost btn-sm photo-btn" data-id="${s.id}"
            style="width:100%;font-size:10px;padding:4px;border-color:rgba(255,255,255,0.1);">
            📷 Foto Real
          </button>
        </div>
      ` : ''}
    </div>
  `;
}

function attachListeners(container) {
  container.querySelectorAll('.sticker-card[data-id]').forEach(card => {
    let clicks = 0;
    let timer;
    card.addEventListener('click', e => {
      if (e.target.closest('.photo-btn')) return;
      clicks++;
      if (clicks === 1) {
        timer = setTimeout(() => {
          clicks = 0;
          cycleStatus(card.dataset.id);
        }, 250);
      } else {
        clearTimeout(timer);
        clicks = 0;
        // double click — could show detail modal in future
        cycleStatus(card.dataset.id);
      }
    });
  });

  container.querySelectorAll('.photo-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      openPhotoModal(btn.dataset.id);
    });
  });
}

async function cycleStatus(stickerId) {
  const entry = collection[stickerId];
  const current = entry?.status;
  const cycle = [undefined, 'need', 'have_to_trade', 'have_double'];
  const idx = cycle.indexOf(current);
  const next = cycle[(idx + 1) % cycle.length];

  if (next) collection[stickerId] = { ...(collection[stickerId] || {}), status: next };
  else delete collection[stickerId];

  try {
    await apiFetch(`/stickers/collection/${stickerId}`, {
      method: 'PUT',
      body: JSON.stringify({ status: next || 'none' }),
    });
    refreshCard(stickerId);
  } catch (e) {
    showToast(e.message, 'error');
  }
}

function refreshCard(stickerId) {
  const sticker = allStickers.find(s => s.id === stickerId);
  if (!sticker) return;
  const old = document.querySelector(`.sticker-card[data-id="${stickerId}"]`);
  if (!old) return;
  const teamCode = old.dataset.team;
  old.outerHTML = stickerCardHtml(sticker, teamCode);
  const newCard = document.querySelector(`.sticker-card[data-id="${stickerId}"]`);
  if (newCard) {
    let clicks = 0, timer;
    newCard.addEventListener('click', e => {
      if (e.target.closest('.photo-btn')) return;
      clicks++;
      if (clicks === 1) { timer = setTimeout(() => { clicks = 0; cycleStatus(stickerId); }, 250); }
      else { clearTimeout(timer); clicks = 0; cycleStatus(stickerId); }
    });
    const photoBtn = newCard.querySelector('.photo-btn');
    if (photoBtn) photoBtn.addEventListener('click', e => { e.stopPropagation(); openPhotoModal(stickerId); });
  }
}

function openPhotoModal(stickerId) {
  const sticker = allStickers.find(s => s.id === stickerId);
  if (!sticker) return;

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal" style="max-width:400px;">
      <div class="modal-header">
        <span class="modal-title">📷 Foto do Cromo Real</span>
        <button class="modal-close">✕</button>
      </div>
      <p style="font-size:13px;color:var(--text-muted);margin-bottom:16px;">
        Tira uma foto ao teu cromo real e carrega aqui.<br>
        <strong>${sticker.player_name || sticker.team_name}</strong> #${sticker.number}
      </p>
      <div id="photo-preview" style="width:100%;aspect-ratio:3/4;background:var(--bg-card2);border-radius:8px;display:flex;align-items:center;justify-content:center;margin-bottom:12px;overflow:hidden;border:2px dashed var(--border);">
        <span style="color:var(--text-muted);font-size:13px;">Pré-visualização</span>
      </div>
      <input type="file" id="photo-input" accept="image/*" style="display:none;">
      <button class="btn btn-ghost" style="width:100%;margin-bottom:8px;" id="choose-photo-btn">
        📂 Escolher Foto
      </button>
      <button class="btn btn-gold" style="width:100%;" id="upload-photo-btn" disabled>
        ✅ Guardar Foto
      </button>
    </div>
  `;
  document.body.appendChild(overlay);

  let selectedFile = null;

  overlay.querySelector('.modal-close').addEventListener('click', () => overlay.remove());
  overlay.querySelector('#choose-photo-btn').addEventListener('click', () => {
    overlay.querySelector('#photo-input').click();
  });
  overlay.querySelector('#photo-input').addEventListener('change', e => {
    selectedFile = e.target.files[0];
    if (!selectedFile) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const preview = overlay.querySelector('#photo-preview');
      preview.innerHTML = `<img src="${ev.target.result}" style="width:100%;height:100%;object-fit:cover;">`;
      overlay.querySelector('#upload-photo-btn').disabled = false;
    };
    reader.readAsDataURL(selectedFile);
  });

  overlay.querySelector('#upload-photo-btn').addEventListener('click', async () => {
    if (!selectedFile) return;
    const btn = overlay.querySelector('#upload-photo-btn');
    btn.disabled = true; btn.textContent = 'A enviar...';
    try {
      const formData = new FormData();
      formData.append('image', selectedFile);
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/listings/sticker-photo/${stickerId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao enviar');
      collection[stickerId] = { ...(collection[stickerId] || {}), custom_image_url: data.image_url };
      overlay.remove();
      showToast('Foto guardada! 📸', 'success');
      refreshCard(stickerId);
    } catch (e) {
      showToast(e.message, 'error');
      btn.disabled = false; btn.textContent = '✅ Guardar Foto';
    }
  });
}
