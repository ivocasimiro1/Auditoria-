import { apiFetch, getUser, relativeTime } from '../app.js';

function renderOnboardingCard() {
  return `
    <div id="onboarding-card" style="
      margin-bottom: 24px;
      border-radius: 16px;
      padding: 2px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
      box-shadow: 0 4px 24px rgba(102,126,234,0.3);
    ">
      <div style="
        background: var(--bg-card, #1a1a2e);
        border-radius: 14px;
        padding: 24px;
      ">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
          <div style="font-size:20px;font-weight:800;color:var(--text);">🏆 Bem-vindo à caderneta do Mundial 2026!</div>
          <button id="onboarding-close-btn" style="
            background: none;
            border: none;
            cursor: pointer;
            font-size: 18px;
            color: var(--text-muted);
            padding: 4px 8px;
            border-radius: 6px;
            line-height: 1;
          " title="Fechar">✕ fechar</button>
        </div>
        <div style="font-size:14px;color:var(--text-muted);margin-bottom:20px;">Começa agora em 3 passos simples:</div>
        <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:24px;">
          <div style="
            flex:1;min-width:120px;
            background: linear-gradient(135deg, rgba(102,126,234,0.15), rgba(102,126,234,0.05));
            border: 1px solid rgba(102,126,234,0.4);
            border-radius: 12px;
            padding: 16px 12px;
            text-align: center;
          ">
            <div style="font-size:28px;margin-bottom:8px;">📚</div>
            <div style="font-size:13px;font-weight:700;color:var(--text);">1. Vai ao Catálogo</div>
            <div style="font-size:11px;color:var(--text-muted);margin-top:4px;">Explora todos os cromos disponíveis</div>
          </div>
          <div style="
            flex:1;min-width:120px;
            background: linear-gradient(135deg, rgba(118,75,162,0.15), rgba(118,75,162,0.05));
            border: 1px solid rgba(118,75,162,0.4);
            border-radius: 12px;
            padding: 16px 12px;
            text-align: center;
          ">
            <div style="font-size:28px;margin-bottom:8px;">✅</div>
            <div style="font-size:13px;font-weight:700;color:var(--text);">2. Marca os teus cromos</div>
            <div style="font-size:11px;color:var(--text-muted);margin-top:4px;">Indica o que tens e o que precisas</div>
          </div>
          <div style="
            flex:1;min-width:120px;
            background: linear-gradient(135deg, rgba(240,147,251,0.15), rgba(240,147,251,0.05));
            border: 1px solid rgba(240,147,251,0.4);
            border-radius: 12px;
            padding: 16px 12px;
            text-align: center;
          ">
            <div style="font-size:28px;margin-bottom:8px;">🎯</div>
            <div style="font-size:13px;font-weight:700;color:var(--text);">3. Encontra Matches e troca!</div>
            <div style="font-size:11px;color:var(--text-muted);margin-top:4px;">Liga-te a outros colecionadores</div>
          </div>
        </div>
        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
          <button id="onboarding-start-btn" style="
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: #fff;
            border: none;
            border-radius: 10px;
            padding: 12px 24px;
            font-size: 15px;
            font-weight: 700;
            cursor: pointer;
            box-shadow: 0 2px 12px rgba(102,126,234,0.4);
          ">Vamos lá! →</button>
        </div>
      </div>
    </div>
  `;
}

export async function render() {
  const main = document.getElementById('main-content');
  const user = getUser();

  const [stats, trades, matches] = await Promise.all([
    apiFetch('/stickers/collection/stats/me'),
    apiFetch('/trades?status=pending'),
    apiFetch('/matches?limit=3'),
  ]);

  const showOnboarding = (stats?.collected === 0) && !localStorage.getItem('onboarding_dismissed');

  main.innerHTML = `
    <div class="page">
      <div class="page-header">
        <h2>Olá, ${user?.username || 'Colecionador'} 👋</h2>
        <p>Bem-vindo à tua caderneta digital do Mundial 2026</p>
      </div>

      ${showOnboarding ? renderOnboardingCard() : ''}

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

  if (showOnboarding) {
    document.getElementById('onboarding-start-btn')?.addEventListener('click', () => {
      window.location.hash = '/catalog';
    });
    document.getElementById('onboarding-close-btn')?.addEventListener('click', () => {
      localStorage.setItem('onboarding_dismissed', '1');
      const card = document.getElementById('onboarding-card');
      if (card) card.remove();
    });
  }
}
