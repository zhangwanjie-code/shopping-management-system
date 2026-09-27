/**
 * orders.js - 收银台 / 订单视图
 */

'use strict';

Views.orders = {
  render(root) {
    root.innerHTML = `
      <div class="page-head">
        <h2>收银 / 订单</h2>
        <div class="toolbar">
          <button class="btn btn-ghost" id="o-list-tab">订单列表</button>
          <button class="btn btn-primary active" id="o-pos-tab">收银台</button>
        </div>
      </div>
      <div id="o-body"></div>`;

    const body = root.querySelector('#o-body');
    const showList = () => {
      root.querySelector('#o-list-tab').classList.add('active');
      root.querySelector('#o-pos-tab').classList.remove('active');
      this.list(body);
    };
    const showPos = () => {
      root.querySelector('#o-pos-tab').classList.add('active');
      root.querySelector('#o-list-tab').classList.remove('active');
      this.pos(body);
    };
    root.querySelector('#o-list-tab').onclick = showList;
    root.querySelector('#o-pos-tab').onclick = showPos;
    showPos();
  },

  async list(root) {
    root.innerHTML = `
      <div class="toolbar"><input id="o-search" class="input" placeholder="搜索订单号/会员"></div>
      <div class="table-wrap" style="margin-top:12px"><table class="table">
        <thead><tr><th>订单号</th><th>会员</th><th>金额</th><th>件数</th><th>支付</th><th>状态</th><th>时间</th><th>操作</th></tr></thead>
        <tbody id="o-list-body"></tbody>
      </table></div>`;

    const load = async () => {
      const search = root.querySelector('#o-search').value;
      const list = await API.get('/orders' + (search ? '?search=' + encodeURIComponent(search) : ''));
      const tbody = root.querySelector('#o-list-body');
      if (!list.length) { tbody.innerHTML = '<tr><td colspan="8" class="empty">暂无订单</td></tr>'; return; }
      tbody.innerHTML = list.map(o => `
        <tr>
          <td>${UI.esc(o.order_no)}</td>
          <td>${UI.esc(o.member_name || '-')}</td>
          <td>${UI.money(o.pay_amount)}</td>
          <td>${o.item_count}</td>
          <td>${UI.esc(o.payment_method || '-')}</td>
          <td>${UI.statusBadge(o.status)}</td>
          <td class="muted">${UI.esc(o.created_at)}</td>
          <td class="ops">
            <button class="mini" data-view="${o.id}">详情</button>
            <button class="mini" data-next="${o.id}">流转</button>
            <button class="mini danger" data-cancel="${o.id}">取消</button>
          </td>
        </tr>`).join('');
    };

    root.querySelector('#o-search').addEventListener('input', UI.debounce(load, 300));
    root.querySelector('#o-list-body').addEventListener('click', async e => {
      if (e.target.dataset.view) this.detail(e.target.dataset.view);
      else if (e.target.dataset.next) this.flow(e.target.dataset.next);
      else if (e.target.dataset.cancel) {
        if (confirm('取消该订单？将回补库存并回退积分')) {
          await API.post(`/orders/${e.target.dataset.cancel}/cancel`);
          UI.toast('已取消', 'success');
          load();
        }
      }
    });

    load();
  },

  async pos(root) {
    const [products, members] = await Promise.all([API.get('/products?status=on'), API.get('/members')]);
    const cart = new Map();
    root.innerHTML = `
      <div class="pos">
        <div class="pos-left">
          <input id="pos-search" class="input" placeholder="搜索商品">
          <div class="pos-grid" id="pos-grid"></div>
        </div>
        <div class="pos-right">
          <h3>购物车</h3>
          <div class="pos-cart" id="pos-cart"></div>
          <div class="pos-total">合计：<b id="pos-total">¥0.00</b></div>
          <label>会员</label>
          <select class="input" id="pos-member"><option value="">散客（无会员）</option>${members.map(m => `<option value="${m.id}">${UI.esc(m.name)} (${UI.esc(m.level)})</option>`).join('')}</select>
          <label>优惠金额</label><input class="input" id="pos-discount" type="number" step="0.01" value="0">
          <label>支付方式</label><select class="input" id="pos-pay"><option>现金</option><option>微信</option><option>支付宝</option><option>刷卡</option></select>
          <label>备注</label><input class="input" id="pos-remark">
          <button class="btn btn-primary btn-block" id="pos-submit" style="margin-top:14px">结 算</button>
        </div>
      </div>`;

    const grid = root.querySelector('#pos-grid');
    const renderGrid = (filter = '') => {
      const list = products.filter(p => !filter || p.name.includes(filter) || (p.sku || '').includes(filter));
      if (!list.length) { grid.innerHTML = '<div class="empty">无在售商品</div>'; return; }
      grid.innerHTML = list.map(p => `
        <div class="pos-item ${p.stock <= 0 ? 'pos-soldout' : ''}" data-id="${p.id}">
          <b>${UI.esc(p.name)}</b>
          <div class="muted">${UI.money(p.price)} / 库存 ${p.stock}</div>
        </div>`).join('');
    };
    const renderCart = () => {
      const box = root.querySelector('#pos-cart');
      let total = 0;
      if (!cart.size) box.innerHTML = '<div class="empty">购物车为空</div>';
      else {
        box.innerHTML = [...cart.values()].map(({ p, qty }) => {
          total += p.price * qty;
          return `<div class="cart-line">
            <span>${UI.esc(p.name)}</span>
            <span class="cart-qty"><button data-minus="${p.id}">-</button> ${qty} <button data-plus="${p.id}">+</button></span>
            <span>${UI.money(p.price * qty)}</span>
          </div>`;
        }).join('');
      }
      const disc = parseFloat(root.querySelector('#pos-discount').value) || 0;
      root.querySelector('#pos-total').textContent = UI.money(Math.max(0, total - disc));
    };

    grid.addEventListener('click', e => {
      const id = e.target.dataset.id;
      if (!id) return;
      const p = products.find(x => x.id == id);
      if (p.stock <= 0) { UI.toast('库存不足', 'error'); return; }
      const cur = cart.get(id);
      if (cur) { if (cur.qty >= p.stock) { UI.toast('已达库存上限', 'error'); return; } cur.qty++; }
      else cart.set(id, { p, qty: 1 });
      renderCart();
    });
    root.querySelector('#pos-cart').addEventListener('click', e => {
      const id = e.target.dataset.plus || e.target.dataset.minus;
      if (!id) return;
      const cur = cart.get(id);
      if (!cur) return;
      if (e.target.dataset.plus) { if (cur.qty >= cur.p.stock) { UI.toast('已达库存上限', 'error'); return; } cur.qty++; }
      else { cur.qty--; if (cur.qty <= 0) cart.delete(id); }
      renderCart();
    });
    root.querySelector('#pos-search').addEventListener('input', e => renderGrid(e.target.value));
    root.querySelector('#pos-discount').addEventListener('input', renderCart);
    root.querySelector('#pos-submit').addEventListener('click', async () => {
      if (!cart.size) { UI.toast('购物车为空', 'error'); return; }
      const body = {
        member_id: root.querySelector('#pos-member').value || null,
        items: [...cart.values()].map(({ p, qty }) => ({ product_id: p.id, quantity: qty })),
        discount: parseFloat(root.querySelector('#pos-discount').value) || 0,
        payment_method: root.querySelector('#pos-pay').value,
        remark: root.querySelector('#pos-remark').value || undefined
      };
      try {
        await API.post('/orders', body);
        UI.toast('结算成功', 'success');
        cart.clear();
        const refreshed = await API.get('/products?status=on');
        products.splice(0, products.length, ...refreshed);
        renderGrid(root.querySelector('#pos-search').value);
        renderCart();
      } catch (e) { UI.toast(e.message, 'error'); }
    });

    renderGrid();
    renderCart();
  },

  async detail(id) {
    const o = await API.get('/orders/' + id);
    UI.modal(`订单 ${o.order_no}`, `
      <div class="kv"><span>会员</span><b>${UI.esc(o.member?.name || '散客')}</b></div>
      <div class="kv"><span>状态</span><b>${UI.statusBadge(o.status)}</b></div>
      <div class="kv"><span>支付方式</span><b>${UI.esc(o.payment_method || '-')}</b></div>
      <div class="kv"><span>备注</span><b>${UI.esc(o.remark || '-')}</b></div>
      <table class="table" style="margin-top:12px"><thead><tr><th>商品</th><th>单价</th><th>数量</th><th>小计</th></tr></thead>
        <tbody>${o.items.map(i => `<tr><td>${UI.esc(i.product_name)}</td><td>${UI.money(i.price)}</td><td>${i.quantity}</td><td>${UI.money(i.subtotal)}</td></tr>`).join('')}</tbody></table>
      <div class="kv"><span>总额</span><b>${UI.money(o.total_amount)}</b></div>
      <div class="kv"><span>优惠</span><b>${UI.money(o.discount)}</b></div>
      <div class="kv"><span>实付</span><b>${UI.money(o.pay_amount)}</b></div>`, async () => {});
  },

  async flow(id) {
    const order = await API.get('/orders/' + id);
    const steps = ['待付款', '已付款', '已发货', '已完成'];
    const nexts = steps.slice(steps.indexOf(order.status) + 1);
    if (!nexts.length) { UI.toast('已是终态，无需流转', 'error'); return; }
    UI.modal('订单流转', `
      <label>当前状态：${UI.esc(order.status)}</label>
      <label>流转到</label>
      <select class="input" name="status">${nexts.map(s => `<option>${s}</option>`).join('')}</select>`, async form => {
        await API.put(`/orders/${id}/status`, { status: UI.formData(form).status });
        UI.toast('状态已更新', 'success');
        Views.orders.render(document.getElementById('content'));
      });
  }
};
