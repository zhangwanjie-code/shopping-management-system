/**
 * server.js - 店铺运营系统后端入口
 * Express + SQLite，托管前端静态文件 + REST API
 */

'use strict';

const express = require('express');
const path = require('path');
const app = express();
const db = require('./db');
const auth = require('./auth');
const { PERMISSION_GROUPS } = require('./permissions');

function shopName() {
  const row = db.prepare("SELECT value FROM settings WHERE key = 'shop_name'").get();
  return row ? row.value : '';
}

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// 按请求方法区分权限：GET → 查看权限，其它 → 编辑权限
function gate(viewPerm, editPerm) {
  return (req, res, next) => {
    auth.requirePerm(req.method === 'GET' ? viewPerm : editPerm)(req, res, next);
  };
}

// ─── 登录 / 登出 / 当前用户 ──────────────────────────────────────────────
app.post('/api/auth/login', (req, res) => {
  const result = auth.login(req.body.username, req.body.password);
  if (!result) return res.status(401).json({ error: '用户名或密码错误' });
  res.json({ ...result, shop_name: shopName() }); // { token, user, shop_name }
});

app.post('/api/auth/logout', (req, res) => {
  const h = req.headers.authorization || '';
  auth.logout(h.startsWith('Bearer ') ? h.slice(7) : null);
  res.json({ ok: true });
});

app.get('/api/auth/me', auth.requireAuth, (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      username: req.user.username,
      real_name: req.user.real_name,
      role_id: req.user.role_id,
      permissions: req.permissions
    },
    shop_name: shopName()
  });
});

// ─── 权限目录 ────────────────────────────────────────────────────────────
app.get('/api/permissions', auth.requireAuth, (req, res) => res.json(PERMISSION_GROUPS));

// ─── 业务模块（按权限控制）────────────────────────────────────────────────
app.use('/api/products', auth.requireAuth, gate('products:view', 'products:edit'), require('./routes/products'));
app.use('/api/inventory', auth.requireAuth, gate('products:view', 'products:edit'), require('./routes/inventory'));
app.use('/api/orders',   auth.requireAuth, gate('orders:view', 'orders:edit'), require('./routes/orders'));
app.use('/api/members',  auth.requireAuth, gate('members:view', 'members:edit'), require('./routes/members'));
app.use('/api/reviews',  auth.requireAuth, gate('reviews:view', 'reviews:edit'), require('./routes/reviews'));
app.use('/api/reports',  auth.requireAuth, gate('reports:view', 'reports:view'), require('./routes/reports'));

// ─── 用户 / 角色 / 系统（权限在各自路由内部校验）──────────────────────────
app.use('/api/users',  auth.requireAuth, require('./routes/users'));
app.use('/api/roles',  auth.requireAuth, require('./routes/roles'));
app.use('/api/system', auth.requireAuth, require('./routes/system'));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`[Shop] 店铺运营系统已启动: http://localhost:${PORT}`);
  console.log('[Shop] 默认管理员: admin / admin123');
});
