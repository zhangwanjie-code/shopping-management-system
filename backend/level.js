/**
 * level.js - 会员等级计算（按评分 score 定级）
 */

'use strict';

function levelOf(score) {
  if (score >= 20000) return '铂金';
  if (score >= 5000)  return '黄金';
  if (score >= 1000)  return '白银';
  return '普通';
}

module.exports = { levelOf };
