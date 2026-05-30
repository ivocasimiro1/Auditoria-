import { apiFetch, setAuth, showToast } from '../app.js';

export function render() {
  document.getElementById('main-content').innerHTML = '';
  document.body.innerHTML = `
    <div style="min-height:100vh;background:var(--bg);overflow-y:auto;">

      <!-- HERO -->
      <div style="background:linear-gradient(135deg,#0b1120 0%,#0f1e3a 50%,#0b1120 100%);padding:48px 20px 40px;text-align:center;position:relative;overflow:hidden;">
        <div style="position:absolute;inset:0;background:radial-gradient(ellipse 80% 60% at 50% 0%,rgba(59,130,246,0.12),transparent);pointer-events:none;"></div>
        <div style="font-size:64px;margin-bottom:12px;filter:drop-shadow(0 0 24px rgba(250,204,21,0.4));">⚽</div>
        <h1 style="font-size:28px;font-weight:900;color:#fff;letter-spacing:-0.5px;margin-bottom:6px;">
          Panini WC2026
        </h1>
        <p style="font-size:16px;font-weight:600;color:#fbbf24;margin-bottom:12px;">
          Troca de Cromos do Mundial 2026 🏆
        </p>
        <p style="font-size:14px;color:rgba(255,255,255,0.55);max-width:360px;margin:0 auto 28px;line-height:1.6;">
          A caderneta digital onde encontras quem tem o cromo que precisas<br>e trocas sem sair de casa.
        </p>

        <!-- Live stats -->
        <div style="display:flex;justify-content:center;gap:24px;flex-wrap:wrap;" id="live-stats">
          <div style="text-align:center;">
            <div style="font-size:26px;font-weight:800;color:#60a5fa;" id="stat-users">—</div>
            <div style="font-size:11px;color:rgba(255,255,255,0.45);margin-top:2px;">colecionadores</div>
          </div>
          <div style="width:1px;background:rgba(255,255,255,0.1);"></div>
          <div style="text-align:center;">
            <div style="font-size:26px;font-weight:800;color:#4ade80;" id="stat-trades">—</div>
            <div style="font-size:11px;color:rgba(255,255,255,0.45);margin-top:2px;">trocas feitas</div>
          </div>
          <div style="width:1px;background:rgba(255,255,255,0.1);"></div>
          <div style="text-align:center;">
            <div style="font-size:26px;font-weight:800;color:#f59e0b;" id="stat-stickers">—</div>
            <div style="font-size:11px;color:rgba(255,255,255,0.45);margin-top:2px;">cromos disponíveis</div>
          </div>
        </div>
      </div>

      <!-- HOW IT WORKS -->
      <div style="padding:32px 20px;max-width:500px;margin:0 auto;">
        <div style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:rgba(255,255,255,0.35);text-align:center;margin-bottom:20px;">Como funciona</div>
        <div style="display:flex;flex-direction:column;gap:12px;margin-bottom:32px;">
          <div style="display:flex;align-items:center;gap:14px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:14px;">
            <div style="width:36px;height:36px;background:linear-gradient(135deg,#3b82f6,#6366f1);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;">📚</div>
            <div>
              <div style="font-size:13px;font-weight:700;color:#fff;">1. Marca os teus cromos</div>
              <div style="font-size:12px;color:rgba(255,255,255,0.45);margin-top:2px;">Tens, precisas ou tens a dobrar?</div>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:14px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:14px;">
            <div style="width:36px;height:36px;background:linear-gradient(135deg,#10b981,#059669);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;">🎯</div>
            <div>
              <div style="font-size:13px;font-weight:700;color:#fff;">2. Encontra matches automáticos</div>
              <div style="font-size:12px;color:rgba(255,255,255,0.45);margin-top:2px;">Vês quem tem o que tu precisas — e vice-versa</div>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:14px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:14px;">
            <div style="width:36px;height:36px;background:linear-gradient(135deg,#f59e0b,#d97706);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;">🤝</div>
            <div>
              <div style="font-size:13px;font-weight:700;color:#fff;">3. Combina e troca</div>
              <div style="font-size:12px;color:rgba(255,255,255,0.45);margin-top:2px;">Chat directo, avaliações e confiança garantida</div>
            </div>
          </div>
        </div>

        <!-- AUTH CARD -->
        <div class="card" style="border:1px solid rgba(99,102,241,0.25);">
          <div class="tabs" id="auth-tabs">
            <button class="tab-btn active" data-tab="login">Entrar</button>
            <button class="tab-btn" data-tab="register">Criar Conta Grátis</button>
          </div>

          <div id="login-form">
            <div class="form-group">
              <label class="form-label">Email</label>
              <input type="email" id="login-email" class="form-input" placeholder="o-teu@email.pt" autocomplete="email">
            </div>
            <div class="form-group">
              <label class="form-label">Password</label>
              <input type="password" id="login-password" class="form-input" placeholder="••••••••" autocomplete="current-password">
            </div>
            <button class="btn btn-primary" style="width:100%;" id="login-btn">Entrar</button>
            <p style="font-size:12px;color:var(--text-muted);margin-top:12px;text-align:center;">
              Ainda não tens conta? <a href="#" id="go-register" style="color:var(--blue);">Regista-te grátis</a>
            </p>
          </div>

          <div id="register-form" style="display:none;">
            <div class="form-group">
              <label class="form-label">Username</label>
              <input type="text" id="reg-username" class="form-input" placeholder="cromo_master" autocomplete="username">
            </div>
            <div class="form-group">
              <label class="form-label">Email</label>
              <input type="email" id="reg-email" class="form-input" placeholder="o-teu@email.pt" autocomplete="email">
            </div>
            <div class="form-group">
              <label class="form-label">Password</label>
              <input type="password" id="reg-password" class="form-input" placeholder="mínimo 6 caracteres" autocomplete="new-password">
            </div>
            <div class="form-group">
              <label class="form-label">Localização <span style="color:var(--text-muted)">(opcional)</span></label>
              <input type="text" id="reg-location" class="form-input" placeholder="Lisboa, Portugal">
            </div>
            <button class="btn btn-gold" style="width:100%;" id="register-btn">🚀 Criar Conta Grátis</button>
          </div>
        </div>

        <p style="text-align:center;font-size:11px;color:rgba(255,255,255,0.25);margin-top:20px;padding-bottom:32px;">
          Panini WC2026 · Plataforma gratuita de troca de cromos
        </p>
      </div>
    </div>
  `;

  // Load live stats
  fetch('/api/stats').then(r => r.json()).then(s => {
    document.getElementById('stat-users').textContent   = s.users ?? '—';
    document.getElementById('stat-trades').textContent  = s.trades_completed ?? '—';
    document.getElementById('stat-stickers').textContent = s.stickers_available ?? '—';
  }).catch(() => {});

  // "Register free" link
  document.getElementById('go-register')?.addEventListener('click', e => {
    e.preventDefault();
    document.querySelectorAll('.tab-btn[data-tab]').forEach(b => b.classList.remove('active'));
    document.querySelector('.tab-btn[data-tab="register"]').classList.add('active');
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('register-form').style.display = 'block';
  });

  // Tab switching
  document.querySelectorAll('.tab-btn[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn[data-tab]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('login-form').style.display     = btn.dataset.tab === 'login'    ? 'block' : 'none';
      document.getElementById('register-form').style.display  = btn.dataset.tab === 'register' ? 'block' : 'none';
    });
  });

  // Login
  document.getElementById('login-btn').addEventListener('click', async () => {
    const email    = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const btn      = document.getElementById('login-btn');
    if (!email || !password) { showToast('Preenche todos os campos', 'error'); return; }
    btn.disabled = true; btn.textContent = 'A entrar...';
    try {
      const data = await apiFetch('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
      if (!data) return;
      setAuth(data.token, data.user);
      window.location.reload();
    } catch (e) {
      showToast(e.message, 'error');
      btn.disabled = false; btn.textContent = 'Entrar';
    }
  });

  document.getElementById('login-password').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('login-btn').click();
  });

  // Register
  document.getElementById('register-btn').addEventListener('click', async () => {
    const username = document.getElementById('reg-username').value.trim();
    const email    = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;
    const location = document.getElementById('reg-location').value.trim();
    const btn      = document.getElementById('register-btn');
    if (!username || !email || !password) { showToast('Preenche os campos obrigatórios', 'error'); return; }
    btn.disabled = true; btn.textContent = 'A criar conta...';
    try {
      const data = await apiFetch('/auth/register', { method: 'POST', body: JSON.stringify({ username, email, password, location }) });
      if (!data) return;
      setAuth(data.token, data.user);
      window.location.reload();
    } catch (e) {
      showToast(e.message, 'error');
      btn.disabled = false; btn.textContent = '🚀 Criar Conta Grátis';
    }
  });
}
