/**
 * reports.js - 销售统计报表
 */

'use strict';

const express = require('express');
const db = require('../db');
const router = express.Router();

// 概览卡片
router.get('/summary', (req, res) => {
  const paid = db.prepare("SELECT COALESCE(SUM(pay_amount),0) as revenue, COUNT(*) as cnt FROM orders WHERE status != '已取消'").get();
  res.json({
    revenue: paid.revenue,
    order_count: paid.cnt,
    avg_order: paid.cnt ? Math.round(paid.revenue / paid.cnt * 100) / 100 : 0,
    product_count: db.prepare('SELECT COUNT(*) as c FROM products').get().c,
    member_count: db.prepare('SELECT COUNT(*) as c FROM members').get().c,
    low_stock_count: db.prepare('SELECT COUNT(*) as c FROM products WHERE stock <= stock_alert').get().c
  });
});

// 销售趋势（最近30天，按日）
router.get('/trend', (req, res) => {
  const rows = db.prepare(`
    SELECT substr(created_at,1,10) as day, COALESCE(SUM(pay_amount),0) as revenue, COUNT(*) as cnt
    FROM orders WHERE status != '已取消'
    GROUP BY day ORDER BY day DESC LIMIT 30`).all();
  res.json(rows.reverse());
});

// 畅销商品 TOP10
router.get('/top-products', (req, res) => {
  const rows = db.prepare(`
    SELECT p.name, SUM(oi.quantity) as qty, SUM(oi.subtotal) as amount
    FROM order_items oi
    JOIN products p ON p.id = oi.product_id
    JOIN orders o ON o.id = oi.order_id AND o.status != '已取消'
    GROUP BY oi.product_id ORDER BY qty DESC LIMIT 10`).all();
  res.json(rows);
});

// 会员消费排行
router.get('/member-ranking', (req, res) => {
  const rows = db.prepare(`
    SELECT m.name, m.level, m.total_spent, m.points, m.score
    FROM members m ORDER BY m.total_spent DESC LIMIT 10`).all();
  res.json(rows);
});

// 库存预警清单
router.get('/low-stock', (req, res) => {
  const rows = db.prepare('SELECT id, name, stock, stock_alert FROM products WHERE stock <= stock_alert ORDER BY stock ASC').all();
  res.json(rows);
});

module.exports = router;
