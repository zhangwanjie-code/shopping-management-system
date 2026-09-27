/**
 * products.js - 商品 + 库存管理
 */

'use strict';

const express = require('express');
const db = require('../db');
const router = express.Router();

// 列表（支持搜索/分类/库存预警过滤）
router.get('/', (req, res) => {
  const { search, category, low_stock, status } = req.query;
  const cond = [];
  const params = [];
  if (search) { cond.push('(name LIKE ? OR sku LIKE ?)'); params.push(`%${search}%`, `%${search}%`); }
  if (category) { cond.push('category = ?'); params.push(category); }
  if (status) { cond.push('status = ?'); params.push(status); }
  if (low_stock === '1') { cond.push('stock <= stock_alert'); }
  const where = cond.length ? 'WHERE ' + cond.join(' AND ') : '';
  const rows = db.prepare(`SELECT * FROM products ${where} ORDER BY id DESC`).all(...params);
  res.json(rows);
});

// 详情（含平均评分）
router.get('/:id', (req, res) => {
  const p = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!p) return res.status(404).json({ error: '商品不存在' });
  const avg = db.prepare('SELECT AVG(rating) as avg_rating, COUNT(*) as review_count FROM reviews WHERE product_id = ?').get(p.id);
  res.json({ ...p, avg_rating: avg.avg_rating || 0, review_count: avg.review_count });
});

// 新增商品
router.post('/', (req, res) => {
  const { name, sku, category, price, cost, stock, stock_alert, unit, status } = req.body;
  if (!name) return res.status(400).json({ error: '商品名必填' });
  const info = db.prepare(`INSERT INTO products (name, sku, category, price, cost, stock, stock_alert, unit, status)
    VALUES (?,?,?,?,?,?,?,?,?)`).run(
    name, sku || null, category || '', price || 0, cost || 0,
    stock || 0, stock_alert || 5, unit || '件', status || 'on'
  );
  res.json({ id: info.lastInsertRowid });
});

// 更新商品
router.put('/:id', (req, res) => {
  const p = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!p) return res.status(404).json({ error: '商品不存在' });
  const b = req.body;
  db.prepare(`UPDATE products SET name=?, sku=?, category=?, price=?, cost=?, stock=?, stock_alert=?, unit=?, status=? WHERE id=?`)
    .run(b.name ?? p.name, b.sku ?? p.sku, b.category ?? p.category, b.price ?? p.price,
      b.cost ?? p.cost, b.stock ?? p.stock, b.stock_alert ?? p.stock_alert,
      b.unit ?? p.unit, b.status ?? p.status, p.id);
  res.json({ ok: true });
});

// 删除商品
router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// 库存操作 in(入库)/out(出库)/adjust(盘点)
router.post('/:id/inventory', (req, res) => {
  const p = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!p) return res.status(404).json({ error: '商品不存在' });
  const { type, quantity, note } = req.body;
  const qty = parseInt(quantity, 10);
  if (!['in', 'out', 'adjust'].includes(type) || isNaN(qty)) return res.status(400).json({ error: '参数错误' });

  let newStock = p.stock;
  if (type === 'in') newStock += qty;
  else if (type === 'out') { newStock -= qty; if (newStock < 0) return res.status(400).json({ error: `库存不足，当前库存 ${p.stock}` }); }
  else newStock = qty;

  db.prepare('UPDATE products SET stock = ? WHERE id = ?').run(newStock, p.id);
  db.prepare('INSERT INTO inventory_logs (product_id, type, quantity, note) VALUES (?,?,?,?)').run(p.id, type, qty, note || null);
  res.json({ stock: newStock });
});

// 库存流水
router.get('/:id/logs', (req, res) => {
  const rows = db.prepare('SELECT * FROM inventory_logs WHERE product_id = ? ORDER BY id DESC LIMIT 100').all(req.params.id);
  res.json(rows);
});

// 商品评价列表
router.get('/:id/reviews', (req, res) => {
  const rows = db.prepare(`
    SELECT r.*, m.name as member_name
    FROM reviews r LEFT JOIN members m ON m.id = r.member_id
    WHERE r.product_id = ? ORDER BY r.id DESC`).all(req.params.id);
  res.json(rows);
});

module.exports = router;
