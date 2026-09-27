/**
 * stockout.js - 出货出库视图
 */

'use strict';

Views.stockout = {
  async render(root) {
    root.innerHTML = `
      <div class="page-head"><h2>出货出库</h2></div>
      <div class="panel">
        <h3>新增出库</h3>
        <div class="grid2">
          <div>
            <label>商品 *</label>
            <select class="input" id="so-product"><option value="">加载中…</option></select>
          </div>
          <div>
            <label>数量 *</label>
            <input class="input" id="so-qty" type="number" min="1" placeholder="出库数量">
          </div>
        </div>
        <label>备注（出库原因：报废 / 退供应商 / 其他）</label>
        <input class="input" id="so-note" placeholder="如：临期报废 / 退回供应商">
        <button class="btn btn-primary" id="so-submit" style="margin-top:14px">确认出库</button>
      </div>
      <div class="table-wrap"><table class="table">
        <thead><tr><th>时间</th><th>商品</th><th>数量</th><th>备注</th></tr></thead>
        <tbody id="so-body"></tbody>
      </table></div>`;

    const select = root.querySelector('#so-product');

    const loadProducts = async (keepValue) => {
      const products = await API.get('/products');
      const cur = keepValue !== undefined ? keepValue : select.value;
      select.innerHTML = '<option value="">请选择商品</option>' + products.map(p =>
        `<option value="${p.id}" ${String(p.id) === cur ? 'selected' : ''}>${UI.esc(p.name)}（现库存 ${p.stock} ${UI.esc(p.unit)}）</option>`).join('');
    };

    const loadLogs = async () => {
      const list = await API.get('/inventory/logs?type=out');
      const tbody = root.querySelector('#so-body');
      if (!list.length) { tbody.innerHTML = '<tr><td colspan="4" class="empty">暂无出货记录</td></tr>'; return; }
      tbody.innerHTML = list.map(l => `
        <tr>
          <td class="muted">${UI.esc(l.created_at)}</td>
          <td><b>${UI.esc(l.product_name || '已删除商品')}</b></td>
          <td><span class="badge st-cancel">-${l.quantity} ${UI.esc(l.unit || '')}</span></td>
          <td>${UI.esc(l.note || '-')}</td>
        </tr>`).join('');
    };

    root.querySelector('#so-submit').addEventListener('click', async () => {
      const product_id = select.value;
      const quantity = parseInt(root.querySelector('#so-qty').value, 10);
      const note = root.querySelector('#so-note').value.trim();
      if (!product_id) { UI.toast('请选择商品', 'error'); return; }
      if (!quantity || quantity <= 0) { UI.toast('请输入正确数量', 'error'); return; }
      try {
        await API.post('/inventory/out', { product_id, quantity, note });
        UI.toast('出库成功', 'success');
        root.querySelector('#so-qty').value = '';
        await loadLogs();
        await loadProducts(product_id);
      } catch (e) { UI.toast(e.message, 'error'); }
    });

    await loadProducts();
    await loadLogs();
  }
};
