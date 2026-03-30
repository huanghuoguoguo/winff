# WinFF - 基于浏览器的局域网文件共享服务

<p align="center">
  <img src="https://img.shields.io/badge/React-19-blue?logo=react" alt="React 19">
  <img src="https://img.shields.io/badge/Express-5-green?logo=express" alt="Express 5">
  <img src="https://img.shields.io/badge/TypeScript-5-blue?logo=typescript" alt="TypeScript 5">
  <img src="https://img.shields.io/badge/Socket.IO-4-black?logo=socket.io" alt="Socket.IO">
</p>

<p align="center">
  <b>🚀 无需安装 App，浏览器即开即用</b><br>
  同一 WiFi 就能传，不用装 App，无需注册账号
</p>

<p align="center">
  <a href="#快速开始">快速开始</a> •
  <a href="#功能特性">功能特性</a> •
  <a href="#技术架构">技术架构</a> •
  <a href="#一键安装">一键安装</a>
</p>

---

## ✨ 功能特性

- 🌐 **纯浏览器访问** - 无需安装客户端，任何设备打开浏览器就能用
- 🚀 **轻量级部署** - 一键脚本自动安装，服务端仅约 30MB
- 📱 **全平台支持** - iOS、Android、Windows、macOS、Linux，有浏览器就行
- 📂 **多目录共享** - 同时共享多个磁盘或文件夹
- 🖼️ **实时预览** - 图片、视频在线预览，支持拖拽进度
- ⬆️ **文件上传** - 支持多文件同时上传，最大 10GB
- 👥 **设备管理** - 实时显示在线设备，自定义设备名称
- 📶 **二维码访问** - 手机扫描即可快速连接
- ⚡ **实时更新** - 文件上传/删除后，所有设备瞬间同步

## 🚀 快速开始

### 一键安装（推荐）

**Linux / macOS:**
```bash
curl -fsSL https://raw.githubusercontent.com/huanghuoguoguo/winff/main/install.sh | sudo bash
```

**Windows PowerShell:**
```powershell
iwr -useb https://raw.githubusercontent.com/huanghuoguoguo/winff/main/install.ps1 | iex
```

首次运行会自动：
- ✅ 安装 Node.js（如未安装）
- ✅ 安装项目依赖
- ✅ 编译前端和 TypeScript 服务端
- ✅ 创建 systemd 服务（Linux）
- ✅ 启动服务并显示二维码

### Windows 本地启动

**双击运行或命令行：**
```bash
start.bat
```

### 手动启动（开发用）

```bash
# 1. 安装依赖
npm install

# 2. 构建前端
cd client && npm run build

# 3. 编译服务端
cd ../server && npm run build

# 4. 启动服务
npm start
```

## 📖 使用说明

### 配置共享目录

编辑 `server/config.json`：

```json
{
  "port": 3000,
  "sharedDirs": {
    "E 盘": "E:\\",
    "D 盘": "D:\\",
    "下载": "C:\\Users\\YourName\\Downloads"
  }
}
```

### 开发模式

```bash
# 终端 1：启动服务端 (TypeScript 热重载)
cd server && npm run dev

# 终端 2：启动客户端开发服务器
cd client && npm run dev
```

客户端开发服务器 (http://localhost:5173) 会自动代理 API 请求到服务端 (http://localhost:3000)。

## 🏗️ 技术架构

```
┌─────────────────┐     ┌─────────────────┐
│   React 19      │────▶│   Express 5     │
│   Vite 7        │     │   TypeScript    │
│   Tailwind 4    │◀────│   Socket.IO     │
└─────────────────┘     └─────────────────┘
        │                        │
        └──────────┬─────────────┘
                   │
            WebSocket / HTTP
```

### 前端技术栈

- **React 19** - UI 框架
- **Vite 7** - 构建工具
- **Tailwind CSS 4** - 样式框架
- **Socket.IO Client** - 实时通信
- **Lucide React** - 图标库

### 后端技术栈

- **TypeScript 5** - 类型安全的 JavaScript
- **Express 5** - Web 框架
- **Socket.IO 4** - WebSocket 服务
- **Multer** - 文件上传处理
- **qrcode-terminal** - 终端二维码显示

## 📡 API 接口

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/files?path=` | GET | 获取文件列表 |
| `/api/stream?path=` | GET | 流式传输文件（支持 Range） |
| `/api/stream/download?path=` | GET | 下载文件 |
| `/api/upload` | POST | 上传文件 |
| `/api/info` | GET | 服务器信息 |

## 🛡️ 安全说明

- 路径遍历攻击防护 - 所有文件操作都经过 `isPathSafe()` 验证
- 隐藏文件过滤 - 以 `.` 开头的文件不会显示在列表中
- 局域网限定 - 服务默认监听 `0.0.0.0`，但建议仅在可信网络中使用

## 📸 截图

访问在线演示：http://101.34.71.12/winff

## 🤝 贡献

欢迎提交 Issue 和 PR！

## 📄 许可

MIT License

---

<p align="center">
  Made with ❤️ for easier file sharing
</p>
