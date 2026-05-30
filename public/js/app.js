// Core app: auth state, API client, router, toast
const API = '/api';

const store = {
  token: null,
  user: null,
};

function getToken() { return store.token || localStorage.getItem('token'); }
function getUser() {
  if (store.user) return store.user;
  const s = localStorage.getItem('user');
  return s ? JSON.parse(s) : null;
}
function setAuth(token, user) {
  store.token = token;
  store.user = user;
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
}
function clearAuth() {
  store.token = null;
  store.user = null;
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}

async function apiFetch(path, opts = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, { ...opts, headers });
  if (res.status === 401) {
    clearAuth();
    router();
    return null;
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error || 'Erro desconhecido');
  return data;
}

// Toast notifications
function showToast(msg, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  t.innerHTML = `<span>${icons[type]||''}</span><span>${msg}</span>`;
  container.appendChild(t);
  setTimeout(() => t.remove(), 4000);
}

// Modal
function openModal(contentHtml, onClose) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `<div class="modal">${contentHtml}</div>`;
  overlay.addEventListener('click', e => {
    if (e.target === overlay) { overlay.remove(); onClose && onClose(); }
  });
  document.body.appendChild(overlay);
  return overlay;
}
function closeModal() {
  const m = document.querySelector('.modal-overlay');
  if (m) m.remove();
}

// Relative time
function relativeTime(ts) {
  const diff = Date.now() - ts;
  if (diff < 60000) return 'agora';
  if (diff < 3600000) return `${Math.floor(diff/60000)}m atrás`;
  if (diff < 86400000) return `${Math.floor(diff/3600000)}h atrás`;
  return `${Math.floor(diff/86400000)}d atrás`;
}

// Status labels
const STATUS_LABELS = {
  pending: 'Pendente', accepted: 'Aceite', in_transit: 'Aceite',
  completed: 'Concluída', cancelled: 'Cancelada',
};
const STATUS_ICONS = { pending: '⏳', accepted: '🤝', in_transit: '🤝', completed: '🎉', cancelled: '❌' };
const TYPE_LABELS = { have_to_trade: 'Para Trocar', need: 'Preciso', have_double: 'Duplo' };

// Routes
const ROUTES = {
  '/': () => import('./pages/home.js').then(m => m.render()),
  '/catalog': () => import('./pages/catalog.js').then(m => m.render()),
  '/collection': () => import('./pages/collection.js').then(m => m.render()),
  '/trades': () => import('./pages/trades.js').then(m => m.render()),
  '/matches': () => import('./pages/matches.js').then(m => m.render()),
  '/listings': () => import('./pages/listings.js').then(m => m.render()),
  '/orders': () => import('./pages/orders.js').then(m => m.render()),
  '/notifications': () => import('./pages/notifications.js').then(m => m.render()),
  '/profile': () => import('./pages/profile.js').then(m => m.render()),
  '/admin': () => import('./pages/admin.js').then(m => m.render()),
  '/login': () => import('./pages/login.js').then(m => m.render()),
};

function getRoute() {
  const hash = window.location.hash.slice(1) || '/';
  const base = hash.split('?')[0];
  return base || '/';
}

