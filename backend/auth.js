/**
 * auth.js - 账号 + 角色 + 权限鉴权
 * 登录成功后发放 token（存内存），每次请求动态解析用户权限
 */

'use strict';

const crypto = require('crypto');
const db = require('./db');
const { verify } = require('./password');
const { ALL_KEYS } = require('./permissions');

const sessions = new Map(); // token -> userId

// 根据角色解析实际权限（超级管理员 ["*"] 展开为全部权限）
function resolvePermissions(roleId) {
  if (!roleId) return [];
  const role = db.prepare('SELECT permissions FROM roles WHERE id = ?').get(roleId);
  if (!role) return [];
  try {
    const p = JSON.parse(role.permissions);
    if (p.includes('*')) return [...ALL_KEYS];
    return p.filter(k => ALL_KEYS.includes(k));
  } catch (e) {
    return [];
  }
}

function publicUser(user) {
  const role = user.role_id ? db.prepare('SELECT name FROM roles WHERE id = ?').get(user.role_id) : null;
  return {
    id: user.id,
    username: user.username,
    real_name: user.real_name,
    role_id: user.role_id,
    role_name: role ? role.name : '',
    permissions: resolvePermissions(user.role_id)
  };
}

function login(username, password) {
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user || user.status !== 1 || !verify(password, user.password_hash)) return null;
  const token = crypto.randomBytes(24).toString('hex');
  sessions.set(token, user.id);
  db.prepare('UPDATE users SET last_login = datetime(\'now\',\'localtime\') WHERE id = ?').run(user.id);
  return { token, user: publicUser(user) };
}

function logout(token) {
  if (token) sessions.delete(token);
}

function currentUser(req) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  const userId = token && sessions.get(token);
  if (!userId) return null;
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!user || user.status !== 1) return null;
  return user;
}

function requireAuth(req, res, next) {
  const user = currentUser(req);
  if (!user) return res.status(401).json({ error: '未登录或登录已过期' });
  req.user = user;
  req.permissions = resolvePermissions(user.role_id);
  next();
}

function requirePerm(perm) {
  return (req, res, next) => {
    if (req.permissions.includes(perm)) return next();
    return res.status(403).json({ error: '没有权限执行此操作' });
  };
}

module.exports = { login, logout, requireAuth, requirePerm, currentUser, resolvePermissions };
