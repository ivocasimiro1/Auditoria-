import { apiFetch } from '../app.js';

const FLAG_CODES = {
  MEX:'mx', RSA:'za', KOR:'kr', CZE:'cz',
  CAN:'ca', BIH:'ba', QAT:'qa', SUI:'ch',
  BRA:'br', MAR:'ma', HAI:'ht', SCO:'gb-sct',
  USA:'us', PAR:'py', AUS:'au', TUR:'tr',
  GER:'de', CUW:'cw', CIV:'ci', ECU:'ec',
  NED:'nl', JPN:'jp', SWE:'se', TUN:'tn',
  BEL:'be', EGY:'eg', IRN:'ir', NZL:'nz',
  ESP:'es', CMV:'cv', SAU:'sa', URU:'uy',
  FRA:'fr', SEN:'sn', IRQ:'iq', NOR:'no',
  ARG:'ar', ALG:'dz', AUT:'at', JOR:'jo',
  POR:'pt', COD:'cd', UZB:'uz', COL:'co',
  ENG:'gb-eng', CRO:'hr', GHA:'gh', PAN:'pa',
  CMR:'cm', NGA:'ng', POL:'pl', ITA:'it', DEN:'dk', WAL:'gb-wls', CRC:'cr', SRB:'rs',
};

const GROUP_NAMES = {
  A: 'Grupo A', B: 'Grupo B', C: 'Grupo C', D: 'Grupo D',
  E: 'Grupo E', F: 'Grupo F', G: 'Grupo G', H: 'Grupo H',
  I: 'Grupo I', J: 'Grupo J', K: 'Grupo K', L: 'Grupo L',
  ESPECIAL: 'Especiais',
};

let activeView = 'groups'; // 'groups' | 'missing' | 'have' | 'trade'

export async function render() {
  const main = document.getElementById('main-content');
  main.innerHTML = '<div class="loading-center"><div class="spinner"></div></div>';

  const [col, allStickers, stats] = await Promise.all([
    apiFetch('/stickers/collection/me'),
    apiFetch('/stickers'),
    apiFetch('/stickers/collection/stats/me'),
  ]);

  if (!col || !stats || !allStickers) return;

  // Build collection map
  const collectionMap = {};
  col.forEach(s => { if (s.status) collectionMap[s.id] = s.status; });

  // Count real stats from full sticker list
  const total = allStickers.filter(s => s.group_name !== 'ESPECIAL').length;
  const owned = allStickers.filter(s => collectionMap[s.id] === 'have_double' || collectionMap[s.id] === 'have_to_trade').length;
  const missing = total - owned;
  const forTrade = allStickers.filter(s => collectionMap[s.id] === 'have_to_trade').length;
  const pct = total > 0 ? Math.round((owned / total) * 100) : 0;

  // Group stickers by group then team
  const byGroup = {};
  for (const s of allStickers) {
    if (!byGroup[s.group_name]) byGroup[s.group_name] = {};
    if (!byGroup[s.group_name][s.team_code]) {
      byGroup[s.group_name][s.team_code] = { name: s.team_name, stickers: [] };
    }
    byGroup[s.group_name][s.team_code].stickers.push(s);
  }

  main.innerHTML = `
    <div class="page">
      <div class="page-header">
        <h2>📒 A Minha Caderneta</h2>
        <p>Estado completo da tua coleção do Mundial 2026</p>
      </div>

      <!-- Summary cards -->
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px;">
        <div class="card" style="text-align:center;padding:16px 12px;">
          <div style="font-size:28px;font-weight:900;color:var(--gold);">${pct}%</div>
          <div style="font-size:11px;color:var(--text-muted);margin:4px 0 8px;">Completa</div>
          <div style="height:4px;background:rgba(255,255,255,0.08);border-radius:2px;overflow:hidden;">
            <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,var(--blue),var(--gold));border-radius:2px;transition:width 1s;"></div>
          </div>
          <div style="font-size:10px;color:var(--text-muted);margin-top:6px;">${owned}/${total} cromos</div>
        </div>
        <div class="card" style="text-align:center;padding:16px 12px;cursor:pointer;" id="btn-owned">
          <div style="font-size:28px;font-weight:900;color:#22c55e;">${owned}</div>
          <div style="font-size:11px;color:var(--text-muted);margin-top:4px;">Tenho</div>
        </div>
        <div class="card" style="text-align:center;padding:16px 12px;cursor:pointer;" id="btn-missing">
          <div style="font-size:28px;font-weight:900;color:var(--red);">${missing}</div>
          <div style="font-size:11px;color:var(--text-muted);margin-top:4px;">Em Falta</div>
        </div>
        <div class="card" style="text-align:center;padding:16px 12px;cursor:pointer;" id="btn-trade">
          <div style="font-size:28px;font-weight:900;color:var(--blue);">${forTrade}</div>
          <div style="font-size:11px;color:var(--text-muted);margin-top:4px;">Para Trocar</div>
        </div>
      </div>

      <!-- View tabs -->
      <div style="display:flex;gap:8px;margin-bottom:20px;flex-wrap:wrap;">
        <button class="filter-btn active" data-view="groups">📊 Por Grupo</button>
        <button class="filter-btn" data-view="missing">❤️ Em Falta (${missing})</button>
        <button class="filter-btn" data-view="have">✅ Tenho (${owned})</button>
        <button class="filter-btn" data-view="trade">🔄 Para Trocar (${forTrade})</button>
      </div>

      <div id="collection-content"></div>
    </div>
  `;

  document.querySelectorAll('.filter-btn[data-view]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn[data-view]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeView = btn.dataset.view;
      renderContent(byGroup, allStickers, collectionMap);
    });
  });

  document.getElementById('btn-owned')?.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn[data-view]').forEach(b => b.classList.remove('active'));
    document.querySelector('.filter-btn[data-view="have"]')?.classList.add('active');
    activeView = 'have';
    renderContent(byGroup, allStickers, collectionMap);
  });
  document.getElementById('btn-missing')?.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn[data-view]').forEach(b => b.classList.remove('active'));
    document.querySelector('.filter-btn[data-view="missing"]')?.classList.add('active');
    activeView = 'missing';
    renderContent(byGroup, allStickers, collectionMap);
  });
  document.getElementById('btn-trade')?.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn[data-view]').forEach(b => b.classList.remove('active'));
    document.querySelector('.filter-btn[data-view="trade"]')?.classList.add('active');
    activeView = 'trade';
    renderContent(byGroup, allStickers, collectionMap);
  });

  renderContent(byGroup, allStickers, collectionMap);
}