async function router() {
  const route = getRoute();
  const user = getUser();

  if (!user && route !== '/login') {
    window.location.hash = '/login';
    return;
  }
  if (user && route === '/login') {
    window.location.hash = '/';
    return;
  }

  const fn = ROUTES[route];
  const main = document.getElementById('main-content');
  if (!main) return;

  if (fn) {
    main.innerHTML = '<div class="loading-center"><div class="spinner"></div></div>';
    try {
      await fn();
    } catch (e) {
      if (e.message?.includes('dynamically imported module') || e.message?.includes('Failed to fetch')) {
        // Module loading failed (network error / deployment) — reload to recover
        window.location.reload();
        return;
      }
      main.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><h3>Erro ao carregar página</h3><p>${e.message}</p><button class="btn btn-primary" style="margin-top:16px" onclick="window.location.reload()">Recarregar</button></div>`;
    }
  } else {
    main.innerHTML = '<div class="empty-state"><div class="empty-icon">🔍</div><h3>Página não encontrada</h3></div>';
  }

  updateNav(route);
}

function updateNav(route) {
  document.querySelectorAll('.nav-item[data-route]').forEach(el => {
    el.classList.toggle('active', el.dataset.route === route);
  });
  document.querySelectorAll('.bottom-tab[data-route]').forEach(el => {
    el.classList.toggle('active', el.dataset.route === route);
  });
}

function closeSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  sidebar?.classList.remove('open');
  overlay?.classList.remove('open');
}

// Sidebar nav clicks
function setupNav() {
  document.querySelectorAll('.nav-item[data-route]').forEach(el => {
    el.addEventListener('click', () => {
      window.location.hash = el.dataset.route;
      closeSidebar();
    });
  });

  // Mobile hamburger
  const hamburger = document.getElementById('hamburger');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  if (hamburger && sidebar) {
    hamburger.addEventListener('click', () => {
      sidebar.classList.toggle('open');
      if (overlay) overlay.classList.toggle('open');
    });
    if (overlay) {
      overlay.addEventListener('click', closeSidebar);
    }
    const closeBtn = document.getElementById('sidebar-close');
    if (closeBtn) closeBtn.addEventListener('click', closeSidebar);
  }

  // Bottom tab bar
  document.querySelectorAll('.bottom-tab[data-route]').forEach(el => {
    el.addEventListener('click', () => {
      window.location.hash = el.dataset.route;
      closeSidebar();
    });
  });

  // Logout
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      clearAuth();
      window.location.hash = '/login';
    });
  }

  // Update user pill
  const user = getUser();
  if (user) {
    const nameEl = document.getElementById('nav-username');
    const locEl = document.getElementById('nav-userloc');
    const avatarEl = document.getElementById('nav-avatar');
    if (nameEl) nameEl.textContent = user.username;
    if (locEl) locEl.textContent = user.location || '';
    if (avatarEl) avatarEl.textContent = (user.username || 'U')[0].toUpperCase();

    // Add admin nav link if user is admin
    if (user.is_admin) {
      const existingAdmin = document.querySelector('.nav-item[data-route="/admin"]');
      if (!existingAdmin) {
        const navSections = document.querySelectorAll('.nav-section');
        const lastSection = navSections[navSections.length - 1];
        if (lastSection) {
          const adminBtn = document.createElement('button');
          adminBtn.className = 'nav-item';
          adminBtn.dataset.route = '/admin';
          adminBtn.innerHTML = '<span class="nav-icon">🛡️</span> Admin';
          adminBtn.addEventListener('click', () => { window.location.hash = '/admin'; });
          lastSection.appendChild(adminBtn);
        }
      }
    }
  }
}

// Collection completion % in sidebar
async function updateCollectionPct() {
  try {
    const stats = await apiFetch('/stickers/collection/stats/me');
    if (!stats) return;
    const el = document.getElementById('nav-collection-pct');
    if (!el) return;
    el.textContent = `${stats.completion_pct}%`;
    el.style.opacity = '1';
  } catch {}
}

// Poll notification count
let notifInterval = null;
async function startNotifPolling() {
  async function poll() {
    try {
      const data = await apiFetch('/notifications/unread-count');
      if (!data) return;
      document.querySelectorAll('#notif-count, #notif-count-top').forEach(badge => {
        badge.textContent = data.count;
        badge.classList.toggle('visible', data.count > 0);
      });
    } catch {}
  }
  poll();
  notifInterval = setInterval(poll, 15000);
}

// Init
window.addEventListener('hashchange', router);
window.addEventListener('DOMContentLoaded', () => {
  const user = getUser();
  if (!user && window.location.hash !== '#/login') {
    window.location.hash = '/login';
  } else {
    setupNav();
    startNotifPolling();
    updateCollectionPct();
    router();
  }
});

export { apiFetch, getUser, getToken, setAuth, clearAuth, showToast, openModal, closeModal, relativeTime, STATUS_LABELS, STATUS_ICONS, TYPE_LABELS, updateCollectionPct };
