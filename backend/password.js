/**
 * password.js - 密码加盐哈希（scrypt，无需额外依赖）
 * 存储格式： "salt:hash"（均为 hex）
 */

'use strict';

const crypto = require('crypto');

function makeSalt() {
  return crypto.randomBytes(16).toString('hex');
}

function hash(password, salt) {
  return crypto.scryptSync(String(password), salt, 32).toString('hex');
}

// 生成存储字符串
function makePassword(password) {
  const salt = makeSalt();
  return `${salt}:${hash(password, salt)}`;
}

// 校验
function verify(password, stored) {
  const [salt, h] = String(stored || '').split(':');
  if (!salt || !h) return false;
  const a = Buffer.from(hash(password, salt), 'hex');
  const b = Buffer.from(h, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

module.exports = { makePassword, verify };
