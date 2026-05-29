import { apiFetch, showToast, TYPE_LABELS } from '../app.js';

const TEAM_FLAGS = {
  USA:'🇺🇸',MEX:'🇲🇽',CAN:'🇨🇦',PAN:'🇵🇦',ENG:'🏴󠁧󠁢󠁥󠁮󠁧󠁿',ARG:'🇦🇷',NED:'🇳🇱',SEN:'🇸🇳',
  FRA:'🇫🇷',BRA:'🇧🇷',BEL:'🇧🇪',MAR:'🇲🇦',POR:'🇵🇹',ESP:'🇪🇸',GER:'🇩🇪',JPN:'🇯🇵',
  URU:'🇺🇾',COL:'🇨🇴',KOR:'🇰🇷',CMR:'🇨🇲',CRO:'🇭🇷',AUS:'🇦🇺',NGA:'🇳🇬',POL:'🇵🇱',
  ITA:'🇮🇹',SUI:'🇨🇭',ECU:'🇪🇨',GHA:'🇬🇭',DEN:'🇩🇰',TUN:'🇹🇳',NZL:'🇳🇿',SAU:'🇸🇦',
  IRN:'🇮🇷',WAL:'🏴󠁧󠁢󠁷󠁬󠁳󠁿',CRC:'🇨🇷',SRB:'🇷🇸',EGY:'🇪🇬',SCO:'🏴󠁧󠁢󠁳󠁣󠁴󠁿',AUT:'🇦🇹',TUR:'🇹🇷',
  QAT:'🇶🇦',HND:'🇭🇳',SVK:'🇸🇰',CMV:'🇨🇻',VEN:'🇻🇪',SPECIAL:'🌟',
};

const TYPE_ICONS = { player:'⚽', badge:'🛡️', logo:'🏷️', special:'✨', stadium:'🏟️' };

let allStickers = [];
let collection = {};
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
  if (col) col.forEach(s => { if (s.status) collection[s.id] = s.status; });

  const groups = [...new Set(allStickers.map(s => s.group_name))].filter(g => g !== 'ESPECIAL').sort();

  main.innerHTML = `
    <div class="page">
      <div class="page-header">
        <h2>📚 Catálogo de Cromos</h2>
        <p>Marca os cromos que tens para trocar, que precisas, ou duplos</p>
      </div>

      <div class="filter-bar">
        <input type="text" class="form-input" id="search-input" placeholder="🔍 Pesquisar cromo ou jogador..." style="max-width:240px;flex:1;">
        <select class="form-input form-select" id="group-filter" style="max-width:160px;">
          <option value="all">Todos os Grupos</option>
          ${groups.map(g => `<option value="${g}">Grupo ${g}</option>`).join('')}
          <option value="ESPECIAL">Especiais</option>
        </select>
      </div>

      <div class="filter-bar" style="margin-top:-8px;">
        <button class="filter-btn active" data-f="all">Todos</button>
        <button class="filter-btn" data-f="need">❤️ Preciso</button>
        <button class="filter-btn" data-f="have_to_trade">🔄 Para Trocar</button>
        <button class="filter-btn" data-f="have_double">✌️ Duplos</button>
        <button class="filter-btn" data-f="none">⬜ Sem Estado</button>
      </div>

      <div id="catalog-content"></div>
    </div>
  `;

  // Filter buttons
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
    if (activeFilter !== 'all') return collection[s.id] === activeFilter;
    return true;
  });
  if (activeGroup !== 'all') filtered = filtered.filter(s => s.group_name === activeGroup);
  if (searchTerm) filtered = filtered.filter(s =>
    s.player_name?.toLowerCase().includes(searchTerm) ||
    s.team_name?.toLowerCase().includes(searchTerm) ||
    s.id.toLowerCase().includes(searchTerm)
  );

  // Group by team
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
    const havePct = team.stickers.filter(s => collection[s.id] && collection[s.id] !== 'need').length;
    const pct = Math.round((havePct / team.stickers.length) * 100);
    return `
      <div class="team-section">
        <div class="team-header">
          <span class="team-flag">${TEAM_FLAGS[code] || '🏳️'}</span>
          <div>
            <div class="team-title">${team.name}</div>
            <div style="font-size:11px;color:var(--text-muted);">Grupo ${team.group}</div>
          </div>
          <div class="team-count" style="margin-left:auto;text-align:right;">
            ${havePct}/${team.stickers.length}
            <div class="team-progress-bar" style="width:80px;">
              <div class="team-progress-fill" style="width:${pct}%"></div>
            </div>
          </div>
        </div>
        <div class="sticker-grid">
          ${team.stickers.map(s => stickerCard(s)).join('')}
        </div>
      </div>
    `;
  }).join('');

  // Add click listeners
  content.querySelectorAll('.sticker-card').forEach(card => {
    card.addEventListener('click', () => cycleStatus(card.dataset.id));
  });
}

function stickerCard(s) {
  const status = collection[s.id];
  const icon = TYPE_ICONS[s.card_type] || '📄';
  return `
    <div class="sticker-card rarity-${s.rarity}" data-id="${s.id}" title="${s.player_name || s.team_name}">
      ${s.rarity !== 'common' ? `<div class="rarity-crown">${s.rarity === 'holographic' ? '💎' : '✨'}</div>` : ''}
      ${status ? `<div class="sticker-status-badge status-${status}">${TYPE_LABELS[status]?.split(' ')[0] || status}</div>` : ''}
      <div class="sticker-img ${s.card_type === 'badge' ? 'team-badge' : ''} type-${s.card_type}">
        <span>${icon}</span>
      </div>
      <div class="sticker-info">
        <div class="sticker-number">#${String(s.number).padStart(3,'0')}</div>
        <div class="sticker-name">${s.player_name || s.team_name}</div>
        <div class="sticker-team">${s.team_name}</div>
      </div>
    </div>
  `;
}

async function cycleStatus(stickerId) {
  const current = collection[stickerId];
  const cycle = [undefined, 'need', 'have_to_trade', 'have_double'];
  const idx = cycle.indexOf(current);
  const next = cycle[(idx + 1) % cycle.length];

  collection[stickerId] = next || undefined;
  if (!next) delete collection[stickerId];

  try {
    await apiFetch(`/stickers/collection/${stickerId}`, {
      method: 'PUT',
      body: JSON.stringify({ status: next || 'none' }),
    });
    const cards = document.querySelectorAll(`.sticker-card[data-id="${stickerId}"]`);
    cards.forEach(card => {
      card.outerHTML = stickerCard(allStickers.find(s => s.id === stickerId));
    });
    // Re-attach listeners to new elements
    document.querySelectorAll('.sticker-card').forEach(card => {
      card.onclick = null;
      card.addEventListener('click', () => cycleStatus(card.dataset.id));
    });
  } catch (e) {
    showToast(e.message, 'error');
  }
}
