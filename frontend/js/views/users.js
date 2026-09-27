/**
 * users.js - 用户管理视图
 */

'use strict';

Views.users = {
  async render(root) {
    root.innerHTML = `
      <div class="page-head">
        <h2>用户管理</h2>
        <div class="toolbar"><button class="btn btn-primary" id="u-add">新增用户</button></div>
      </div>
      <div class="table-wrap"><table class="table">
        <thead><tr><th>ID</th><th>用户名</th><th>姓名</th><th>角色</th><th>状态</th><th>最后登录</th><th>操作</th></tr></thead>
        <tbody id="u-body"></tbody>
      </table></div>`;

    const reload = () => Views.users.render(document.getElementById('content'));

    const load = async () => {
      const list = await API.get('/users');
      const tbody = root.querySelector('#u-body');
      if (!list.length) { tbody.innerHTML = '<tr><td colspan="7" class="empty">暂无用户</td></tr>'; return; }
      tbody.innerHTML = list.map(u => `
        <tr>
          <td>${u.id}</td>
          <td><b>${UI.esc(u.username)}</b>${u.id === (API.user && API.user.id) ? ' <span class="muted">(我)</span>' : ''}</td>
          <td>${UI.esc(u.real_name || '-')}</td>
          <td>${UI.esc(u.role_name || '-')}</td>
          <td>${u.status === 1 ? '<span class="badge st-done">启用</span>' : '<span class="badge st-cancel">禁用</span>'}</td>
          <td class="muted">${UI.esc(u.last_login || '-')}</td>
          <td class="ops">
            <button class="mini" data-edit="${u.id}">编辑</button>
            <button class="mini" data-reset="${u.id}">重置密码</button>
            <button class="mini" data-toggle="${u.id}">${u.status === 1 ? '禁用' : '启用'}</button>
            <button class="mini danger" data-del="${u.id}">删除</button>
          </td>
        </tr>`).join('');
    };

    root.querySelector('#u-add').addEventListener('click', () => this.edit());
    root.querySelector('#u-body').addEventListener('click', e => {
      const t = e.target;
      if (t.dataset.edit) this.edit(t.dataset.edit);
      else if (t.dataset.reset) this.resetPassword(t.dataset.reset);
      else if (t.dataset.toggle) this.toggle(t.dataset.toggle);
      else if (t.dataset.del) this.del(t.dataset.del);
    });

    load();
  },

  async roles() {
    try { return await API.get('/roles'); } catch (e) { return []; }
  },

  async edit(id) {
    const roles = await this.roles();
    let u = { username: '', real_name: '', role_id: '', status: 1 };
    if (id) {
      const list = await API.get('/users');
      u = list.find(x => x.id === parseInt(id, 10)) || u;
    }
    const roleOptions = roles.map(r => `<option value="${r.id}" ${u.role_id === r.id ? 'selected' : ''}>${UI.esc(r.name)}</option>`).join('');
    UI.modal(id ? '编辑用户' : '新增用户', `
      ${id ? '' : '<label>用户名 *</label><input class="input" name="username" value="' + UI.esc(u.username) + '">'}
      ${id ? '' : '<label>密码 *</label><input class="input" type="password" name="password">'}
      <label>姓名</label><input class="input" name="real_name" value="${UI.esc(u.real_name || '')}">
      <label>角色</label><select class="input" name="role_id">${roleOptions}</select>
      <label>状态</label><select class="input" name="status">
        <option value="1" ${u.status !== 0 ? 'selected' : ''}>启用</option>
        <option value="0" ${u.status === 0 ? 'selected' : ''}>禁用</option>
      </select>`, async form => {
        const d = UI.formData(form);
        d.role_id = parseInt(d.role_id, 10) || null;
        d.status = parseInt(d.status, 10);
        if (id) {
          await API.put('/users/' + id, d);
        } else {
          if (!d.username) throw new Error('用户名必填');
          if (!d.password) throw new Error('密码必填');
          await API.post('/users', d);
        }
        UI.toast('已保存', 'success');
        Views.users.render(document.getElementById('content'));
      });
  },

  async resetPassword(id) {
    const pwd = prompt('输入新密码：', '');
    if (pwd === null || !pwd) return;
    await API.post(`/users/${id}/reset-password`, { password: pwd });
    UI.toast('密码已重置', 'success');
  },

  async toggle(id) {
    const list = await API.get('/users');
    const u = list.find(x => x.id === parseInt(id, 10));
    if (!u) return;
    await API.put('/users/' + id, { status: u.status === 1 ? 0 : 1 });
    UI.toast(u.status === 1 ? '已禁用' : '已启用', 'success');
    Views.users.render(document.getElementById('content'));
  },

  async del(id) {
    if (!confirm('确定删除该用户？')) return;
    try {
      await API.del('/users/' + id);
      UI.toast('已删除', 'success');
      Views.users.render(document.getElementById('content'));
    } catch (e) { UI.toast(e.message, 'error'); }
  }
};
