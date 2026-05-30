import { apiFetch, getUser, showToast, TYPE_LABELS } from '../app.js';

// flagcdn.com country codes — free, no API key
const FLAG_CODES = {
  // Group A
  MEX:'mx', ZAF:'za', RSA:'za', KOR:'kr', CZE:'cz',
  // Group B
  CAN:'ca', BIH:'ba', QAT:'qa', SUI:'ch',
  // Group C
  BRA:'br', MAR:'ma', HAI:'ht', SCO:'gb-sct',
  // Group D
  USA:'us', PAR:'py', AUS:'au', TUR:'tr',
  // Group E
  GER:'de', CUW:'cw', CIV:'ci', ECU:'ec',
  // Group F
  NED:'nl', JPN:'jp', SWE:'se', TUN:'tn',
  // Group G
  BEL:'be', EGY:'eg', IRN:'ir', NZL:'nz',
  // Group H
  ESP:'es', CMV:'cv', SAU:'sa', URU:'uy',
  // Group I
  FRA:'fr', SEN:'sn', IRQ:'iq', NOR:'no',
  // Group J
  ARG:'ar', ALG:'dz', AUT:'at', JOR:'jo',
  // Group K
  POR:'pt', COD:'cd', UZB:'uz', COL:'co',
  // Group L
  ENG:'gb-eng', CRO:'hr', GHA:'gh', PAN:'pa',
  // Legacy / kept for compatibility
  CMR:'cm', NGA:'ng', POL:'pl', ITA:'it', DEN:'dk', WAL:'gb-wls', CRC:'cr',
  SRB:'rs', HND:'hn', SVK:'sk', VEN:'ve',
};

const TYPE_ICONS = { player:'⚽', badge:'🛡️', logo:'🏷️', special:'✨', stadium:'🏟️' };
const TYPE_LABEL_SHORT = { have_to_trade:'TROCA', need:'FALTA', have_double:'TENHO' };

let allStickers = [];
let collection = {}; // stickerId → { status, custom_image_url }
let activeFilter = 'all';
let activeGroup = 'all';
let searchTerm = '';
let isAdmin = false;

