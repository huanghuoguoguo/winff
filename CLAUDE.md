# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

WinFF (WinFF 局域网共享服务) is a LAN file sharing service with a React frontend and Express backend. It allows devices on the same network to browse, stream, download, and upload files through a web interface.

## Project Structure

```
winff/
├── client/          # React + Vite frontend
│   ├── src/
│   │   ├── api/     # API client functions
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── App.jsx
│   │   └── socket.js
│   ├── package.json
│   └── vite.config.js
├── server/          # Express + Socket.IO backend
│   ├── src/
│   │   ├── index.js     # Entry point
│   │   ├── api.js       # File listing API
│   │   ├── stream.js    # File streaming/download
│   │   ├── upload.js    # File upload handler
│   │   ├── socket.js    # WebSocket device presence
│   │   └── utils.js     # Helpers (IP, file size, path security)
│   ├── public/          # Client build output
│   ├── config.json      # Shared directories config
│   └── package.json
└── start.bat            # Windows startup script
```

## Build & Development Commands

### Client (from `client/` directory)
- `npm run dev` - Start Vite dev server (port 5173, proxies /api to localhost:3000)
- `npm run build` - Build production bundle to `server/public/`
- `npm run lint` - Run ESLint on all files
- `npm run preview` - Preview production build

### Server (from `server/` directory)
- `npm start` - Start server (node src/index.js)
- `npm run dev` - Start with Node.js --watch mode for auto-restart

### Windows Quick Start
- `start.bat` - Launches server with Node.js check and console QR code display

## Architecture

### Virtual File System
The server supports multiple shared directories via aliases defined in `server/config.json`:
```json
{
  "port": 3000,
  "sharedDirs": {
    "E盘": "E:\\",
    "D盘": "D:\\"
  }
}
```

Paths are resolved through `resolveVirtualPath()` in `utils.js`, which:
- Maps virtual aliases to real paths
- Prevents path traversal attacks via `isPathSafe()`
- Returns a virtual root listing when path is empty or "/"

### API Routes
- `GET /api/files?path=` - List directory contents
- `GET /api/stream?path=` - Stream file (supports Range requests for video seeking)
- `GET /api/stream/download?path=` - Force download file
- `POST /api/upload` - Upload files (multipart/form-data, max 10GB)
- `GET /api/info` - Server metadata (hostname, sharedDirs, LAN IP)

### Real-time Communication
Socket.IO handles:
- Device presence tracking (`device-list` events)
- File upload notifications (`file-updated` events)
- Custom device naming (`set-device-name` event)

Client connects to `window.location` in production, `localhost:3000` in development.

### File Upload Flow
1. Files uploaded via `UploadModal.jsx` using XMLHttpRequest for progress tracking
2. Server saves to `UPLOAD_DIR` (default: first shared dir + `/_uploads`)
3. Socket.IO broadcasts `file-updated` to all connected clients
4. Clients auto-refresh file list via `window.__winff_refreshFiles()` callback

### Security Considerations
- Path traversal protection via `isPathSafe()` checks on all file operations
- Hidden files (starting with ".") are filtered from listings
- CORS enabled for development (all origins allowed on Socket.IO)

## Configuration

Server configuration is stored in `server/config.json` and auto-created on first run with defaults:
- Port: 3000
- Shared directories: user's Desktop as "默认共享"
- Can be overridden via `PORT` env var or `process.argv[2]`

## Deployment Workflow

1. Build client: `cd client && npm run build` → outputs to `server/public/`
2. Start server: `cd server && npm start`
3. Server displays QR code in console for mobile access
4. Static files served from `public/`, SPA fallback to `index.html`

If `public/index.html` doesn't exist, server shows a helpful message with build instructions.
