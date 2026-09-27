/**
 * app.js - 路由 / 导航 / 登录 / 通用 UI 工具
 */

'use strict';

const UI = window.UI;
const Views = window.Views;

// ── 工具 ──
UI.esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
UI.money = n => '¥' + (Number(n) || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
UI.debounce = (fn, ms = 300) => { let t; return function (...a) { clearTimeout(t); t = setTimeout(() => fn.apply(this, a), ms); }; };
UI.formData = container => {
  const out = {};
  container.querySelectorAll('[name]').forEach(el => { out[el.name] = el.value.trim(); });
  return out;
};
UI.toast = (msg, type = 'info') => {
  const t = document.createElement('div');
  t.className = 'toast ' + type;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2500);
};
UI.modal = (title, bodyHTML, onSubmit) => {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-head"><span>${UI.esc(title)}</span><button class="modal-close" type="button">×</button></div>
      <form class="modal-body">${bodyHTML}</form>
      <div class="modal-foot">
        <button type="button" class="btn btn-ghost" data-close>取消</button>
        <button type="button" class="btn btn-primary" data-ok>确定</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  const close = () => overlay.remove();
  overlay.querySelector('.modal-close').onclick = close;
  overlay.querySelector('[data-close]').onclick = close;
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  overlay.querySelector('[data-ok]').onclick = async () => {
    const btn = overlay.querySelector('[data-ok]');
    btn.disabled = true;
    try { await onSubmit(overlay.querySelector('.modal-body'), overlay); close(); }
    catch (e) { UI.toast(e.message, 'error'); }
    finally { btn.disabled = false; }
  };
  return overlay;
};
UI.levelBadge = level => {
  const cls = { 普通: 'lvl-normal', 白银: 'lvl-silver', 黄金: 'lvl-gold', 铂金: 'lvl-platinum' }[level] || 'lvl-normal';
  return `<span class="badge ${cls}">${UI.esc(level)}</span>`;
};
UI.statusBadge = status => {
  const cls = { 待付款: 'st-wait', 已付款: 'st-paid', 已发货: 'st-ship', 已完成: 'st-done', 已取消: 'st-cancel' }[status] || '';
  return `<span class="badge ${cls}">${UI.esc(status)}</span>`;
};

// ── 路由 ──
const PERM_MAP = {
  products: 'products:view', purchase: 'products:view', stockout: 'products:view',
  orders: 'orders:view', members: 'members:view',
  reviews: 'reviews:view', reports: 'reports:view',
  users: 'users:view', roles: 'roles:view', system: 'system:view'
};

function route() {
  const hash = location.hash.replace(/^#\/?/, '') || 'products';
  const name = hash.split('/')[0];
  document.querySelectorAll('.sidebar nav a').forEach(a => a.classList.toggle('active', a.dataset.nav === name));
  const content = document.getElementById('content');
  content.innerHTML = '';
  if (PERM_MAP[name] && !API.can(PERM_MAP[name])) {
    content.innerHTML = '<div class="empty">没有权限访问该页面</div>';
    return;
  }
  const view = Views[name];
  if (view) view.render(content);
}

function applyPermissions() {
  document.querySelectorAll('.sidebar nav a').forEach(a => {
    const perm = a.dataset.perm;
    if (perm) a.classList.toggle('hidden', !API.can(perm));
  });
}

function applyShopName(name) {
  if (!name) return;
  document.title = name;
  document.querySelectorAll('.shop-name').forEach(el => { el.textContent = name; });
}
UI.applyShopName = applyShopName;

function isLoggedIn() { return !!API.token; }
function hideLoading() {
  const el = document.getElementById('loading');
  if (el) el.classList.add('hidden');
}
function showLogin() {
  document.getElementById('login').classList.remove('hidden');
  document.getElementById('app').classList.add('hidden');
  hideLoading();
}
function showApp() {
  document.getElementById('login').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  hideLoading();
  applyPermissions();
  route();
}

// ── 登录 / 登出 ──
document.getElementById('login-form').addEventListener('submit', async e => {
  e.preventDefault();
  const username = e.target.username.value;
  const password = e.target.password.value;
  try {
    const data = await API.req('POST', '/auth/login', { username, password });
    API.token = data.token;
    API.user = data.user;
    API.permissions = data.user.permissions || [];
    localStorage.setItem('shop_token', data.token);
    applyShopName(data.shop_name);
    UI.toast('登录成功', 'success');
    showApp();
  } catch (err) { UI.toast(err.message, 'error'); }
});

document.getElementById('logout').addEventListener('click', async () => {
  try { await API.req('POST', '/auth/logout'); } catch (e) {}
  API.token = '';
  API.user = null;
  API.permissions = [];
  localStorage.removeItem('shop_token');
  location.hash = '';
  showLogin();
});

window.addEventListener('hashchange', () => { if (isLoggedIn()) route(); });

// ── 初始化（有 token 则拉取当前用户信息，否则显示登录）──
async function init() {
  if (!API.token) { showLogin(); return; }
  try {
    const data = await API.get('/auth/me');
    API.user = data.user;
    API.permissions = data.user.permissions || [];
    applyShopName(data.shop_name);
    showApp();
  } catch (e) { showLogin(); }
}

// 密码框显示/隐藏切换（眼睛图标）
UI.pwdToggle = input => {
  const wrap = document.createElement('div');
  wrap.className = 'pwd-wrap';
  input.parentNode.insertBefore(wrap, input);
  wrap.appendChild(input);
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'pwd-toggle';
  const EYE = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>';
  const EYE_OFF = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>';
  btn.innerHTML = EYE;
  btn.title = '显示/隐藏密码';
  wrap.appendChild(btn);
  btn.addEventListener('click', () => {
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    btn.innerHTML = show ? EYE_OFF : EYE;
    btn.title = show ? '隐藏密码' : '显示密码';
  });
};
const loginPwd = document.querySelector('#login-form input[type="password"]');
if (loginPwd) UI.pwdToggle(loginPwd);

init();
