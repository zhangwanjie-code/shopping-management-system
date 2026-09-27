/**
 * products.js - 商品/库存视图
 */

'use strict';

Views.products = {
  render(root) {
    root.innerHTML = `
      <div class="page-head">
        <h2>商品 / 库存</h2>
        <div class="toolbar">
          <input id="p-search" class="input" placeholder="搜索名称/SKU">
          <button class="btn btn-ghost" id="p-low">只看预警</button>
          <button class="btn btn-primary" id="p-add">新增商品</button>
        </div>
      </div>
      <div class="table-wrap"><table class="table">
        <thead><tr><th>ID</th><th>商品</th><th>分类</th><th>售价</th><th>成本</th><th>库存</th><th>状态</th><th>操作</th></tr></thead>
        <tbody id="p-body"></tbody>
      </table></div>`;

    let low = false;

    const load = async () => {
      const search = root.querySelector('#p-search').value;
      const qs = new URLSearchParams();
      if (search) qs.set('search', search);
      if (low) qs.set('low_stock', '1');
      const list = await API.get('/products?' + qs.toString());
      const tbody = root.querySelector('#p-body');
      if (!list.length) { tbody.innerHTML = '<tr><td colspan="8" class="empty">暂无商品</td></tr>'; return; }
      tbody.innerHTML = list.map(p => `
        <tr class="${p.stock <= p.stock_alert ? 'row-warn' : ''}">
          <td>${p.id}</td>
          <td><b>${UI.esc(p.name)}</b><br><span class="muted">${UI.esc(p.sku || '')}</span></td>
          <td>${UI.esc(p.category || '-')}</td>
          <td>${UI.money(p.price)}</td>
          <td>${UI.money(p.cost)}</td>
          <td class="${p.stock <= p.stock_alert ? 'text-warn' : ''}">${p.stock} ${UI.esc(p.unit)}</td>
          <td>${p.status === 'on' ? '<span class="badge st-done">在售</span>' : '<span class="badge st-cancel">下架</span>'}</td>
          <td class="ops">
            <button class="mini" data-in="${p.id}">入库</button>
            <button class="mini" data-out="${p.id}">出库</button>
            <button class="mini" data-adj="${p.id}">盘点</button>
            <button class="mini" data-edit="${p.id}">编辑</button>
            <button class="mini danger" data-del="${p.id}">删除</button>
          </td>
        </tr>`).join('');
    };

    const inv = async (id, type) => {
      const qty = prompt(type === 'adjust' ? '盘点后库存数量：' : (type === 'in' ? '入库数量：' : '出库数量：'), '');
      if (qty === null) return;
      try {
        await API.post(`/products/${id}/inventory`, { type, quantity: parseInt(qty, 10) || 0, note: undefined });
        UI.toast('库存已更新', 'success');
        load();
      } catch (err) { UI.toast(err.message, 'error'); }
    };

    const del = async id => {
      if (!confirm('确定删除该商品？')) return;
      await API.del('/products/' + id);
      UI.toast('已删除', 'success');
      load();
    };

    root.querySelector('#p-search').addEventListener('input', UI.debounce(load, 300));
    root.querySelector('#p-low').addEventListener('click', () => { low = !low; root.querySelector('#p-low').classList.toggle('active', low); load(); });
    root.querySelector('#p-add').addEventListener('click', () => this.edit());
    root.querySelector('#p-body').addEventListener('click', e => {
      if (e.target.dataset.in) inv(e.target.dataset.in, 'in');
      else if (e.target.dataset.out) inv(e.target.dataset.out, 'out');
      else if (e.target.dataset.adj) inv(e.target.dataset.adj, 'adjust');
      else if (e.target.dataset.edit) this.edit(e.target.dataset.edit);
      else if (e.target.dataset.del) del(e.target.dataset.del);
    });

    load();
  },

  async edit(id) {
    let p = { name: '', sku: '', category: '', price: '', cost: '', stock: '0', stock_alert: '5', unit: '件', status: 'on' };
    if (id) p = await API.get('/products/' + id);
    UI.modal(id ? '编辑商品' : '新增商品', `
      <label>商品名 *</label><input class="input" name="name" value="${UI.esc(p.name)}">
      <label>SKU</label><input class="input" name="sku" value="${UI.esc(p.sku || '')}">
      <label>分类</label><input class="input" name="category" value="${UI.esc(p.category || '')}">
      <div class="grid2">
        <div><label>售价</label><input class="input" name="price" type="number" step="0.01" value="${p.price || ''}"></div>
        <div><label>成本</label><input class="input" name="cost" type="number" step="0.01" value="${p.cost || ''}"></div>
      </div>
      <div class="grid2">
        <div><label>库存</label><input class="input" name="stock" type="number" value="${p.stock || 0}"></div>
        <div><label>预警线</label><input class="input" name="stock_alert" type="number" value="${p.stock_alert || 5}"></div>
      </div>
      <label>单位</label><input class="input" name="unit" value="${UI.esc(p.unit || '件')}">
      <label>状态</label><select class="input" name="status">
        <option value="on" ${p.status === 'on' ? 'selected' : ''}>在售</option>
        <option value="off" ${p.status === 'off' ? 'selected' : ''}>下架</option>
      </select>`, async form => {
        const d = UI.formData(form);
        d.price = parseFloat(d.price) || 0;
        d.cost = parseFloat(d.cost) || 0;
        d.stock = parseInt(d.stock, 10) || 0;
        d.stock_alert = parseInt(d.stock_alert, 10) || 0;
        if (!d.name) throw new Error('商品名必填');
        if (id) await API.put('/products/' + id, d);
        else await API.post('/products', d);
        UI.toast('已保存', 'success');
        Views.products.render(document.getElementById('content'));
      });
  }
};
