/**
 * users.js - 用户管理（多账号 + 角色绑定）
 */

'use strict';

const express = require('express');
const db = require('../db');
const auth = require('../auth');
const { makePassword } = require('../password');
const router = express.Router();

const isSuper = id => {
  const row = db.prepare('SELECT r.permissions FROM users u JOIN roles r ON r.id = u.role_id WHERE u.id = ?').get(id);
  if (!row) return false;
  try { return JSON.parse(row.permissions).includes('*'); } catch (e) { return false; }
};

const superAdminCount = () => {
  const rows = db.prepare('SELECT r.permissions FROM users u JOIN roles r ON r.id = u.role_id WHERE u.status = 1').all();
  return rows.filter(r => { try { return JSON.parse(r.permissions).includes('*'); } catch (e) { return false; } }).length;
};

// 列表
router.get('/', auth.requirePerm('users:view'), (req, res) => {
  const rows = db.prepare(`
    SELECT u.id, u.username, u.real_name, u.role_id, u.status, u.last_login, u.created_at, r.name as role_name
    FROM users u LEFT JOIN roles r ON r.id = u.role_id ORDER BY u.id`).all();
  res.json(rows);
});

// 新增
router.post('/', auth.requirePerm('users:edit'), (req, res) => {
  const { username, password, real_name, role_id, status } = req.body;
  if (!username || !password) return res.status(400).json({ error: '用户名和密码必填' });
  if (db.prepare('SELECT id FROM users WHERE username = ?').get(username)) return res.status(400).json({ error: '用户名已存在' });
  const info = db.prepare('INSERT INTO users (username, password_hash, real_name, role_id, status) VALUES (?,?,?,?,?)')
    .run(username, makePassword(password), real_name || '', role_id || null, status === 0 ? 0 : 1);
  res.json({ id: info.lastInsertRowid });
});

// 更新（姓名/角色/状态）
router.put('/:id', auth.requirePerm('users:edit'), (req, res) => {
  const u = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!u) return res.status(404).json({ error: '用户不存在' });
  const b = req.body;
  db.prepare('UPDATE users SET real_name = ?, role_id = ?, status = ? WHERE id = ?')
    .run(b.real_name ?? u.real_name, b.role_id ?? u.role_id, b.status === 0 ? 0 : 1, u.id);
  res.json({ ok: true });
});

// 重置密码
router.post('/:id/reset-password', auth.requirePerm('users:edit'), (req, res) => {
  const u = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!u) return res.status(404).json({ error: '用户不存在' });
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: '新密码必填' });
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(makePassword(password), u.id);
  res.json({ ok: true });
});

// 删除
router.delete('/:id', auth.requirePerm('users:edit'), (req, res) => {
  const id = parseInt(req.params.id, 10);
  const u = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  if (!u) return res.status(404).json({ error: '用户不存在' });
  if (req.user.id === id) return res.status(400).json({ error: '不能删除当前登录账号' });
  if (isSuper(id) && superAdminCount() <= 1) return res.status(400).json({ error: '不能删除最后一个超级管理员' });
  db.prepare('DELETE FROM users WHERE id = ?').run(id);
  res.json({ ok: true });
});

module.exports = router;