export async function render() {
  const main = document.getElementById('main-content');
  main.innerHTML = '<div class="loading-center"><div class="spinner"></div></div>';

  // Read URL params: /catalog?team=POR or /catalog?group=K
  const hash = window.location.hash.slice(1);
  const qIdx = hash.indexOf('?');
  const params = qIdx >= 0 ? new URLSearchParams(hash.slice(qIdx + 1)) : new URLSearchParams();
  const teamParam = params.get('team') || '';
  const groupParam = params.get('group') || '';

  const [stickers, col] = await Promise.all([
    apiFetch('/stickers'),
    apiFetch('/stickers/collection/me'),
  ]);

  allStickers = stickers || [];
  collection = {};
  if (col) col.forEach(s => {
    if (s.status) collection[s.id] = { status: s.status, custom_image_url: s.custom_image_url };
  });
  isAdmin = getUser()?.is_admin === true;

  // Apply incoming filters from collection page
  activeFilter = 'all';
  searchTerm = '';
  if (teamParam) {
    searchTerm = ''; // will scroll instead
    activeGroup = 'all';
  } else if (groupParam) {
    activeGroup = groupParam;
  } else {
    activeGroup = 'all';
  }

  const groups = [...new Set(allStickers.map(s => s.group_name))].filter(g => g !== 'ESPECIAL').sort();

  // Find team name for breadcrumb
  const teamName = teamParam
    ? allStickers.find(s => s.team_code === teamParam)?.team_name || teamParam
    : '';

  main.innerHTML = `
    <div class="page">
      <div class="page-header">
        ${teamParam ? `
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
            <button onclick="window.location.hash='/collection'" class="btn btn-ghost btn-sm" style="font-size:12px;padding:4px 10px;">← Colecção</button>
          </div>
          <h2>📚 ${teamName}</h2>
          <p>Clica num cromo para mudar o estado</p>
        ` : `
          <h2>📚 Catálogo de Cromos</h2>
          <p>Clica num cromo para mudar o estado · Duplo clique para ver detalhe</p>
        `}
      </div>

      <div class="filter-bar">
        <input type="text" class="form-input" id="search-input"
          placeholder="🔍 Pesquisar jogador, equipa..." style="max-width:240px;flex:1;"
          value="${teamName ? '' : ''}">
        <select class="form-input form-select" id="group-filter" style="max-width:160px;">
          <option value="all">Todos os Grupos</option>
          ${groups.map(g => `<option value="${g}" ${groupParam === g ? 'selected' : ''}>Grupo ${g}</option>`).join('')}
          <option value="ESPECIAL">Especiais</option>
        </select>
      </div>

      <div class="filter-bar" style="margin-top:-8px;">
        <button class="filter-btn active" data-f="all">Todos</button>
        <button class="filter-btn" data-f="have_double">✅ Tenho</button>
        <button class="filter-btn" data-f="have_to_trade">🔄 Para Trocar</button>
        <button class="filter-btn" data-f="none">❤️ Em Falta</button>
      </div>

      <div style="font-size:12px;color:var(--text-muted);margin-bottom:16px;">
        💡 <strong>1 clique</strong>: Em falta → Tenho → Para Trocar &nbsp;|&nbsp;
        <strong>📷</strong> = foto do cromo real
      </div>

      <div id="catalog-content"></div>
    </div>
  `;

  document.querySelectorAll('.filter-btn[data-f]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn[data-f]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeFilter = btn.dataset.f;
      renderStickers(teamParam);
    });
  });

  document.getElementById('group-filter').addEventListener('change', e => {
    activeGroup = e.target.value;
    renderStickers(teamParam);
  });

  document.getElementById('search-input').addEventListener('input', e => {
    searchTerm = e.target.value.toLowerCase();
    renderStickers(teamParam);
  });

  renderStickers(teamParam);

  // Scroll to team section if requested
  if (teamParam) {
    requestAnimationFrame(() => {
      const el = document.querySelector(`.team-section[data-team="${teamParam}"]`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }
}

function renderStickers(teamFilter = '') {
  let filtered = allStickers.filter(s => {
    if (activeFilter === 'none') return !collection[s.id] || collection[s.id]?.status === 'need';
    if (activeFilter !== 'all') return collection[s.id]?.status === activeFilter;
    return true;
  });
  if (teamFilter) filtered = filtered.filter(s => s.team_code === teamFilter);
  else if (activeGroup !== 'all') filtered = filtered.filter(s => s.group_name === activeGroup);
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
      <div class="team-section" data-team="${code}">
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
  const flagSrc = flagCode ? `https://flagcdn.com/w160/${flagCode}.png` : '';
  const teamColor = `var(--c-${teamCode}, var(--blue))`;
  const displayStatus = status || 'need'; // default = em falta
  const missingStyle = !status ? 'opacity:0.65;' : '';

  // Build card image area
  let cardArt;
  if (customImg) {
    // User uploaded their real sticker photo — show it full-bleed
    cardArt = `
      <div class="card-art card-art-photo">
        <img src="${customImg}" alt="${s.player_name || s.team_name}" loading="lazy"
          onerror="this.parentNode.innerHTML='<span class=\\'card-art-fallback\\'>📷</span>'">
      </div>`;
  } else if (s.card_type === 'player' && flagSrc) {
    // Panini-style: flag fills the card art area with team colour gradient
    cardArt = `
      <div class="card-art card-art-flag" style="--flag-url:url('${flagSrc}')">
        <div class="card-art-flag-bg"></div>
        <div class="card-art-flag-overlay" style="background:linear-gradient(180deg,transparent 20%,rgba(0,0,0,0.7) 100%)"></div>
        <div class="card-art-position">⚽</div>
        <div class="card-art-num">#${String(s.number).padStart(3,'0')}</div>
      </div>`;
  } else if (s.card_type === 'badge' && flagSrc) {
    cardArt = `
      <div class="card-art card-art-badge" style="--flag-url:url('${flagSrc}')">
        <div class="card-art-flag-bg"></div>
        <div class="card-art-flag-overlay" style="background:rgba(0,0,0,0.4)"></div>
        <div class="card-art-position">🛡️</div>
      </div>`;
  } else {
    const icons = { badge:'🛡️', logo:'🏷️', special:'✨', stadium:'🏟️', player:'⚽' };
    cardArt = `<div class="card-art card-art-plain"><span class="card-art-icon">${icons[s.card_type] || '📄'}</span></div>`;
  }

  return `
    <div class="sticker-card rarity-${s.rarity} ${customImg ? 'has-user-photo' : ''} ${!status ? 'sticker-missing' : ''}"
         data-id="${s.id}" data-team="${teamCode}"
         style="--team-color:${teamColor};${missingStyle}">
      <div class="card-band"></div>
      ${s.rarity !== 'common' ? `<div class="rarity-crown">${s.rarity === 'holographic' ? '💎' : '✨'}</div>` : ''}
      <div class="sticker-status-badge status-${displayStatus}">${displayStatus === 'need' ? 'FALTA' : (TYPE_LABEL_SHORT[displayStatus] || displayStatus)}</div>
      ${cardArt}
      <div class="sticker-info">
        <div class="sticker-name">${s.player_name || s.team_name}</div>
        <div class="sticker-team">${s.team_name} · ${s.card_type === 'player' ? 'JOG' : s.card_type.toUpperCase()}</div>
      </div>
      ${(status && status !== 'need') ? `
        <div style="padding:0 6px 6px;z-index:5;position:relative;">
          <button class="btn btn-ghost btn-sm photo-btn" data-id="${s.id}"
            style="width:100%;font-size:10px;padding:4px;border-color:rgba(255,255,255,0.1);">
            📷 ${customImg ? 'Alterar Foto' : 'Foto Real'}
          </button>
        </div>
      ` : ''}
      ${isAdmin ? `
        <div style="padding:0 6px 6px;z-index:5;position:relative;">
          <button class="btn btn-ghost btn-sm edit-name-btn" data-id="${s.id}" data-name="${(s.player_name || '').replace(/"/g, '&quot;')}"
            style="width:100%;font-size:10px;padding:4px;border-color:rgba(255,165,0,0.3);color:var(--gold);">
            ✏️ Editar Nome
          </button>
        </div>
      ` : ''}
      <div style="padding:0 6px 6px;z-index:5;position:relative;">
        <button class="btn btn-ghost btn-sm report-btn" data-id="${s.id}" data-name="${(s.player_name || '').replace(/"/g, '&quot;')}"
          style="width:100%;font-size:9px;padding:3px;border-color:rgba(255,255,255,0.06);color:rgba(255,255,255,0.3);">
          🚩 Reportar Nome
        </button>
      </div>
    </div>
  `;
}

