import { apiFetch, getUser, relativeTime } from '../app.js';

export async function render() {
  const main = document.getElementById('main-content');
  const user = getUser();

  const [stats, trades, matches] = await Promise.all([
    apiFetch('/stickers/collection/stats/me'),
    apiFetch('/trades?status=pending'),
    apiFetch('/matches?limit=3'),
  ]);

  main.innerHTML = `
    <div class="page">
      <div class="page-header">
        <h2>Olá, ${user?.username || 'Colecionador'} 👋</h2>
        <p>Bem-vindo à tua caderneta digital do Mundial 2026</p>
      </div>

      <div class="stats-row">
        <div class="stat-card">
          <div class="stat-value">${stats?.collected || 0}</div>
          <div class="stat-label">Cromos Colecionados</div>
          <div class="progress-bar" style="margin-top:8px;">
            <div class="progress-fill" style="width:${stats?.completion_pct || 0}%"></div>
          </div>
          <div class="stat-sub">${stats?.completion_pct || 0}% da caderneta completa</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${stats?.have_to_trade || 0}</div>
          <div class="stat-label">Para Trocar</div>
          <div class="stat-sub">cromos disponíveis</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${stats?.need || 0}</div>
          <div class="stat-label">A Precisar</div>
          <div class="stat-sub">cromos em falta</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${trades?.length || 0}</div>
          <div class="stat-label">Trocas Pendentes</div>
          <div class="stat-sub">aguardam resposta</div>
        </div>
      </div>

      ${matches?.length ? `
        <div class="card" style="margin-bottom:24px;">
          <div class="card-header">
            <span class="card-title">🎯 Melhores Matches</span>
            <button class="btn btn-ghost btn-sm" onclick="window.location.hash='/matches'">Ver Todos</button>
          </div>
          ${matches.map(m => `
            <div class="match-card" style="margin-bottom:8px;">
              <div class="match-card-header">
                <div class="match-score-badge">${m.match_score}</div>
                <div>
                  <div style="font-weight:700;">${m.user.username}</div>
                  <div style="font-size:12px;color:var(--text-muted);">${m.user.location || ''}</div>
                </div>
                <button class="btn btn-primary btn-sm" style="margin-left:auto;"
                  onclick="window.location.hash='/trades';window._proposeUserId='${m.user.id}'">
                  Propor Troca
                </button>
              </div>
              <div style="font-size:12px;color:var(--text-muted);">
                Dás ${m.stickers_i_give.length} cromo(s) · Recebes ${m.stickers_i_receive.length} cromo(s)
              </div>
            </div>
          `).join('')}
        </div>
      ` : ''}

      ${trades?.length ? `
        <div class="card">
          <div class="card-header">
            <span class="card-title">⏳ Trocas Pendentes</span>
            <button class="btn btn-ghost btn-sm" onclick="window.location.hash='/trades'">Ver Todas</button>
          </div>
          ${trades.map(t => `
            <div class="trade-card" onclick="window.location.hash='/trades?id=${t.id}'">
              <div class="trade-card-header">
                <span class="trade-card-users">
                  ${t.proposer_username} → ${t.receiver_username}
                </span>
                <span class="badge badge-gold">⏳ Pendente</span>
              </div>
              <div class="trade-card-meta">${relativeTime(t.created_at)}</div>
            </div>
          `).join('')}
        </div>
      ` : `
        <div class="card">
          <div style="text-align:center;padding:32px 0;color:var(--text-muted);">
            <div style="font-size:40px;margin-bottom:8px;">🔄</div>
            <div style="font-weight:600;">Sem trocas pendentes</div>
            <div style="font-size:13px;margin-top:4px;">Vai ao catálogo marcar os teus cromos e encontra matches!</div>
            <button class="btn btn-primary" style="margin-top:16px;" onclick="window.location.hash='/matches'">
              🎯 Encontrar Matches
            </button>
          </div>
        </div>
      `}
    </div>
  `;
}
