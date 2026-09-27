/**
 * reports.js - 销售统计报表视图
 */

'use strict';

Views.reports = {
  charts: [],

  async render(root) {
    root.innerHTML = `
      <div class="page-head"><h2>销售统计报表</h2></div>
      <div class="cards" id="rp-cards"></div>
      <div class="grid2">
        <div class="panel"><h3>销售趋势（近30天）</h3><div style="height:260px"><canvas id="rp-trend"></canvas></div></div>
        <div class="panel"><h3>畅销商品 TOP10</h3><div style="height:260px"><canvas id="rp-top"></canvas></div></div>
      </div>
      <div class="grid2">
        <div class="panel"><h3>会员消费排行</h3><div class="table-wrap"><table class="table" id="rp-rank"></table></div></div>
        <div class="panel"><h3>库存预警</h3><div class="table-wrap"><table class="table" id="rp-low"></table></div></div>
      </div>`;

    this.charts.forEach(c => c.destroy());
    this.charts = [];

    const [summary, trend, top, rank, low] = await Promise.all([
      API.get('/reports/summary'),
      API.get('/reports/trend'),
      API.get('/reports/top-products'),
      API.get('/reports/member-ranking'),
      API.get('/reports/low-stock')
    ]);

    root.querySelector('#rp-cards').innerHTML = `
      <div class="card"><div class="card-label">总营业额</div><div class="card-val">${UI.money(summary.revenue)}</div></div>
      <div class="card"><div class="card-label">订单数</div><div class="card-val">${summary.order_count}</div></div>
      <div class="card"><div class="card-label">客单价</div><div class="card-val">${UI.money(summary.avg_order)}</div></div>
      <div class="card"><div class="card-label">商品数</div><div class="card-val">${summary.product_count}</div></div>
      <div class="card"><div class="card-label">会员数</div><div class="card-val">${summary.member_count}</div></div>
      <div class="card"><div class="card-label">库存预警</div><div class="card-val">${summary.low_stock_count}</div></div>`;

    if (typeof Chart !== 'undefined') {
      if (trend.length) {
        this.charts.push(new Chart(root.querySelector('#rp-trend'), {
          type: 'line',
          data: { labels: trend.map(t => t.day), datasets: [{ label: '营业额', data: trend.map(t => t.revenue), borderColor: '#4f6ef7', backgroundColor: 'rgba(79,110,247,.12)', fill: true, tension: .3 }] },
          options: { plugins: { legend: { display: false } }, responsive: true, maintainAspectRatio: false }
        }));
      }
      if (top.length) {
        this.charts.push(new Chart(root.querySelector('#rp-top'), {
          type: 'bar',
          data: { labels: top.map(t => t.name), datasets: [{ label: '销量', data: top.map(t => t.qty), backgroundColor: '#4f6ef7' }] },
          options: { plugins: { legend: { display: false } }, responsive: true, maintainAspectRatio: false }
        }));
      }
    }

    root.querySelector('#rp-rank').innerHTML = `
      <thead><tr><th>会员</th><th>等级</th><th>累计消费</th><th>积分</th><th>评分</th></tr></thead>
      <tbody>${rank.map(m => `<tr><td>${UI.esc(m.name)}</td><td>${UI.levelBadge(m.level)}</td><td>${UI.money(m.total_spent)}</td><td>${m.points}</td><td>${m.score}</td></tr>`).join('') || '<tr><td colspan="5" class="empty">暂无数据</td></tr>'}</tbody>`;

    root.querySelector('#rp-low').innerHTML = `
      <thead><tr><th>商品</th><th>库存</th><th>预警线</th></tr></thead>
      <tbody>${low.map(p => `<tr><td>${UI.esc(p.name)}</td><td class="text-warn">${p.stock}</td><td>${p.stock_alert}</td></tr>`).join('') || '<tr><td colspan="3" class="empty">无预警</td></tr>'}</tbody>`;
  }
};
