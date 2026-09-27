/**
 * system.js - 系统管理（设置 + 修改密码）
 */

'use strict';

const express = require('express');
const db = require('../db');
const auth = require('../auth');
const { makePassword, verify } = require('../password');
const router = express.Router();

// 读取设置
router.get('/settings', auth.requirePerm('system:view'), (req, res) => {
  const obj = {};
  db.prepare('SELECT * FROM settings').all().forEach(r => { obj[r.key] = r.value; });
  res.json(obj);
});

// 保存设置
router.put('/settings', auth.requirePerm('system:edit'), (req, res) => {
  const upsert = db.prepare('INSERT INTO settings (key, value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value = excluded.value');
  const tx = db.transaction(() => {
    for (const [k, v] of Object.entries(req.body || {})) {
      if (typeof v === 'string') upsert.run(k, v);
    }
  });
  tx();
  res.json({ ok: true });
});

// 修改自己的密码（登录即可，无需额外权限）
router.post('/change-password', (req, res) => {
  const { old_password, new_password } = req.body;
  if (!new_password) return res.status(400).json({ error: '新密码必填' });
  const u = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!verify(old_password || '', u.password_hash)) return res.status(400).json({ error: '原密码错误' });
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(makePassword(new_password), u.id);
  res.json({ ok: true });
});

module.exports = router;
