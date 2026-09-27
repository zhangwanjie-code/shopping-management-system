/**
 * members.js - 会员管理视图
 */

'use strict';

Views.members = {
  render(root) {
    root.innerHTML = `
      <div class="page-head">
        <h2>会员管理</h2>
        <div class="toolbar">
          <input id="m-search" class="input" placeholder="搜索姓名/手机号">
          <button class="btn btn-primary" id="m-add">新增会员</button>
        </div>
      </div>
      <div class="table-wrap"><table class="table">
        <thead><tr><th>ID</th><th>姓名</th><th>手机号</th><th>等级</th><th>积分</th><th>余额</th><th>评分</th><th>累计消费</th><th>操作</th></tr></thead>
        <tbody id="m-body"></tbody>
      </table></div>`;

    const load = async () => {
      const search = root.querySelector('#m-search').value;
      const list = await API.get('/members' + (search ? '?search=' + encodeURIComponent(search) : ''));
      const tbody = root.querySelector('#m-body');
      if (!list.length) { tbody.innerHTML = '<tr><td colspan="9" class="empty">暂无会员</td></tr>'; return; }
      tbody.innerHTML = list.map(m => `
        <tr>
          <td>${m.id}</td>
          <td><b>${UI.esc(m.name)}</b></td>
          <td>${UI.esc(m.phone || '-')}</td>
          <td>${UI.levelBadge(m.level)}</td>
          <td>${m.points}</td>
          <td>${UI.money(m.balance)}</td>
          <td>${m.score}</td>
          <td>${UI.money(m.total_spent)}</td>
          <td class="ops">
            <button class="mini" data-recharge="${m.id}">充值</button>
            <button class="mini" data-points="${m.id}">积分</button>
            <button class="mini" data-score="${m.id}">评分</button>
            <button class="mini" data-view="${m.id}">详情</button>
            <button class="mini danger" data-del="${m.id}">删除</button>
          </td>
        </tr>`).join('');
    };

    const reload = () => Views.members.render(document.getElementById('content'));

    root.querySelector('#m-search').addEventListener('input', UI.debounce(load, 300));
    root.querySelector('#m-add').addEventListener('click', () => this.edit());
    root.querySelector('#m-body').addEventListener('click', e => {
      if (e.target.dataset.recharge) this.recharge(e.target.dataset.recharge);
      else if (e.target.dataset.points) this.points(e.target.dataset.points);
      else if (e.target.dataset.score) this.score(e.target.dataset.score);
      else if (e.target.dataset.view) this.detail(e.target.dataset.view);
      else if (e.target.dataset.del) this.del(e.target.dataset.del);
    });

    load();
  },

  async edit() {
    UI.modal('新增会员', `
      <label>姓名 *</label><input class="input" name="name">
      <label>手机号</label><input class="input" name="phone">`, async form => {
        const d = UI.formData(form);
        if (!d.name) throw new Error('会员名必填');
        await API.post('/members', d);
        UI.toast('已新增', 'success');
        Views.members.render(document.getElementById('content'));
      });
  },

  async recharge(id) {
    const amt = prompt('充值金额：', '');
    if (amt === null) return;
    await API.post(`/members/${id}/recharge`, { amount: parseFloat(amt) || 0 });
    UI.toast('充值成功', 'success');
    Views.members.render(document.getElementById('content'));
  },

  async points(id) {
    const delta = prompt('积分调整（正数加 / 负数减）：', '');
    if (delta === null) return;
    await API.post(`/members/${id}/points`, { delta: parseInt(delta, 10) || 0 });
    UI.toast('积分已调整', 'success');
    Views.members.render(document.getElementById('content'));
  },

  async score(id) {
    const m = await API.get('/members/' + id);
    const s = prompt(`调整评分（当前 ${m.score}，等级 ${m.level}）：`, m.score);
    if (s === null) return;
    await API.post(`/members/${id}/score`, { score: parseInt(s, 10) });
    UI.toast('评分已调整，等级已刷新', 'success');
    Views.members.render(document.getElementById('content'));
  },

  async detail(id) {
    const m = await API.get('/members/' + id);
    UI.modal(`会员 ${m.name}`, `
      <div class="kv"><span>等级</span><b>${UI.levelBadge(m.level)}</b></div>
      <div class="kv"><span>积分</span><b>${m.points}</b></div>
      <div class="kv"><span>余额</span><b>${UI.money(m.balance)}</b></div>
      <div class="kv"><span>评分</span><b>${m.score}</b></div>
      <div class="kv"><span>累计消费</span><b>${UI.money(m.total_spent)}</b></div>
      <h4>最近订单</h4>
      <table class="table"><thead><tr><th>订单号</th><th>金额</th><th>状态</th><th>时间</th></tr></thead>
        <tbody>${m.orders.map(o => `<tr><td>${UI.esc(o.order_no)}</td><td>${UI.money(o.pay_amount)}</td><td>${UI.statusBadge(o.status)}</td><td class="muted">${UI.esc(o.created_at)}</td></tr>`).join('') || '<tr><td colspan="4" class="empty">无订单</td></tr>'}</tbody></table>
      <h4>评分流水</h4>
      <table class="table"><thead><tr><th>前</th><th>后</th><th>原因</th><th>时间</th></tr></thead>
        <tbody>${m.score_logs.map(l => `<tr><td>${l.score_before}</td><td>${l.score_after}</td><td>${UI.esc(l.reason)}</td><td class="muted">${UI.esc(l.created_at)}</td></tr>`).join('') || '<tr><td colspan="4" class="empty">无流水</td></tr>'}</tbody></table>`, async () => {});
  },

  async del(id) {
    if (!confirm('确定删除该会员？')) return;
    await API.del('/members/' + id);
    UI.toast('已删除', 'success');
    Views.members.render(document.getElementById('content'));
  }
};
