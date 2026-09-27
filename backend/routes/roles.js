/**
 * roles.js - 角色 / 权限管理
 */

'use strict';

const express = require('express');
const db = require('../db');
const auth = require('../auth');
const router = express.Router();

const safeParse = s => { try { return JSON.parse(s); } catch (e) { return []; } };

// 列表（含用户数）
router.get('/', auth.requirePerm('roles:view'), (req, res) => {
  const rows = db.prepare('SELECT * FROM roles ORDER BY id').all();
  res.json(rows.map(r => ({
    ...r,
    permissions: safeParse(r.permissions),
    user_count: db.prepare('SELECT COUNT(*) as c FROM users WHERE role_id = ?').get(r.id).c
  })));
});

// 新增
router.post('/', auth.requirePerm('roles:edit'), (req, res) => {
  const { name, description, permissions } = req.body;
  if (!name) return res.status(400).json({ error: '角色名必填' });
  if (db.prepare('SELECT id FROM roles WHERE name = ?').get(name)) return res.status(400).json({ error: '角色名已存在' });
  const info = db.prepare('INSERT INTO roles (name, description, permissions) VALUES (?,?,?)')
    .run(name, description || '', JSON.stringify(Array.isArray(permissions) ? permissions : []));
  res.json({ id: info.lastInsertRowid });
});

// 更新
router.put('/:id', auth.requirePerm('roles:edit'), (req, res) => {
  const r = db.prepare('SELECT * FROM roles WHERE id = ?').get(req.params.id);
  if (!r) return res.status(404).json({ error: '角色不存在' });
  const b = req.body;
  db.prepare('UPDATE roles SET name = ?, description = ?, permissions = ? WHERE id = ?')
    .run(b.name ?? r.name, b.description ?? r.description,
      JSON.stringify(Array.isArray(b.permissions) ? b.permissions : safeParse(r.permissions)), r.id);
  res.json({ ok: true });
});

// 删除
router.delete('/:id', auth.requirePerm('roles:edit'), (req, res) => {
  const id = parseInt(req.params.id, 10);
  const r = db.prepare('SELECT * FROM roles WHERE id = ?').get(id);
  if (!r) return res.status(404).json({ error: '角色不存在' });
  if (r.is_builtin) return res.status(400).json({ error: '内置角色不可删除' });
  if (db.prepare('SELECT COUNT(*) as c FROM users WHERE role_id = ?').get(id).c > 0) return res.status(400).json({ error: '该角色下还有用户，不能删除' });
  db.prepare('DELETE FROM roles WHERE id = ?').run(id);
  res.json({ ok: true });
});

module.exports = router;
