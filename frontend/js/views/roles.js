/**
 * roles.js - 角色 / 权限管理视图
 */

'use strict';

Views.roles = {
  async render(root) {
    root.innerHTML = `
      <div class="page-head">
        <h2>角色权限</h2>
        <div class="toolbar"><button class="btn btn-primary" id="r-add">新增角色</button></div>
      </div>
      <div class="table-wrap"><table class="table">
        <thead><tr><th>ID</th><th>角色名</th><th>描述</th><th>权限</th><th>用户数</th><th>操作</th></tr></thead>
        <tbody id="r-body"></tbody>
      </table></div>`;

    const load = async () => {
      const list = await API.get('/roles');
      const tbody = root.querySelector('#r-body');
      if (!list.length) { tbody.innerHTML = '<tr><td colspan="6" class="empty">暂无角色</td></tr>'; return; }
      tbody.innerHTML = list.map(r => `
        <tr>
          <td>${r.id}</td>
          <td><b>${UI.esc(r.name)}</b>${r.is_builtin ? ' <span class="muted">(内置)</span>' : ''}</td>
          <td>${UI.esc(r.description || '-')}</td>
          <td>${r.permissions.includes('*') ? '<span class="badge lvl-platinum">全部</span>' : r.permissions.length + ' 项'}</td>
          <td>${r.user_count}</td>
          <td class="ops">
            <button class="mini" data-edit="${r.id}">编辑权限</button>
            <button class="mini danger" data-del="${r.id}" ${r.is_builtin ? 'disabled' : ''}>删除</button>
          </td>
        </tr>`).join('');
    };

    root.querySelector('#r-add').addEventListener('click', () => this.edit());
    root.querySelector('#r-body').addEventListener('click', e => {
      const t = e.target;
      if (t.dataset.edit) this.edit(t.dataset.edit);
      else if (t.dataset.del) this.del(t.dataset.del);
    });

    load();
  },

  async edit(id) {
    const groups = await API.get('/permissions');
    let r = { name: '', description: '', permissions: [] };
    if (id) {
      const list = await API.get('/roles');
      r = list.find(x => x.id === parseInt(id, 10)) || r;
    }
    const checkboxes = groups.map(g => `
      <div class="perm-group">
        <h4>${UI.esc(g.group)}</h4>
        ${g.perms.map(p => `<label class="perm-item"><input type="checkbox" name="perm" value="${p.key}" ${r.permissions.includes(p.key) ? 'checked' : ''}> ${UI.esc(p.label)}</label>`).join('')}
      </div>`).join('');
    UI.modal(id ? '编辑角色' : '新增角色', `
      <label>角色名 *</label><input class="input" name="name" value="${UI.esc(r.name)}">
      <label>描述</label><input class="input" name="description" value="${UI.esc(r.description || '')}">
      <label>权限</label>
      <div class="perm-list">${checkboxes}</div>`, async form => {
        const d = UI.formData(form);
        const perms = [...form.querySelectorAll('input[name="perm"]:checked')].map(c => c.value);
        if (!d.name) throw new Error('角色名必填');
        if (id) await API.put('/roles/' + id, { name: d.name, description: d.description, permissions: perms });
        else await API.post('/roles', { name: d.name, description: d.description, permissions: perms });
        UI.toast('已保存', 'success');
        Views.roles.render(document.getElementById('content'));
      });
  },

  async del(id) {
    if (!confirm('确定删除该角色？')) return;
    try {
      await API.del('/roles/' + id);
      UI.toast('已删除', 'success');
      Views.roles.render(document.getElementById('content'));
    } catch (e) { UI.toast(e.message, 'error'); }
  }
};
