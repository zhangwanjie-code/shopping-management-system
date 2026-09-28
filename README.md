# 🛒 购物管理系统 Shopping Management System

> 店铺运营管理系统 | 商品管理 | 库存管理 | 订单管理 | 会员管理 | POS收银系统 | ERP进销存

一套开源的、基于 **Node.js + Express + SQLite** 的全栈店铺运营管理系统。支持商品管理、库存进销存、订单处理、会员体系、数据报表、角色权限等完整业务功能，适合中小型零售店铺、便利店、小型超市使用。

[![Node.js](https://img.shields.io/badge/Node.js-18+-green?logo=node.js)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.x-blue?logo=express)](https://expressjs.com/)
[![SQLite](https://img.shields.io/badge/SQLite-3-blue?logo=sqlite)](https://sqlite.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)

---

## ✨ 功能特性

### 📦 商品管理
- 商品信息增删改查（名称、价格、分类、图片）
- 商品分类管理
- 商品上下架状态控制

### 📊 库存管理 / 进销存
- 库存入库、出库记录
- 库存预警提醒
- 库存盘点功能

### 🛍️ 订单管理 / POS收银
- 订单创建与查询
- 订单状态跟踪（待处理/已完成/已取消）
- 销售流水记录

### 👥 会员管理 / CRM
- 会员信息管理
- 会员等级体系
- 消费记录追踪

### ⭐ 评价管理
- 商品评价查看与审核
- 评价统计分析

### 📈 报表统计 / 数据分析
- 销售数据分析
- 营收报表与趋势图
- 多维度数据统计

### 🔐 用户权限 / RBAC
- 角色权限控制（管理员/店员/收银员）
- 细粒度权限分配
- 多用户协同管理

### ⚙️ 系统设置
- 店铺基本信息配置
- 系统参数管理

---

## 🛠️ 技术栈

| 层级 | 技术 |
|------|------|
| 后端框架 | Node.js + Express |
| 数据库 | SQLite3 |
| 前端 | HTML5 + CSS3 + JavaScript |
| 认证 | JWT Token |
| API 风格 | RESTful API |

---

## 🚀 快速启动

### 环境要求
- Node.js 14+

### 安装步骤

```bash
# 克隆项目
git clone https://github.com/zhangwanjie-code/shopping-management-system.git

# 进入后端目录
cd shopping-management-system/backend

# 安装依赖
npm install

# 启动服务
node server.js
```

访问 http://localhost:3001

### 默认账号

| 角色 | 用户名 | 密码 |
|------|--------|------|
| 管理员 | admin | admin123 |

---

## 📁 项目结构

```
shopping-management-system/
├── backend/                # 后端服务
│   ├── server.js           # Express 入口文件
│   ├── db.js               # SQLite 数据库连接
│   ├── auth.js             # JWT 认证模块
│   ├── permissions.js      # 权限定义
│   ├── routes/             # API 路由
│   │   ├── products.js     # 商品接口
│   │   ├── inventory.js    # 库存接口
│   │   ├── orders.js       # 订单接口
│   │   ├── members.js      # 会员接口
│   │   ├── reviews.js      # 评价接口
│   │   ├── reports.js      # 报表接口
│   │   ├── users.js        # 用户管理
│   │   ├── roles.js        # 角色管理
│   │   └── system.js       # 系统设置
│   └── package.json
├── frontend/               # 前端页面
│   ├── index.html          # 主页面
│   ├── css/style.css       # 样式
│   └── js/                 # 前端逻辑
│       ├── app.js          # 应用入口
│       ├── api.js          # API 请求
│       └── views/          # 各功能页面
├── data/                   # SQLite 数据文件
├── start.js                # 一键启动脚本
└── README.md
```

---

## 📝 API 接口

| 模块 | 接口路径 | 说明 |
|------|----------|------|
| 认证 | POST /api/auth/login | 用户登录 |
| 认证 | POST /api/auth/logout | 用户登出 |
| 认证 | GET /api/auth/me | 获取当前用户 |
| 商品 | /api/products | 商品管理 CRUD |
| 库存 | /api/inventory | 库存管理 |
| 订单 | /api/orders | 订单管理 |
| 会员 | /api/members | 会员管理 |
| 评价 | /api/reviews | 评价管理 |
| 报表 | /api/reports | 数据报表 |
| 用户 | /api/users | 用户管理 |
| 角色 | /api/roles | 角色权限 |
| 系统 | /api/system | 系统设置 |

---

## 🎯 适用场景

- 🏪 零售店铺 / 便利店 / 小型超市
- 🛒 线上商城后台管理
- 📱 小程序商城管理后台
- 🏬 连锁门店管理
- 📦 仓库进销存管理
- 💼 小型企业 ERP

---

## 🔑 关键词

购物管理系统、店铺管理系统、商品管理系统、库存管理系统、订单管理系统、会员管理系统、POS收银系统、进销存系统、ERP系统、CRM客户管理、零售管理系统、门店管理系统、电商后台管理、商城管理系统、Node.js全栈项目、Express项目、SQLite数据库、RESTful API、开源管理系统、shop management system、inventory management、order management、point of sale、ecommerce admin

---

## 📄 License

MIT License - 免费开源，可自由使用和修改。