function renderContent(byGroup, allStickers, collectionMap) {
  const content = document.getElementById('collection-content');
  if (!content) return;

  if (activeView === 'groups') {
    renderGroupsView(content, byGroup, collectionMap);
  } else {
    renderFilteredView(content, allStickers, collectionMap);
  }
}

function renderGroupsView(content, byGroup, collectionMap) {
  const groupOrder = ['A','B','C','D','E','F','G','H','I','J','K','L','ESPECIAL'];

  content.innerHTML = groupOrder
    .filter(g => byGroup[g])
    .map(group => {
      const teams = Object.entries(byGroup[group]);
      const groupOwned = teams.reduce((acc, [, t]) =>
        acc + t.stickers.filter(s => collectionMap[s.id] === 'have_double' || collectionMap[s.id] === 'have_to_trade').length, 0);
      const groupTotal = teams.reduce((acc, [, t]) => acc + t.stickers.length, 0);
      const groupPct = groupTotal > 0 ? Math.round((groupOwned / groupTotal) * 100) : 0;

      return `
        <div class="card" style="margin-bottom:16px;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;padding-bottom:10px;border-bottom:1px solid var(--border);">
            <div style="font-size:15px;font-weight:800;">${GROUP_NAMES[group] || group}</div>
            <div style="font-size:12px;color:var(--text-muted);">${groupOwned}/${groupTotal} · ${groupPct}%</div>
          </div>
          ${teams.map(([code, team]) => {
            const have = team.stickers.filter(s => collectionMap[s.id] === 'have_double' || collectionMap[s.id] === 'have_to_trade').length;
            const trade = team.stickers.filter(s => collectionMap[s.id] === 'have_to_trade').length;
            const missing = team.stickers.length - have;
            const pct = Math.round((have / team.stickers.length) * 100);
            const flagCode = FLAG_CODES[code];
            const flagHtml = flagCode
              ? `<img src="https://flagcdn.com/w40/${flagCode}.png" alt="${team.name}" style="width:28px;height:19px;object-fit:cover;border-radius:2px;" loading="lazy" onerror="this.outerHTML='🌐'">`
              : `<span>🌐</span>`;

            return `
              <button onclick="window.location.hash='/catalog?team=${code}'"
                style="width:100%;display:flex;align-items:center;gap:12px;padding:12px 8px;border:none;border-bottom:1px solid rgba(255,255,255,0.04);background:none;color:inherit;cursor:pointer;border-radius:6px;transition:background 0.15s;text-align:left;-webkit-tap-highlight-color:rgba(255,255,255,0.08);"
                onmouseenter="this.style.background='rgba(255,255,255,0.05)'" onmouseleave="this.style.background=''">
                <div style="width:32px;text-align:center;flex-shrink:0;">${flagHtml}</div>
                <div style="flex:1;min-width:0;">
                  <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:4px;">
                    <span style="font-size:13px;font-weight:600;">${team.name}</span>
                    <span style="font-size:11px;color:var(--text-muted);">${have}/${team.stickers.length} →</span>
                  </div>
                  <div style="height:3px;background:rgba(255,255,255,0.07);border-radius:2px;overflow:hidden;">
                    <div style="height:100%;width:${pct}%;background:${pct === 100 ? 'var(--success)' : 'linear-gradient(90deg,var(--blue),var(--purple))'};border-radius:2px;"></div>
                  </div>
                  <div style="display:flex;gap:10px;margin-top:4px;font-size:10px;">
                    ${trade > 0 ? `<span style="color:#6ab0ff;">🔄 ${trade} p/ trocar</span>` : ''}
                    ${missing > 0 ? `<span style="color:#f87171;">❤️ ${missing} em falta</span>` : ''}
                    ${pct === 100 ? `<span style="color:var(--success);">✅ Completo!</span>` : ''}
                  </div>
                </div>
              </button>
            `;
          }).join('')}
        </div>
      `;
    }).join('');
}

