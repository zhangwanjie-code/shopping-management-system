/**
 * reviews.js - 商品评价（会员给商品打分）
 */

'use strict';

const express = require('express');
const db = require('../db');
const router = express.Router();

// 评价列表（可按商品过滤）
router.get('/', (req, res) => {
  const { product_id } = req.query;
  const base = `SELECT r.*, p.name as product_name, m.name as member_name
    FROM reviews r
    LEFT JOIN products p ON p.id = r.product_id
    LEFT JOIN members m ON m.id = r.member_id`;
  let rows;
  if (product_id) {
    rows = db.prepare(`${base} WHERE r.product_id = ? ORDER BY r.id DESC`).all(product_id);
  } else {
    rows = db.prepare(`${base} ORDER BY r.id DESC LIMIT 200`).all();
  }
  res.json(rows);
});

// 新增评价
router.post('/', (req, res) => {
  const { product_id, member_id, order_id, rating, content } = req.body;
  const r = parseInt(rating, 10);
  if (!product_id || r < 1 || r > 5) return res.status(400).json({ error: '参数错误（评分需 1~5）' });
  db.prepare('INSERT INTO reviews (product_id, member_id, order_id, rating, content) VALUES (?,?,?,?,?)')
    .run(product_id, member_id || null, order_id || null, r, content || null);
  res.json({ ok: true });
});

module.exports = router;
