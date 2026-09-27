/**
 * db.js - SQLite 数据库初始化与连接
 * 职责：建库、建表、提供全局 db 实例
 */

'use strict';

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { makePassword } = require('./password');

// 数据目录：项目根下的 data/，首次运行自动创建
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, 'shop.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ─── 建表 ──────────────────────────────────────────────────────────────────
db.exec(`
CREATE TABLE IF NOT EXISTS products (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT    NOT NULL,
  sku         TEXT,
  category    TEXT    DEFAULT '',
  price       REAL    NOT NULL DEFAULT 0,   -- 售价
  cost        REAL    NOT NULL DEFAULT 0,   -- 成本
  stock       INTEGER NOT NULL DEFAULT 0,   -- 库存
  stock_alert INTEGER NOT NULL DEFAULT 5,   -- 库存预警线
  unit        TEXT    DEFAULT '件',
  status      TEXT    DEFAULT 'on',         -- on 在售 / off 下架
  created_at  TEXT    DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS inventory_logs (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  type       TEXT NOT NULL,  -- in/out/adjust/order_sale/order_return
  quantity   INTEGER NOT NULL,
  note       TEXT,
  created_at TEXT DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS members (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  phone       TEXT,
  level       TEXT DEFAULT '普通',           -- 普通/白银/黄金/铂金
  points      INTEGER NOT NULL DEFAULT 0,   -- 积分
  balance     REAL    NOT NULL DEFAULT 0,   -- 储值余额
  score       INTEGER NOT NULL DEFAULT 0,   -- 评分(按消费累计)
  total_spent REAL    NOT NULL DEFAULT 0,   -- 累计消费
  created_at  TEXT DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS orders (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  order_no       TEXT NOT NULL,
  member_id      INTEGER,
  total_amount   REAL NOT NULL DEFAULT 0,
  discount       REAL NOT NULL DEFAULT 0,
  pay_amount     REAL NOT NULL DEFAULT 0,
  status         TEXT NOT NULL DEFAULT '待付款',  -- 待付款/已付款/已发货/已完成/已取消
  payment_method TEXT DEFAULT '现金',
  remark         TEXT,
  created_at     TEXT DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS order_items (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id   INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  quantity   INTEGER NOT NULL,
  price      REAL NOT NULL,
  subtotal   REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS reviews (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  member_id  INTEGER,
  order_id   INTEGER,
  rating     INTEGER NOT NULL,   -- 1~5 星
  content    TEXT,
  created_at TEXT DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS member_score_logs (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  member_id    INTEGER NOT NULL,
  score_before INTEGER NOT NULL,
  score_after  INTEGER NOT NULL,
  reason       TEXT,
  created_at   TEXT DEFAULT (datetime('now','localtime'))
);

CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews(product_id);
`);

// ─── 用户 / 角色 / 系统设置 ──────────────────────────────────────────────
db.exec(`
CREATE TABLE IF NOT EXISTS roles (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL UNIQUE,
  description TEXT DEFAULT '',
  permissions TEXT DEFAULT '[]',   -- JSON 数组，超级管理员存 ["*"]
  is_builtin  INTEGER DEFAULT 0,   -- 1 = 内置角色不可删除
  created_at  TEXT DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  username      TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  real_name     TEXT DEFAULT '',
  role_id       INTEGER,
  status        INTEGER DEFAULT 1,   -- 1 启用 / 0 禁用
  last_login    TEXT,
  created_at    TEXT DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT
);
`);

// ─── 首次运行：种子角色 / 默认管理员 / 系统设置 ──────────────────────────────
if (db.prepare('SELECT COUNT(*) as c FROM roles').get().c === 0) {
  const seed = db.transaction(() => {
    const superId = db.prepare("INSERT INTO roles (name, description, permissions, is_builtin) VALUES (?,?,?,1)")
      .run('超级管理员', '拥有全部权限', JSON.stringify(['*'])).lastInsertRowid;
    db.prepare("INSERT INTO roles (name, description, permissions, is_builtin) VALUES (?,?,?,1)")
      .run('店员', '日常营业，无用户/角色/系统管理权限', JSON.stringify([
        'products:view', 'products:edit', 'orders:view', 'orders:edit',
        'members:view', 'members:edit', 'reviews:view', 'reviews:edit', 'reports:view'
      ]));
    db.prepare('INSERT INTO users (username, password_hash, real_name, role_id, status) VALUES (?,?,?,?,1)')
      .run('admin', makePassword('admin123'), '超级管理员', superId);
    db.prepare("INSERT INTO settings (key, value) VALUES ('shop_name', '张万杰')").run();
  });
  seed();
}

module.exports = db;
