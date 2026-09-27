/**
 * reviews.js - 商品评价视图
 */

'use strict';

Views.reviews = {
  render(root) {
    root.innerHTML = `
      <div class="page-head">
        <h2>商品评价</h2>
        <div class="toolbar">
          <select id="r-product" class="input" style="min-width:160px"><option value="">全部商品</option></select>
          <button class="btn btn-primary" id="r-add">写评价</button>
        </div>
      </div>
      <div class="list" id="r-list"></div>`;

    const loadProducts = async () => {
      const ps = await API.get('/products');
      const sel = root.querySelector('#r-product');
      ps.forEach(p => sel.insertAdjacentHTML('beforeend', `<option value="${p.id}">${UI.esc(p.name)}</option>`));
    };
    const load = async () => {
      const pid = root.querySelector('#r-product').value;
      const list = await API.get('/reviews' + (pid ? '?product_id=' + pid : ''));
      const box = root.querySelector('#r-list');
      if (!list.length) { box.innerHTML = '<div class="empty">暂无评价</div>'; return; }
      box.innerHTML = list.map(r => `
        <div class="review">
          <div class="review-head">
            <span class="stars">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</span>
            <b>${UI.esc(r.member_name || '匿名')}</b>
            <span class="muted">评价了「${UI.esc(r.product_name || '')}」</span>
            <span class="muted">${UI.esc(r.created_at)}</span>
          </div>
          <div class="review-body">${UI.esc(r.content || '')}</div>
        </div>`).join('');
    };

    root.querySelector('#r-product').addEventListener('change', load);
    root.querySelector('#r-add').addEventListener('click', () => this.add());
    loadProducts();
    load();
  },

  async add() {
    const [products, members] = await Promise.all([API.get('/products'), API.get('/members')]);
    UI.modal('写评价', `
      <label>商品 *</label><select class="input" name="product_id">${products.map(p => `<option value="${p.id}">${UI.esc(p.name)}</option>`).join('')}</select>
      <label>会员</label><select class="input" name="member_id"><option value="">匿名</option>${members.map(m => `<option value="${m.id}">${UI.esc(m.name)}</option>`).join('')}</select>
      <label>评分</label><select class="input" name="rating">${[5, 4, 3, 2, 1].map(n => `<option value="${n}">${'★'.repeat(n)}</option>`).join('')}</select>
      <label>评价内容</label><textarea class="input" name="content" rows="3"></textarea>`, async form => {
        const d = UI.formData(form);
        d.rating = parseInt(d.rating, 10);
        await API.post('/reviews', d);
        UI.toast('评价已提交', 'success');
        Views.reviews.render(document.getElementById('content'));
      });
  }
};
