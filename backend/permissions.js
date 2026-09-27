/**
 * permissions.js - 权限目录（按模块分组）
 * 权限 key 形如 "模块:动作"，如 products:view / products:edit
 * 超级管理员角色存 ["*"]，表示拥有全部权限
 */

'use strict';

const PERMISSION_GROUPS = [
  { group: '商品', perms: [
    { key: 'products:view', label: '查看' },
    { key: 'products:edit', label: '编辑' }
  ]},
  { group: '订单', perms: [
    { key: 'orders:view', label: '查看' },
    { key: 'orders:edit', label: '编辑' }
  ]},
  { group: '会员', perms: [
    { key: 'members:view', label: '查看' },
    { key: 'members:edit', label: '编辑' }
  ]},
  { group: '评价', perms: [
    { key: 'reviews:view', label: '查看' },
    { key: 'reviews:edit', label: '编辑' }
  ]},
  { group: '报表', perms: [
    { key: 'reports:view', label: '查看' }
  ]},
  { group: '用户', perms: [
    { key: 'users:view', label: '查看' },
    { key: 'users:edit', label: '编辑' }
  ]},
  { group: '角色', perms: [
    { key: 'roles:view', label: '查看' },
    { key: 'roles:edit', label: '编辑' }
  ]},
  { group: '系统', perms: [
    { key: 'system:view', label: '查看' },
    { key: 'system:edit', label: '编辑' }
  ]}
];

const ALL_KEYS = PERMISSION_GROUPS.flatMap(g => g.perms.map(p => p.key));

module.exports = { PERMISSION_GROUPS, ALL_KEYS };
