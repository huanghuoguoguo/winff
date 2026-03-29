@echo off
chcp 65001 >nul
title WinFF 局域网共享服务
color 0b

echo ==============================================
echo             WinFF 局域网共享服务               
echo ==============================================
echo.

cd /d "%~dp0server"

:: 检查是否安装了 Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [错误] 找不到 Node.js，请确保您已经安装了 Node.js！
    pause
    exit /b
)

echo [提示] 正在启动服务端程序...
echo [提示] 如果弹出 Windows 防火墙提示，请务必允许通过！
echo.

:: 启动后端服务
node src/index.js

:: 如果服务异常崩溃，暂停窗口以便查看报错信息
echo.
echo [提示] 服务已停止。
pause