function attachListeners(container) {
  container.querySelectorAll('.sticker-card[data-id]').forEach(card => {
    let clicks = 0;
    let timer;
    card.addEventListener('click', e => {
      if (e.target.closest('.photo-btn') || e.target.closest('.edit-name-btn') || e.target.closest('.report-btn')) return;
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

  container.querySelectorAll('.edit-name-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      openEditNameModal(btn.dataset.id, btn.dataset.name);
    });
  });

  container.querySelectorAll('.report-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      openReportModal(btn.dataset.id, btn.dataset.name);
    });
  });
}

async function cycleStatus(stickerId) {
  const entry = collection[stickerId];
  const current = entry?.status;
  const cycle = [undefined, 'have_double', 'have_to_trade'];
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
      if (e.target.closest('.photo-btn') || e.target.closest('.edit-name-btn') || e.target.closest('.report-btn')) return;
      clicks++;
      if (clicks === 1) { timer = setTimeout(() => { clicks = 0; cycleStatus(stickerId); }, 250); }
      else { clearTimeout(timer); clicks = 0; cycleStatus(stickerId); }
    });
    const photoBtn = newCard.querySelector('.photo-btn');
    if (photoBtn) photoBtn.addEventListener('click', e => { e.stopPropagation(); openPhotoModal(stickerId); });
    const editBtn = newCard.querySelector('.edit-name-btn');
    if (editBtn) editBtn.addEventListener('click', e => { e.stopPropagation(); openEditNameModal(editBtn.dataset.id, editBtn.dataset.name); });
    const reportBtn = newCard.querySelector('.report-btn');
    if (reportBtn) reportBtn.addEventListener('click', e => { e.stopPropagation(); openReportModal(reportBtn.dataset.id, reportBtn.dataset.name); });
  }
}

