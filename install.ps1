# WinFF 一键安装脚本 (Windows PowerShell)
# 用法：iwr -useb https://raw.githubusercontent.com/your-user/winff/main/install.ps1 | iex
# 或：iwr -useb https://example.com/install.ps1 | iex

$ErrorActionPreference = "Stop"

# 颜色函数
function Write-Info { Write-Host "[INFO] $args" -ForegroundColor Cyan }
function Write-Success { Write-Host "[OK] $args" -ForegroundColor Green }
function Write-Warn { Write-Host "[WARN] $args" -ForegroundColor Yellow }
function Write-Error { Write-Host "[ERROR] $args" -ForegroundColor Red }

# 配置
$WinFFVersion = if ($env:WINFF_VERSION) { $env:WINFF_VERSION } else { "latest" }
$WinFFInstallDir = if ($env:WINFF_INSTALL_DIR) { $env:WINFF_INSTALL_DIR } else { "$env:ProgramFiles\WinFF" }
$WinFFDataDir = if ($env:WINFF_DATA_DIR) { $env:WINFF_DATA_DIR } else { "$env:USERPROFILE\winff-data" }
$WinFFPort = if ($env:WINFF_PORT) { $env:WINFF_PORT } else { "3000" }

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "          WinFF 一键安装脚本" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# 检查管理员权限
if (-NOT ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Error "请以管理员身份运行此脚本 (右键 - 以管理员身份运行)"
    exit 1
}

# 检查 Node.js
Write-Info "检查 Node.js..."
if (Get-Command node -ErrorAction SilentlyContinue) {
    $nodeVersion = node -v
    Write-Success "Node.js 已安装：$nodeVersion"
} else {
    Write-Error "未检测到 Node.js，请先安装：https://nodejs.org/"
    Write-Info "安装完成后重新运行此脚本"
    exit 1
}

# 停止现有服务
Write-Info "检查现有服务..."
$existingProcess = Get-Process -Name node -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "*winff*" -or $_.CommandLine -like "*index.js*" }
if ($existingProcess) {
    Write-Info "停止现有服务..."
    Stop-Process -Name node -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
}

# 创建目录
Write-Info "创建安装目录..."
New-Item -ItemType Directory -Force -Path $WinFFInstallDir | Out-Null
New-Item -ItemType Directory -Force -Path $WinFFDataDir | Out-Null

# 下载 WinFF
Write-Info "下载 WinFF $WinFFVersion..."
Set-Location $WinFFInstallDir

try {
    if ($WinFFVersion -eq "latest") {
        # 获取最新版本
        $release = Invoke-RestMethod -Uri "https://api.github.com/repos/your-user/winff/releases/latest" -UseBasicParsing
        $downloadUrl = $release.assets | Where-Object { $_.name -eq "winff-windows.zip" } | Select-Object -ExpandProperty browser_download_url
        if (-not $downloadUrl) {
            throw "未找到 Windows 安装包"
        }
    } else {
        $downloadUrl = "https://github.com/your-user/winff/releases/download/$WinFFVersion/winff-windows.zip"
    }

    Write-Info "下载地址：$downloadUrl"
    Invoke-WebRequest -Uri $downloadUrl -OutFile "winff.zip" -UseBasicParsing
    Write-Success "下载完成"

    # 解压
    Expand-Archive -Path "winff.zip" -DestinationPath "." -Force
    Remove-Item "winff.zip" -Force

    # 移动文件到根目录
    $extractedDir = Get-ChildItem -Directory | Select-Object -First 1
    if ($extractedDir) {
        Get-ChildItem -Path $extractedDir.FullName -Force | Move-Item -Destination "." -Force
        Remove-Item $extractedDir.FullName -Force -Recurse
    }
} catch {
    Write-Warn "下载失败，尝试使用源码..."
    try {
        Invoke-WebRequest -Uri "https://github.com/your-user/winff/archive/refs/heads/main.zip" -OutFile "source.zip" -UseBasicParsing
        Expand-Archive -Path "source.zip" -DestinationPath "." -Force
        Remove-Item "source.zip" -Force

        $extractedDir = Get-ChildItem -Directory | Select-Object -First 1
        if ($extractedDir) {
            Get-ChildItem -Path $extractedDir.FullName -Force | Move-Item -Destination "." -Force
            Remove-Item $extractedDir.FullName -Force -Recurse
        }
    } catch {
        Write-Error "源码下载失败"
        exit 1
    }
}

