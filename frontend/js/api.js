/**
 * api.js - fetch 封装 + 登录态
 */

'use strict';

window.Views = {};
window.UI = {};

const API = {
  token: localStorage.getItem('shop_token') || '',
  user: null,
  permissions: [],

  can(perm) { return this.permissions.includes(perm); },

  async req(method, path, body) {
    const opts = { method, headers: {} };
    if (body !== undefined) { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
    if (API.token) opts.headers['Authorization'] = 'Bearer ' + API.token;
    const res = await fetch('/api' + path, opts);
    const data = await res.json().catch(() => ({}));
    // 登录接口的 401 表示「账号或密码错误」，不能当成会话过期
    if (res.status === 401 && path !== '/auth/login') {
      localStorage.removeItem('shop_token'); API.token = '';
      API.user = null; API.permissions = [];
      document.getElementById('app').classList.add('hidden');
      document.getElementById('login').classList.remove('hidden');
      throw new Error('登录已过期');
    }
    if (!res.ok) throw new Error(data.error || '请求失败');
    return data;
  },

  get(p) { return API.req('GET', p); },
  post(p, b) { return API.req('POST', p, b); },
  put(p, b) { return API.req('PUT', p, b); },
  del(p) { return API.req('DELETE', p); }
};

window.API = API;