function openEditNameModal(stickerId, currentName) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal" style="max-width:380px;">
      <div class="modal-header">
        <span class="modal-title">✏️ Corrigir Nome do Jogador</span>
        <button class="modal-close">✕</button>
      </div>
      <div class="form-group">
        <label class="form-label">Nome do Jogador</label>
        <input type="text" class="form-input" id="edit-name-input" value="${currentName}" placeholder="Nome completo">
      </div>
      <button class="btn btn-gold" style="width:100%;" id="save-name-btn">💾 Guardar</button>
    </div>
  `;
  document.body.appendChild(overlay);
  const input = overlay.querySelector('#edit-name-input');
  input.focus(); input.select();
  overlay.querySelector('.modal-close').addEventListener('click', () => overlay.remove());
  overlay.querySelector('#save-name-btn').addEventListener('click', async () => {
    const newName = input.value.trim();
    if (!newName) { showToast('Nome não pode estar vazio', 'error'); return; }
    const btn = overlay.querySelector('#save-name-btn');
    btn.disabled = true; btn.textContent = 'A guardar...';
    try {
      const updated = await apiFetch(`/stickers/${stickerId}`, {
        method: 'PUT',
        body: JSON.stringify({ player_name: newName }),
      });
      const idx = allStickers.findIndex(s => s.id === stickerId);
      if (idx !== -1) allStickers[idx] = { ...allStickers[idx], player_name: newName };
      overlay.remove();
      showToast('Nome atualizado!', 'success');
      refreshCard(stickerId);
    } catch (e) {
      showToast(e.message, 'error');
      btn.disabled = false; btn.textContent = '💾 Guardar';
    }
  });
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

function openReportModal(stickerId, currentName) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal" style="max-width:380px;">
      <div class="modal-header">
        <span class="modal-title">🚩 Reportar Nome Incorreto</span>
        <button class="modal-close">✕</button>
      </div>
      <p style="font-size:13px;color:var(--text-muted);margin-bottom:12px;">
        Nome atual: <strong>${currentName || '(sem nome)'}</strong>
      </p>
      <div class="form-group">
        <label class="form-label">Nome correto sugerido</label>
        <input type="text" class="form-input" id="report-name-input" placeholder="Nome correto do jogador">
      </div>
      <button class="btn btn-gold" style="width:100%;" id="send-report-btn">🚩 Enviar Relatório</button>
    </div>
  `;
  document.body.appendChild(overlay);
  const input = overlay.querySelector('#report-name-input');
  input.focus();
  overlay.querySelector('.modal-close').addEventListener('click', () => overlay.remove());
  overlay.querySelector('#send-report-btn').addEventListener('click', async () => {
    const suggested_name = input.value.trim();
    if (!suggested_name) { showToast('Insere o nome correto', 'error'); return; }
    const btn = overlay.querySelector('#send-report-btn');
    btn.disabled = true; btn.textContent = 'A enviar...';
    try {
      await apiFetch(`/stickers/${stickerId}/report`, {
        method: 'POST',
        body: JSON.stringify({ suggested_name }),
      });
      overlay.remove();
      showToast('Relatório enviado! Obrigado.', 'success');
    } catch (e) {
      showToast(e.message, 'error');
      btn.disabled = false; btn.textContent = '🚩 Enviar Relatório';
    }
  });
}
