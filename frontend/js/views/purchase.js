/**
 * purchase.js - 进货入库视图
 */

'use strict';

Views.purchase = {
  async render(root) {
    root.innerHTML = `
      <div class="page-head"><h2>进货入库</h2></div>
      <div class="panel">
        <h3>新增入库</h3>
        <div class="grid2">
          <div>
            <label>商品 *</label>
            <select class="input" id="pu-product"><option value="">加载中…</option></select>
          </div>
          <div>
            <label>数量 *</label>
            <input class="input" id="pu-qty" type="number" min="1" placeholder="入库数量">
          </div>
        </div>
        <label>备注（供应商 / 采购单号）</label>
        <input class="input" id="pu-note" placeholder="如：华东供应商 / PO-20260902">
        <button class="btn btn-primary" id="pu-submit" style="margin-top:14px">确认入库</button>
      </div>
      <div class="table-wrap"><table class="table">
        <thead><tr><th>时间</th><th>商品</th><th>数量</th><th>备注</th></tr></thead>
        <tbody id="pu-body"></tbody>
      </table></div>`;

    const select = root.querySelector('#pu-product');

    const loadProducts = async (keepValue) => {
      const products = await API.get('/products');
      const cur = keepValue !== undefined ? keepValue : select.value;
      select.innerHTML = '<option value="">请选择商品</option>' + products.map(p =>
        `<option value="${p.id}" ${String(p.id) === cur ? 'selected' : ''}>${UI.esc(p.name)}（现库存 ${p.stock} ${UI.esc(p.unit)}）</option>`).join('');
    };

    const loadLogs = async () => {
      const list = await API.get('/inventory/logs?type=in');
      const tbody = root.querySelector('#pu-body');
      if (!list.length) { tbody.innerHTML = '<tr><td colspan="4" class="empty">暂无进货记录</td></tr>'; return; }
      tbody.innerHTML = list.map(l => `
        <tr>
          <td class="muted">${UI.esc(l.created_at)}</td>
          <td><b>${UI.esc(l.product_name || '已删除商品')}</b></td>
          <td><span class="badge st-done">+${l.quantity} ${UI.esc(l.unit || '')}</span></td>
          <td>${UI.esc(l.note || '-')}</td>
        </tr>`).join('');
    };

    root.querySelector('#pu-submit').addEventListener('click', async () => {
      const product_id = select.value;
      const quantity = parseInt(root.querySelector('#pu-qty').value, 10);
      const note = root.querySelector('#pu-note').value.trim();
      if (!product_id) { UI.toast('请选择商品', 'error'); return; }
      if (!quantity || quantity <= 0) { UI.toast('请输入正确数量', 'error'); return; }
      try {
        await API.post('/inventory/in', { product_id, quantity, note });
        UI.toast('入库成功', 'success');
        root.querySelector('#pu-qty').value = '';
        await loadLogs();
        await loadProducts(product_id);
      } catch (e) { UI.toast(e.message, 'error'); }
    });

    await loadProducts();
    await loadLogs();
  }
};
