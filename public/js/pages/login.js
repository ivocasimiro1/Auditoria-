import { apiFetch, setAuth, showToast } from '../app.js';

export function render() {
  document.getElementById('main-content').innerHTML = '';
  document.body.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:var(--bg);padding:16px;">
      <div style="width:100%;max-width:420px;">
        <div style="text-align:center;margin-bottom:32px;">
          <div style="font-size:56px;margin-bottom:8px;">⚽</div>
          <h1 style="font-size:26px;font-weight:800;color:var(--gold);">Panini WC2026</h1>
          <p style="color:var(--text-muted);font-size:14px;margin-top:4px;">Plataforma de Troca de Cromos</p>
        </div>
        <div class="card">
          <div class="tabs" id="auth-tabs">
            <button class="tab-btn active" data-tab="login">Entrar</button>
            <button class="tab-btn" data-tab="register">Registar</button>
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
              Demo: joao@demo.pt / demo123
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
            <button class="btn btn-gold" style="width:100%;" id="register-btn">Criar Conta</button>
          </div>
        </div>
      </div>
    </div>
  `;

  // Tab switching
  document.querySelectorAll('.tab-btn[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn[data-tab]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('login-form').style.display = btn.dataset.tab === 'login' ? 'block' : 'none';
      document.getElementById('register-form').style.display = btn.dataset.tab === 'register' ? 'block' : 'none';
    });
  });

  // Login
  document.getElementById('login-btn').addEventListener('click', async () => {
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const btn = document.getElementById('login-btn');
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

  // Enter key on password
  document.getElementById('login-password').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('login-btn').click();
  });

  // Register
  document.getElementById('register-btn').addEventListener('click', async () => {
    const username = document.getElementById('reg-username').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;
    const location = document.getElementById('reg-location').value.trim();
    const btn = document.getElementById('register-btn');
    if (!username || !email || !password) { showToast('Preenche os campos obrigatórios', 'error'); return; }
    btn.disabled = true; btn.textContent = 'A criar conta...';
    try {
      const data = await apiFetch('/auth/register', { method: 'POST', body: JSON.stringify({ username, email, password, location }) });
      if (!data) return;
      setAuth(data.token, data.user);
      window.location.reload();
    } catch (e) {
      showToast(e.message, 'error');
      btn.disabled = false; btn.textContent = 'Criar Conta';
    }
  });
}
