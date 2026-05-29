import { apiFetch } from '../app.js';

const FLAG_CODES = {
  USA:'us',MEX:'mx',CAN:'ca',PAN:'pa',ENG:'gb-eng',ARG:'ar',NED:'nl',SEN:'sn',
  FRA:'fr',BRA:'br',BEL:'be',MAR:'ma',POR:'pt',ESP:'es',GER:'de',JPN:'jp',
  URU:'uy',COL:'co',KOR:'kr',CMR:'cm',CRO:'hr',AUS:'au',NGA:'ng',POL:'pl',
  ITA:'it',SUI:'ch',ECU:'ec',GHA:'gh',DEN:'dk',TUN:'tn',NZL:'nz',SAU:'sa',
  IRN:'ir',WAL:'gb-wls',CRC:'cr',SRB:'rs',EGY:'eg',SCO:'gb-sct',AUT:'at',TUR:'tr',
  QAT:'qa',HND:'hn',SVK:'sk',CMV:'cv',VEN:'ve',MEX2:'mx',MEX3:'mx',CMR2:'cm',
};

export async function render() {
  const main = document.getElementById('main-content');
  main.innerHTML = '<div class="loading-center"><div class="spinner"></div></div>';

  const [col, stats] = await Promise.all([
    apiFetch('/stickers/collection/me'),
    apiFetch('/stickers/collection/stats/me'),
  ]);

  if (!col || !stats) return;

  // Group by team
  const byTeam = {};
  for (const s of col) {
    if (!byTeam[s.team_code]) byTeam[s.team_code] = { name: s.team_name, group: s.group_name, stickers: [] };
    byTeam[s.team_code].stickers.push(s);
  }

  main.innerHTML = `
    <div class="page">
      <div class="page-header">
        <h2>🗂️ A Minha Colecção</h2>
        <p>Progresso da tua caderneta do Mundial 2026</p>
      </div>

      <div class="stats-row" style="margin-bottom:24px;">
        <div class="stat-card">
          <div class="stat-value">${stats.completion_pct}%</div>
          <div class="stat-label">Caderneta Completa</div>
          <div class="progress-bar"><div class="progress-fill" style="width:${stats.completion_pct}%"></div></div>
          <div class="stat-sub">${stats.collected} de ${stats.total} cromos</div>
        </div>
        <div class="stat-card">
          <div class="stat-value" style="color:var(--blue);">${stats.have_to_trade}</div>
          <div class="stat-label">Para Trocar</div>
        </div>
        <div class="stat-card">
          <div class="stat-value" style="color:var(--red);">${stats.need}</div>
          <div class="stat-label">A Precisar</div>
        </div>
        <div class="stat-card">
          <div class="stat-value" style="color:var(--success);">${stats.have_double}</div>
          <div class="stat-label">Duplos</div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <span class="card-title">Progresso por Equipa</span>
        </div>
        <div id="teams-progress"></div>
      </div>
    </div>
  `;

  const teamsDiv = document.getElementById('teams-progress');
  teamsDiv.innerHTML = Object.entries(byTeam)
    .sort(([,a], [,b]) => a.group.localeCompare(b.group) || a.name.localeCompare(b.name))
    .map(([code, team]) => {
      const have = team.stickers.filter(s => s.status && s.status !== 'need').length;
      const need = team.stickers.filter(s => s.status === 'need').length;
      const trade = team.stickers.filter(s => s.status === 'have_to_trade').length;
      const total = team.stickers.length;
      const pct = Math.round((have / total) * 100);
      const flagCode = FLAG_CODES[code];
      const flagHtml = flagCode
        ? `<img src="https://flagcdn.com/w40/${flagCode}.png" alt="${team.name}" style="width:28px;height:18px;object-fit:cover;border-radius:2px;border:1px solid rgba(255,255,255,0.15);" loading="lazy" onerror="this.outerHTML='🌐'">`
        : `<span style="font-size:20px;">🌐</span>`;

      return `
        <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border);">
          <span style="width:28px;text-align:center;">${flagHtml}</span>
          <div style="flex:1;min-width:0;">
            <div style="font-size:13px;font-weight:600;display:flex;justify-content:space-between;">
              <span>${team.name}</span>
              <span style="color:var(--text-muted);">${have}/${total}</span>
            </div>
            <div class="progress-bar" style="margin:4px 0 4px;">
              <div class="progress-fill" style="width:${pct}%"></div>
            </div>
            <div style="font-size:11px;color:var(--text-muted);display:flex;gap:12px;">
              ${trade > 0 ? `<span style="color:#6ab0ff;">🔄 ${trade} para trocar</span>` : ''}
              ${need > 0 ? `<span style="color:#ff8099;">❤️ ${need} em falta</span>` : ''}
              ${pct === 100 ? `<span style="color:var(--success);">✅ Completo!</span>` : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');
}
