/**
 * system.js - 系统管理视图（设置 + 修改密码）
 */

'use strict';

Views.system = {
  async render(root) {
    root.innerHTML = `
      <div class="page-head"><h2>系统设置</h2></div>
      <div class="grid2">
        <div class="panel">
          <h3>基本信息</h3>
          <label>店铺名称</label>
          <input class="input" id="s-shop-name">
          <button class="btn btn-primary" id="s-save" style="margin-top:14px">保存设置</button>
        </div>
        <div class="panel">
          <h3>修改密码</h3>
          <label>当前密码</label><input class="input" type="password" id="s-old">
          <label>新密码</label><input class="input" type="password" id="s-new">
          <label>确认新密码</label><input class="input" type="password" id="s-confirm">
          <button class="btn btn-primary" id="s-change" style="margin-top:14px">修改密码</button>
        </div>
      </div>`;

    try {
      const s = await API.get('/system/settings');
      root.querySelector('#s-shop-name').value = s.shop_name || '';
    } catch (e) { /* 无权限则忽略 */ }

    root.querySelector('#s-save').addEventListener('click', async () => {
      const shop_name = root.querySelector('#s-shop-name').value.trim();
      if (!shop_name) { UI.toast('店铺名称不能为空', 'error'); return; }
      try {
        await API.put('/system/settings', { shop_name });
        UI.toast('已保存', 'success');
        UI.applyShopName(shop_name);
      } catch (e) { UI.toast(e.message, 'error'); }
    });

    root.querySelector('#s-change').addEventListener('click', async () => {
      const old_password = root.querySelector('#s-old').value;
      const new_password = root.querySelector('#s-new').value;
      const confirm = root.querySelector('#s-confirm').value;
      if (!new_password) { UI.toast('新密码不能为空', 'error'); return; }
      if (new_password !== confirm) { UI.toast('两次密码不一致', 'error'); return; }
      try {
        await API.post('/system/change-password', { old_password, new_password });
        UI.toast('密码已修改', 'success');
        root.querySelector('#s-old').value = '';
        root.querySelector('#s-new').value = '';
        root.querySelector('#s-confirm').value = '';
      } catch (e) { UI.toast(e.message, 'error'); }
    });
  }
};
