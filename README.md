# 购物管理系统 / Shopping Management System

店铺运营管理系统 - 基于 Express + SQLite 的全栈项目

## 功能特性

- 商品管理：商品信息的增删改查
- 库存管理：库存入库、出库记录
- 订单管理：订单创建、查询、状态跟踪
- 会员管理：会员信息、等级管理
- 评价管理：商品评价查看与管理
- 报表统计：销售数据分析与报表
- 用户权限：角色权限控制、多用户管理
- 系统设置：店铺信息配置

## 技术栈

- 后端：Node.js + Express
- 数据库：SQLite
- 前端：原生 HTML/CSS/JavaScript

## 快速启动

```bash
cd backend
npm install
node server.js
```

访问 http://localhost:3001

默认管理员账号：admin / admin123

## 项目结构

```
├── backend/          # 后端服务
│   ├── server.js     # 入口文件
│   ├── db.js         # 数据库
│   ├── auth.js       # 认证模块
│   └── routes/       # API 路由
├── frontend/         # 前端页面
│   ├── index.html
│   ├── css/
│   └── js/
├── data/             # 数据文件
└── start.js          # 一键启动脚本
```
