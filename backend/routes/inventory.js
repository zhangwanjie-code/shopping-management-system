/**
 * inventory.js - 进货(入库) / 出货(出库) 与库存流水
 */

'use strict';

const express = require('express');
const db = require('../db');
const router = express.Router();

// 库存流水（可按 type 过滤：in/out/all）
router.get('/logs', (req, res) => {
  const { type } = req.query;
  const cond = [];
  const params = [];
  if (type && type !== 'all') { cond.push('l.type = ?'); params.push(type); }
  const where = cond.length ? 'WHERE ' + cond.join(' AND ') : '';
  const rows = db.prepare(`
    SELECT l.id, l.type, l.quantity, l.note, l.created_at,
           p.name as product_name, p.unit as unit
    FROM inventory_logs l LEFT JOIN products p ON p.id = l.product_id
    ${where} ORDER BY l.id DESC LIMIT 300`).all(...params);
  res.json(rows);
});

// 进货入库
router.post('/in', (req, res) => {
  const { product_id, quantity, note } = req.body;
  const p = db.prepare('SELECT * FROM products WHERE id = ?').get(product_id);
  if (!p) return res.status(404).json({ error: '商品不存在' });
  const qty = parseInt(quantity, 10);
  if (isNaN(qty) || qty <= 0) return res.status(400).json({ error: '数量必须为正整数' });
  db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?').run(qty, p.id);
  db.prepare('INSERT INTO inventory_logs (product_id, type, quantity, note) VALUES (?,?,?,?)')
    .run(p.id, 'in', qty, note || null);
  res.json({ ok: true });
});

// 出货出库
router.post('/out', (req, res) => {
  const { product_id, quantity, note } = req.body;
  const p = db.prepare('SELECT * FROM products WHERE id = ?').get(product_id);
  if (!p) return res.status(404).json({ error: '商品不存在' });
  const qty = parseInt(quantity, 10);
  if (isNaN(qty) || qty <= 0) return res.status(400).json({ error: '数量必须为正整数' });
  if (p.stock < qty) return res.status(400).json({ error: `库存不足，当前库存 ${p.stock}` });
  db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?').run(qty, p.id);
  db.prepare('INSERT INTO inventory_logs (product_id, type, quantity, note) VALUES (?,?,?,?)')
    .run(p.id, 'out', qty, note || null);
  res.json({ ok: true });
});

module.exports = router;
