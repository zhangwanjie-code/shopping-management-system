/**
 * members.js - 会员管理（含充值/积分/评分分级）
 */

'use strict';

const express = require('express');
const db = require('../db');
const { levelOf } = require('../level');
const router = express.Router();

// 列表
router.get('/', (req, res) => {
  const { search } = req.query;
  let rows;
  if (search) {
    rows = db.prepare('SELECT * FROM members WHERE name LIKE ? OR phone LIKE ? ORDER BY id DESC').all(`%${search}%`, `%${search}%`);
  } else {
    rows = db.prepare('SELECT * FROM members ORDER BY id DESC').all();
  }
  res.json(rows);
});

// 新增
router.post('/', (req, res) => {
  const { name, phone } = req.body;
  if (!name) return res.status(400).json({ error: '会员名必填' });
  const info = db.prepare('INSERT INTO members (name, phone) VALUES (?,?)').run(name, phone || null);
  res.json({ id: info.lastInsertRowid });
});

// 详情（含订单和评分流水）
router.get('/:id', (req, res) => {
  const m = db.prepare('SELECT * FROM members WHERE id = ?').get(req.params.id);
  if (!m) return res.status(404).json({ error: '会员不存在' });
  const orders = db.prepare('SELECT id, order_no, pay_amount, status, created_at FROM orders WHERE member_id = ? ORDER BY id DESC LIMIT 50').all(m.id);
  const scoreLogs = db.prepare('SELECT * FROM member_score_logs WHERE member_id = ? ORDER BY id DESC LIMIT 50').all(m.id);
  res.json({ ...m, orders, score_logs: scoreLogs });
});

// 更新基本信息
router.put('/:id', (req, res) => {
  const m = db.prepare('SELECT * FROM members WHERE id = ?').get(req.params.id);
  if (!m) return res.status(404).json({ error: '会员不存在' });
  const b = req.body;
  db.prepare('UPDATE members SET name=?, phone=? WHERE id=?').run(b.name ?? m.name, b.phone ?? m.phone, m.id);
  res.json({ ok: true });
});

// 删除
router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM members WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// 充值（储值余额）
router.post('/:id/recharge', (req, res) => {
  const m = db.prepare('SELECT * FROM members WHERE id = ?').get(req.params.id);
  if (!m) return res.status(404).json({ error: '会员不存在' });
  const amount = parseFloat(req.body.amount) || 0;
  if (amount <= 0) return res.status(400).json({ error: '金额错误' });
  db.prepare('UPDATE members SET balance = balance + ? WHERE id = ?').run(amount, m.id);
  res.json({ balance: m.balance + amount });
});

// 积分加减
router.post('/:id/points', (req, res) => {
  const m = db.prepare('SELECT * FROM members WHERE id = ?').get(req.params.id);
  if (!m) return res.status(404).json({ error: '会员不存在' });
  const delta = parseInt(req.body.delta, 10) || 0;
  const newPoints = Math.max(0, m.points + delta);
  db.prepare('UPDATE members SET points = ? WHERE id = ?').run(newPoints, m.id);
  res.json({ points: newPoints });
});

// 手动调整评分（自动重算等级）
router.post('/:id/score', (req, res) => {
  const m = db.prepare('SELECT * FROM members WHERE id = ?').get(req.params.id);
  if (!m) return res.status(404).json({ error: '会员不存在' });
  const newScore = parseInt(req.body.score, 10);
  if (isNaN(newScore) || newScore < 0) return res.status(400).json({ error: '评分错误' });
  const newLevel = levelOf(newScore);
  db.prepare('UPDATE members SET score = ?, level = ? WHERE id = ?').run(newScore, newLevel, m.id);
  db.prepare('INSERT INTO member_score_logs (member_id, score_before, score_after, reason) VALUES (?,?,?,?)')
    .run(m.id, m.score, newScore, '手动调整');
  res.json({ score: newScore, level: newLevel });
});

module.exports = router;
