@echo off
chcp 65001 >nul
title WinFF 局域网共享服务
color 0b

echo ==============================================
echo             WinFF 局域网共享服务
echo ==============================================
echo.

cd /d "%~dp0"

:: 检查是否安装了 Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [错误] 找不到 Node.js，请确保您已经安装了 Node.js！
    echo [提示] 下载地址：https://nodejs.org/
    pause
    exit /b
)

echo [1/4] 检查 Node.js... OK
echo.

:: 检查并安装 server 依赖
echo [2/4] 检查服务端依赖...
cd /d "%~dp0server"
if not exist "node_modules" (
    echo [提示] 首次运行，正在安装服务端依赖...
    call npm install
) else (
    echo [提示] 服务端依赖已存在
)
echo.

:: 检查并安装 client 依赖
echo [3/4] 检查客户端依赖...
cd /d "%~dp0client"
if not exist "node_modules" (
    echo [提示] 首次运行，正在安装客户端依赖...
    call npm install
) else (
    echo [提示] 客户端依赖已存在
)
echo.

:: 检查是否需要 build
echo [4/4] 检查前端构建...
if not exist "..\server\public\index.html" (
    echo [提示] 未检测到前端构建文件，正在执行 build...
    call npm run build
    if %errorlevel% neq 0 (
        echo.
        echo [错误] 前端构建失败，请检查错误信息
        pause
        exit /b
    )
    echo [提示] 前端构建完成
) else (
    echo [提示] 前端构建文件已存在
)
echo.

:: 启动后端服务
cd /d "%~dp0server"
echo ==============================================
echo [提示] 正在启动服务端程序...
echo [提示] 如果弹出 Windows 防火墙提示，请务必允许通过！
echo ==============================================
echo.

node src/index.js

:: 如果服务异常崩溃，暂停窗口以便查看报错信息
echo.
echo [提示] 服务已停止。
pause