# 安装依赖
Write-Info "安装项目依赖..."
Set-Location "$WinFFInstallDir\server"
if (-not (Test-Path "node_modules")) {
    npm install --production 2>&1 | Select-Object -Last 3
} else {
    Write-Info "依赖已存在"
}

# 检查是否需要 build
if (-not (Test-Path "public\index.html")) {
    Write-Info "构建前端..."
    Set-Location "$WinFFInstallDir\client"
    npm install 2>&1 | Select-Object -Last 3
    npm run build 2>&1 | Select-Object -Last 3
}

Write-Success "依赖安装完成"

# 配置
Write-Info "配置 WinFF..."
$ConfigFile = "$WinFFInstallDir\server\config.json"

if (-not (Test-Path $ConfigFile)) {
    $config = @{
        port = [int]$WinFFPort
        sharedDirs = @{ "默认共享" = $WinFFDataDir }
    }
    $config | ConvertTo-Json | Set-Content $ConfigFile -Encoding UTF8
    Write-Success "配置文件创建完成"
} else {
    # 更新配置
    $config = Get-Content $ConfigFile -Raw | ConvertFrom-Json
    $config.port = [int]$WinFFPort
    $config | ConvertTo-Json | Set-Content $ConfigFile -Encoding UTF8
    Write-Warn "配置文件已存在，已更新端口"
}

# 创建数据目录
New-Item -ItemType Directory -Force -Path $WinFFDataDir | Out-Null

# 创建启动脚本
$StartScript = @"
@echo off
chcp 65001 >nul
cd /d "$WinFFInstallDir\server"
node src\index.js
pause
"@
$StartScript | Out-File -FilePath "$WinFFInstallDir\start.bat" -Encoding UTF8

# 创建开机启动
$ShortcutPath = "$env:ProgramData\Microsoft\Windows\Start Menu\Programs\Startup\WinFF.lnk"
if (Test-Path $ShortcutPath) { Remove-Item $ShortcutPath -Force }

# 创建服务（可选，使用 NSSM 或 Windows 服务）
Write-Info "创建 Windows 服务..."
try {
    $serviceName = "WinFF"
    $servicePath = "$WinFFInstallDir\server\node.exe"

    # 检查服务是否存在
    $existingService = Get-Service -Name $serviceName -ErrorAction SilentlyContinue
    if ($existingService) {
        Stop-Service -Name $serviceName -Force -ErrorAction SilentlyContinue
        sc.exe delete $serviceName
    }

    # 使用 sc.exe 创建服务
    $nodePath = (Get-Command node).Source
    sc.exe create $serviceName binPath= "\"$nodePath\" \`"$WinFFInstallDir\server\src\index.js\`"" start= auto
    sc.exe description $serviceName "WinFF 局域网共享服务"

    # 启动服务
    Start-Service -Name $serviceName
    Start-Sleep -Seconds 3

    if ((Get-Service -Name $serviceName).Status -eq "Running") {
        Write-Success "Windows 服务创建并启动成功"
    }
} catch {
    Write-Warn "创建服务失败，将使用启动脚本方式"
}

# 获取本机 IP
try {
    $localIP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notlike "*Loopback*" -and $_.IPAddress -like "192.168.*" -or $_.IPAddress -like "10.*" } | Select-Object -First 1).IPAddress
    if (-not $localIP) {
        $localIP = (Test-Connection -ComputerName (hostname) -Count 1 | Select-Object -ExpandProperty IPV4Address).IPAddress
    }
} catch {
    $localIP = "localhost"
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "          WinFF 安装完成!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "  服务状态：运行中"
Write-Host "  监听端口：$WinFFPort"
Write-Host ""
Write-Host "  访问地址:"
Write-Host "    本机：http://localhost:$WinFFPort"
Write-Host "    局域网：http://$localIP:$WinFFPort"
Write-Host ""
Write-Host "  管理命令:"
Write-Host "    启动：net start WinFF"
Write-Host "    停止：net stop WinFF"
Write-Host "    重启：net stop WinFF && net start WinFF"
Write-Host ""
Write-Host "  或直接运行：$WinFFInstallDir\start.bat"
Write-Host ""
Write-Host "============================================"
