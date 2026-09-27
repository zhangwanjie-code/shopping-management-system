/**
 * orders.js - 订单 / 收银结算
 */

'use strict';

const express = require('express');
const db = require('../db');
const { levelOf } = require('../level');
const router = express.Router();

function genOrderNo() {
  const d = new Date();
  const p = n => String(n).padStart(2, '0');
  return `SO${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}${Math.floor(Math.random() * 1000)}`;
}

// 列表
router.get('/', (req, res) => {
  const { status, search } = req.query;
  const cond = [];
  const params = [];
  if (status) { cond.push('o.status = ?'); params.push(status); }
  if (search) { cond.push('(o.order_no LIKE ? OR m.name LIKE ?)'); params.push(`%${search}%`, `%${search}%`); }
  const where = cond.length ? 'WHERE ' + cond.join(' AND ') : '';
  const rows = db.prepare(`
    SELECT o.*, m.name as member_name,
      (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) as item_count
    FROM orders o LEFT JOIN members m ON m.id = o.member_id
    ${where} ORDER BY o.id DESC LIMIT 200`).all(...params);
  res.json(rows);
});

// 创建订单（结算：扣库存 + 给会员加积分/评分/等级）
router.post('/', (req, res) => {
  const { member_id, items, discount, payment_method, remark } = req.body;
  if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: '请选择商品' });

  const createOrder = db.transaction(() => {
    // 校验库存并计算总额
    let total = 0;
    const resolved = [];
    for (const it of items) {
      const p = db.prepare('SELECT * FROM products WHERE id = ?').get(it.product_id);
      if (!p) throw new Error('商品不存在');
      const qty = parseInt(it.quantity, 10) || 0;
      if (qty <= 0) throw new Error('数量错误');
      if (p.stock < qty) throw new Error(`「${p.name}」库存不足（当前 ${p.stock}）`);
      const subtotal = p.price * qty;
      total += subtotal;
      resolved.push({ p, qty, subtotal });
    }
    const discountAmt = parseFloat(discount) || 0;
    const pay = Math.max(0, total - discountAmt);

    const orderNo = genOrderNo();
    const info = db.prepare(`INSERT INTO orders (order_no, member_id, total_amount, discount, pay_amount, status, payment_method, remark)
      VALUES (?,?,?,?,?,?,?,?)`).run(orderNo, member_id || null, total, discountAmt, pay, '已付款', payment_method || '现金', remark || null);
    const orderId = info.lastInsertRowid;

    for (const { p, qty, subtotal } of resolved) {
      db.prepare('INSERT INTO order_items (order_id, product_id, quantity, price, subtotal) VALUES (?,?,?,?,?)')
        .run(orderId, p.id, qty, p.price, subtotal);
      db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?').run(qty, p.id);
      db.prepare('INSERT INTO inventory_logs (product_id, type, quantity, note) VALUES (?,?,?,?)')
        .run(p.id, 'order_sale', qty, `订单 ${orderNo}`);
    }

    // 会员积分/评分/累计消费/等级
    if (member_id) {
      const m = db.prepare('SELECT * FROM members WHERE id = ?').get(member_id);
      if (m) {
        const newPoints = m.points + Math.floor(pay);
        const newScore = m.score + Math.floor(pay);
        const newSpent = m.total_spent + pay;
        const newLevel = levelOf(newScore);
        db.prepare('UPDATE members SET points=?, score=?, total_spent=?, level=? WHERE id=?')
          .run(newPoints, newScore, newSpent, newLevel, m.id);
        db.prepare('INSERT INTO member_score_logs (member_id, score_before, score_after, reason) VALUES (?,?,?,?)')
          .run(m.id, m.score, newScore, `消费 ${pay} 元`);
      }
    }
    return orderId;
  });

  try {
    const orderId = createOrder();
    res.json({ id: orderId });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// 详情
router.get('/:id', (req, res) => {
  const o = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!o) return res.status(404).json({ error: '订单不存在' });
  const items = db.prepare(`
    SELECT oi.*, p.name as product_name FROM order_items oi
    LEFT JOIN products p ON p.id = oi.product_id WHERE oi.order_id = ?`).all(o.id);
  const member = o.member_id ? db.prepare('SELECT id, name, phone FROM members WHERE id = ?').get(o.member_id) : null;
  res.json({ ...o, items, member });
});

// 状态流转
router.put('/:id/status', (req, res) => {
  const o = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!o) return res.status(404).json({ error: '订单不存在' });
  const { status } = req.body;
  const allowed = ['待付款', '已付款', '已发货', '已完成', '已取消'];
  if (!allowed.includes(status)) return res.status(400).json({ error: '状态无效' });
  db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, o.id);
  res.json({ ok: true });
});

// 取消订单（回补库存 + 回退积分）
router.post('/:id/cancel', (req, res) => {
  const o = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!o) return res.status(404).json({ error: '订单不存在' });
  if (o.status === '已取消') return res.status(400).json({ error: '订单已取消' });

  const cancel = db.transaction(() => {
    const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(o.id);
    for (const it of items) {
      db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?').run(it.quantity, it.product_id);
      db.prepare('INSERT INTO inventory_logs (product_id, type, quantity, note) VALUES (?,?,?,?)')
        .run(it.product_id, 'order_return', it.quantity, `取消订单 ${o.order_no}`);
    }
    if (o.member_id) {
      const m = db.prepare('SELECT * FROM members WHERE id = ?').get(o.member_id);
      if (m) {
        const pts = Math.floor(o.pay_amount);
        const newPoints = Math.max(0, m.points - pts);
        const newScore = Math.max(0, m.score - pts);
        const newSpent = Math.max(0, m.total_spent - o.pay_amount);
        db.prepare('UPDATE members SET points=?, score=?, total_spent=?, level=? WHERE id=?')
          .run(newPoints, newScore, newSpent, levelOf(newScore), m.id);
      }
    }
    db.prepare('UPDATE orders SET status = ? WHERE id = ?').run('已取消', o.id);
  });

  cancel();
  res.json({ ok: true });
});

module.exports = router;
