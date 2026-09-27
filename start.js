/**
 * start.js - 店铺系统一键启动
 * 启动后端服务 + cloudflared 公网隧道，并自动打印 / 保存公网地址
 */

'use strict';

const { spawn } = require('child_process');
const http = require('http');
const path = require('path');
const fs = require('fs');

const root = __dirname;
const backendDir = path.join(root, 'backend');
const NODE = 'D:/nodejs/node.exe';
const CLOUDFLARED = 'C:/Users/admin/cloudflared.exe';
const URL_FILE = path.join(root, '公网地址.txt');

// 检查 3001 端口是否已有服务在跑
function isServerUp() {
  return new Promise(resolve => {
    const req = http.get({ host: '127.0.0.1', port: 3001, path: '/', timeout: 2000 }, res => {
      req.destroy();
      resolve(true);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
  });
}

async function main() {
  console.log('==============================================');
  console.log('  店铺系统 一键启动');
  console.log('==============================================\n');

  if (await isServerUp()) {
    console.log('[1/2] 店铺服务已在运行 (http://localhost:3001)\n');
  } else {
    console.log('[1/2] 正在启动店铺服务...\n');
    const server = spawn(NODE, ['server.js'], { cwd: backendDir, stdio: 'inherit' });
    server.on('error', err => console.error('启动服务失败:', err.message));
    await new Promise(r => setTimeout(r, 2000));
  }

  console.log('[2/2] 正在启动公网隧道 (HTTP2)...\n');
  const cf = spawn(CLOUDFLARED, ['tunnel', '--url', 'http://localhost:3001', '--no-autoupdate', '--protocol', 'http2']);

  let found = false;
  const onData = d => {
    const s = d.toString();
    process.stdout.write(s);
    if (!found) {
      const m = s.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
      if (m) {
        found = true;
        const url = m[0];
        console.log('\n\n  >>> 店铺在线地址: ' + url + ' <<<\n');
        try { fs.writeFileSync(URL_FILE, url + '\n', 'utf8'); } catch (e) {}
        console.log('  (地址已保存到 公网地址.txt，下次可直接查看)\n');
        console.log('  登录账号: admin / admin123\n');
        console.log('  关闭本窗口即停止服务。');
      }
    }
  };
  cf.stdout.on('data', onData);
  cf.stderr.on('data', onData);
  cf.on('error', err => console.error('启动隧道失败:', err.message));
}

main();
