import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { Server } from 'socket.io';
import cors from 'cors';
import qrcode from 'qrcode-terminal';
import os from 'os';

import { getLocalIP } from './utils';
import { createApiRouter } from './api';
import { createStreamRouter } from './stream';
import { createUploadRouter } from './upload';
import { initSocket } from './socket';

// ========== 配置 ==========
const configPath = path.join(__dirname, '..', 'config.json');

interface AppConfig {
  port: number;
  sharedDirs: { [alias: string]: string };
  uploadDir?: string;
  sharedDir?: string; // 兼容旧配置
}

let appConfig: AppConfig = {
  port: 3000,
  sharedDirs: {
    "默认共享": path.join(os.homedir(), 'Desktop')
  }
};

// 读取或初始化配置文件
if (fs.existsSync(configPath)) {
  try {
    const fileContent = fs.readFileSync(configPath, 'utf-8');
    const parsed = JSON.parse(fileContent);
    // 兼容单目录的旧配置
    if (parsed.sharedDir && !parsed.sharedDirs) {
      parsed.sharedDirs = { "默认共享": parsed.sharedDir };
      delete parsed.sharedDir;
    }
    appConfig = { ...appConfig, ...parsed };
  } catch (err) {
    console.error('读取配置文件 config.json 失败，将使用默认配置。', err);
  }
} else {
  try {
    // 如果是从命令行传入了初始路径，作为默认值存入文件
    const initialDir = process.argv[2] || process.env.WINFF_SHARED_DIR;
    if (initialDir) {
      appConfig.sharedDirs = { "默认共享": initialDir };
    }
    fs.writeFileSync(configPath, JSON.stringify(appConfig, null, 2), 'utf-8');
  } catch (e) {
    console.error('创建配置文件失败:', e);
  }
}

const PORT = parseInt(process.env.PORT as string) || appConfig.port;

// 共享目录映射
const SHARED_DIRS = appConfig.sharedDirs;

// 找一个默认的主共享目录，作为上传存放地
const defaultShare = Object.values(SHARED_DIRS)[0] || path.join(os.homedir(), 'Desktop');
const UPLOAD_DIR = appConfig.uploadDir || path.join(defaultShare, '_uploads');

// ========== 初始化 ==========
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // 开发阶段允许所有来源（Vite 开发服务器端口不同）
    methods: ['GET', 'POST'],
  },
});

// ========== 中间件 ==========
app.use(cors());
app.use(express.json());

// 静态文件托管：前端构建产物
const publicDir = path.join(__dirname, '..', 'public');
if (fs.existsSync(publicDir)) {
  app.use(express.static(publicDir));
}

// ========== API 路由 ==========
app.use('/api', createApiRouter(SHARED_DIRS));
app.use('/api/stream', createStreamRouter(SHARED_DIRS));
app.use('/api/upload', createUploadRouter(UPLOAD_DIR, SHARED_DIRS, io));

// 服务器信息接口
app.get('/api/info', (req, res) => {
  res.json({
    serverName: os.hostname(),
    sharedDirs: SHARED_DIRS,
    uploadDir: UPLOAD_DIR,
    version: '0.1.0',
    lanIp: getLocalIP(),
    port: PORT
  });
});

// SPA 回退：所有未匹配的路由返回 index.html
app.get('/{*path}', (req, res) => {
  const indexPath = path.join(publicDir, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(200).send(`
      <html>
        <head><meta charset="utf-8"><title>WinFF</title></head>
        <body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#1a1a2e;color:#e0e0e0;">
          <div style="text-align:center;">
            <h1>🚀 WinFF 服务已启动</h1>
            <p>前端尚未构建，请先运行：</p>
            <code style="background:#16213e;padding:8px 16px;border-radius:8px;display:inline-block;margin-top:8px;">cd client && npm run build</code>
          </div>
        </body>
      </html>
    `);
  }
});

// ========== Socket.IO ==========
initSocket(io);

// ========== 确保上传目录存在 ==========
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// ========== 启动服务 ==========
server.listen(PORT, '0.0.0.0', () => {
  const localIP = getLocalIP();
  const url = `http://${localIP}:${PORT}`;

  console.log('');
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║            🚀 WinFF 服务已启动                   ║');
  console.log('╠══════════════════════════════════════════════════╣');
  console.log(`║  本地地址：http://localhost:${PORT}`);
  console.log(`║  局域网：   ${url}`);
  console.log(`║  共享目录：${Object.values(SHARED_DIRS).join(', ')}`);
  console.log(`║  上传目录：${UPLOAD_DIR}`);
  console.log('╚══════════════════════════════════════════════════╝');
  console.log('');
  console.log('📱 手机扫描下方二维码即可访问:');
  console.log('');

  qrcode.generate(url, { small: true }, (code) => {
    console.log(code);
  });
});