function renderFilteredView(content, allStickers, collectionMap) {
  let filtered;
  let emptyMsg;

  if (activeView === 'missing') {
    filtered = allStickers.filter(s => !collectionMap[s.id] || collectionMap[s.id] === 'need');
    emptyMsg = '✅ Não tens nenhum cromo em falta!';
  } else if (activeView === 'have') {
    filtered = allStickers.filter(s => collectionMap[s.id] === 'have_double' || collectionMap[s.id] === 'have_to_trade');
    emptyMsg = '📭 Ainda não marcaste nenhum cromo como "Tenho"';
  } else {
    filtered = allStickers.filter(s => collectionMap[s.id] === 'have_to_trade');
    emptyMsg = '📭 Nenhum cromo marcado para troca ainda';
  }

  if (!filtered.length) {
    content.innerHTML = `<div class="empty-state"><div class="empty-icon">📭</div><p>${emptyMsg}</p></div>`;
    return;
  }

  // Group by team for display
  const byTeam = {};
  for (const s of filtered) {
    if (!byTeam[s.team_code]) byTeam[s.team_code] = { name: s.team_name, group: s.group_name, stickers: [] };
    byTeam[s.team_code].stickers.push(s);
  }

  content.innerHTML = Object.entries(byTeam)
    .sort(([,a],[,b]) => a.group.localeCompare(b.group) || a.name.localeCompare(b.name))
    .map(([code, team]) => {
      const flagCode = FLAG_CODES[code];
      const flagHtml = flagCode
        ? `<img src="https://flagcdn.com/w40/${flagCode}.png" alt="${team.name}" style="width:24px;height:16px;object-fit:cover;border-radius:2px;" loading="lazy">`
        : '🌐';

      return `
        <div class="card" style="margin-bottom:12px;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
            ${flagHtml}
            <span style="font-size:13px;font-weight:700;">${team.name}</span>
            <span style="font-size:11px;color:var(--text-muted);margin-left:auto;">Grupo ${team.group} · ${team.stickers.length} cromos</span>
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:6px;">
            ${team.stickers.map(s => `
              <div style="background:rgba(255,255,255,0.05);border-radius:6px;padding:4px 8px;font-size:11px;border:1px solid rgba(255,255,255,0.08);">
                <span style="color:var(--text-muted);">#${String(s.number).padStart(3,'0')}</span>
                <span style="margin-left:4px;font-weight:600;">${s.player_name || s.team_name}</span>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }).join('');
}
