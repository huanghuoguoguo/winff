# WinFF 🚀

<p align="center">
  <img src="https://img.shields.io/badge/React-19-blue?logo=react" alt="React 19">
  <img src="https://img.shields.io/badge/Node.js-Express-green?logo=node.js" alt="Node.js">
  <img src="https://img.shields.io/badge/Socket.IO-4.8-black?logo=socket.io" alt="Socket.IO">
  <img src="https://img.shields.io/badge/Tailwind-4.2-06B6D4?logo=tailwindcss" alt="Tailwind CSS">
</p>

<p align="center">
  <b>零配置的局域网文件共享服务</b><br>
  无需数据线，手机电脑轻松互传文件
</p>

<p align="center">
  <a href="#快速开始">快速开始</a> •
  <a href="#功能特性">功能特性</a> •
  <a href="#技术架构">技术架构</a> •
  <a href="#使用说明">使用说明</a>
</p>

---

## ✨ 功能特性

- 📱 **跨平台支持** - 任何能打开浏览器的设备都能访问
- 📂 **多目录共享** - 同时共享多个磁盘或文件夹
- 🖼️ **实时预览** - 图片、视频在线预览，支持拖拽进度
- ⬆️ **文件上传** - 支持多文件同时上传，最大 10GB
- 👥 **设备管理** - 实时显示在线设备，自定义设备名称
- 📶 **二维码访问** - 手机扫描即可快速连接
- 🌙 **深色模式** - 自动适配系统主题

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

> **注意**：请将 `your-user` 替换为你的 GitHub 用户名，或者使用你的代码托管平台的原始文件 URL

**自定义安装参数：**

```bash
# 自定义端口和数据目录
export WINFF_PORT=8080
export WINFF_DATA_DIR=/data/winff
curl -fsSL https://raw.githubusercontent.com/your-user/winff/main/install.sh | sudo bash
```

### Windows 本地启动（开发用）

**双击运行或命令行：**

```bash
start.bat
```

首次运行时会自动：
- ✅ 检查并安装 Node.js 依赖
- ✅ 构建前端页面
- ✅ 启动服务

服务启动后显示二维码，手机扫描即可访问。

> **注意**：首次启动时如果弹出 Windows 防火墙提示，请点击**允许通过**

### 手动启动（开发用）

```bash
# 1. 安装依赖
npm install

# 2. 构建前端
cd client && npm run build

# 3. 启动服务
cd ../server && npm start
```

## 📖 使用说明

### 配置共享目录

编辑 `server/config.json`：

```json
{
  "port": 3000,
  "sharedDirs": {
    "E盘": "E:\\",
    "D盘": "D:\\",
    "下载": "C:\\Users\\YourName\\Downloads"
  }
}
```

### 开发模式

```bash
# 终端 1：启动服务端
cd server && npm run dev

# 终端 2：启动客户端开发服务器
cd client && npm run dev
```

客户端开发服务器 (http://localhost:5173) 会自动代理 API 请求到服务端 (http://localhost:3000)。

## 🏗️ 技术架构

```
┌─────────────────┐     ┌─────────────────┐
│   React 19      │────▶│   Express 5     │
│   Vite 7        │     │   Socket.IO     │
│   Tailwind 4    │◀────│   Multer        │
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

> TODO: 添加应用截图

## 🤝 贡献

欢迎提交 Issue 和 PR！

## 📄 许可

MIT License

---

<p align="center">
  Made with ❤️ for easier file sharing
</p>
