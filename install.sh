#!/usr/bin/env bash
# WinFF 一键安装脚本
# 用法：curl -fsSL https://raw.githubusercontent.com/your-user/winff/main/install.sh | sudo bash
#
# 环境变量:
#   WINFF_VERSION      - 版本号，默认 latest
#   WINFF_INSTALL_DIR  - 安装目录，默认 /opt/winff
#   WINFF_DATA_DIR     - 数据目录，默认 /root/winff-data
#   WINFF_PORT         - 端口，默认 3000

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置
WINFF_VERSION="${WINFF_VERSION:-latest}"
WINFF_INSTALL_DIR="${WINFF_INSTALL_DIR:-/opt/winff}"
WINFF_DATA_DIR="${WINFF_DATA_DIR:-/root/winff-data}"
WINFF_PORT="${WINFF_PORT:-3000}"

# 打印函数
info() { echo -e "${BLUE}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}[OK]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }

# 检查是否 root
check_root() {
    if [ "$EUID" -ne 0 ]; then
        error "请使用 root 用户运行此脚本 (sudo bash $0)"
        exit 1
    fi
}

# 检查系统
check_system() {
    if [ ! -f /etc/os-release ]; then
        error "无法识别系统信息"
        exit 1
    fi
    source /etc/os-release
    OS=$ID
    info "检测到操作系统：$PRETTY_NAME"
}

# 检查并安装 Node.js
install_nodejs() {
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node -v)
        success "Node.js 已安装：$NODE_VERSION"
        return
    fi

    info "正在安装 Node.js..."

    case $OS in
        ubuntu|debian)
            apt-get update -qq
            apt-get install -y -qq curl
            curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
            apt-get install -y -qq nodejs
            ;;
        centos|rhel|fedora)
            yum install -y -q curl
            curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
            yum install -y -q nodejs
            ;;
        alpine)
            apk add --no-cache nodejs npm
            ;;
        *)
            error "不支持的系统：$OS"
            exit 1
            ;;
    esac

    success "Node.js 安装完成"
}

# 停止旧服务
stop_existing() {
    if pgrep -f "winff" > /dev/null 2>&1; then
        info "停止现有服务..."
        pkill -f "winff" || true
        sleep 2
    fi
}

# 创建安装目录
create_dirs() {
    info "创建安装目录..."
    mkdir -p "$WINFF_INSTALL_DIR"
    mkdir -p "$WINFF_DATA_DIR"
}

# 下载 WinFF
download_winff() {
    info "下载 WinFF ${WINFF_VERSION}..."

    cd "$WINFF_INSTALL_DIR"

    # 尝试从 Releases 下载，失败则使用源码
    if [ "$WINFF_VERSION" = "latest" ]; then
        DOWNLOAD_URL="https://github.com/your-user/winff/releases/latest/download/winff-linux.tar.gz"
    else
        DOWNLOAD_URL="https://github.com/your-user/winff/releases/download/${WINFF_VERSION}/winff-linux.tar.gz"
    fi

    if curl -fsSL "$DOWNLOAD_URL" -o winff.tar.gz 2>/dev/null; then
        success "下载完成"
        tar -xzf winff.tar.gz
        rm -f winff.tar.gz
        return
    fi

    warn "Releases 下载失败，使用源码安装..."
    # 回退到源码安装
    if [ "$WINFF_VERSION" = "latest" ]; then
        SOURCE_URL="https://github.com/your-user/winff/archive/refs/heads/main.tar.gz"
    else
        SOURCE_URL="https://github.com/your-user/winff/archive/refs/tags/${WINFF_VERSION}.tar.gz"
    fi

    if ! curl -fsSL "$SOURCE_URL" -o source.tar.gz 2>/dev/null; then
        error "源码下载失败"
        exit 1
    fi

    tar -xzf source.tar.gz
    rm -f source.tar.gz

    # 移动文件
    local extracted_dir
    extracted_dir=$(ls -d */ | head -1)
    if [ -n "$extracted_dir" ]; then
        mv "${extracted_dir}"/* . 2>/dev/null || true
        mv "${extracted_dir}"/.[!.]* . 2>/dev/null || true
        rm -rf "$extracted_dir"
    fi
}

# 安装依赖
install_deps() {
    info "安装项目依赖..."

    cd "$WINFF_INSTALL_DIR"

    # 安装 server 依赖
    if [ -d "server" ]; then
        cd server
        npm install --production 2>&1 | tail -3
        cd ..
    fi

    # 如果没有预构建的 client，则构建
    if [ ! -f "server/public/index.html" ] && [ -d "client" ]; then
        info "构建前端..."
        cd client
        npm install 2>&1 | tail -3
        npm run build 2>&1 | tail -3
        cd ..
    fi

    success "依赖安装完成"
}

# 配置
setup_config() {
    info "配置 WinFF..."

    CONFIG_FILE="$WINFF_INSTALL_DIR/server/config.json"

    if [ ! -f "$CONFIG_FILE" ]; then
        cat > "$CONFIG_FILE" << EOF
{
  "port": $WINFF_PORT,
  "sharedDirs": {
    "默认共享": "$WINFF_DATA_DIR"
  }
}
EOF
        success "配置文件创建完成"
    else
        # 更新端口配置
        if grep -q '"port"' "$CONFIG_FILE"; then
            sed -i "s/\"port\":.*/\"port\": $WINFF_PORT,/" "$CONFIG_FILE"
        fi
        warn "配置文件已存在，仅更新端口"
    fi

    # 创建数据目录
    mkdir -p "$WINFF_DATA_DIR"
}

# 设置 systemd 服务
setup_systemd() {
    info "配置 systemd 服务..."

    cat > /etc/systemd/system/winff.service << EOF
[Unit]
Description=WinFF 局域网共享服务
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=$WINFF_INSTALL_DIR/server
ExecStart=/usr/bin/node src/index.js
Restart=on-failure
RestartSec=5
Environment=PORT=$WINFF_PORT

[Install]
WantedBy=multi-user.target
EOF

    systemctl daemon-reload
    systemctl enable winff
    success "systemd 服务配置完成"
}

# 启动服务
start_service() {
    info "启动 WinFF 服务..."

    systemctl start winff

    sleep 3

    if systemctl is-active --quiet winff; then
        success "WinFF 服务启动成功!"
    else
        error "服务启动失败，请检查日志：journalctl -u winff"
        exit 1
    fi
}

# 显示信息
show_info() {
    LOCAL_IP=$(hostname -I | awk '{print $1}')

    echo ""
    echo "============================================"
    echo -e "        ${GREEN}WinFF 安装完成!${NC}"
    echo "============================================"
    echo ""
    echo "  服务状态：$(systemctl is-active winff)"
    echo "  监听端口：$WINFF_PORT"
    echo ""
    echo "  访问地址:"
    echo "    本机：http://localhost:$WINFF_PORT"
    echo "    局域网：http://$LOCAL_IP:$WINFF_PORT"
    echo ""
    echo "  管理命令:"
    echo "    启动：systemctl start winff"
    echo "    停止：systemctl stop winff"
    echo "    重启：systemctl restart winff"
    echo "    日志：journalctl -u winff -f"
    echo ""
    echo "============================================"
}

# 主函数
main() {
    echo ""
    echo "============================================"
    echo "          WinFF 一键安装脚本"
    echo "============================================"
    echo ""

    check_root
    check_system
    stop_existing
    install_nodejs
    create_dirs
    download_winff
    install_deps
    setup_config
    setup_systemd
    start_service
    show_info
}

main
