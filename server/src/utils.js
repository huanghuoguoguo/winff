const os = require('os');
const path = require('path');

/**
 * 获取本机局域网 IPv4 地址
 * 优先返回 192.168.x.x 或 10.x.x.x 等私有地址，并过滤掉常见的虚拟网卡和代理网卡
 */
function getLocalIP() {
    const interfaces = os.networkInterfaces();
    let defaultIp = '127.0.0.1';

    for (const name of Object.keys(interfaces)) {
        // 跳过已知的虚拟网卡和代理网卡
        if (name.toLowerCase().includes('vEthernet') ||
            name.toLowerCase().includes('vmware') ||
            name.toLowerCase().includes('virtual') ||
            name.toLowerCase().includes('wsl') ||
            name.toLowerCase().includes('meta') ||
            name.toLowerCase().includes('clash') ||
            name.toLowerCase().includes('tailscale')) {
            continue;
        }

        for (const iface of interfaces[name]) {
            // 必须是 IPv4，且不是环回地址
            if (iface.family === 'IPv4' && !iface.internal) {
                // 过滤掉代理软件常用的虚拟 IP 池 (如 198.18.x.x)
                if (iface.address.startsWith('198.18.')) {
                    continue;
                }

                // 优先返回以 192.168 或 10. 开头的标准家用局域网 IP
                if (iface.address.startsWith('192.168.') || iface.address.startsWith('10.')) {
                    return iface.address;
                }

                // 兜底记录一个正常的外部 IP
                defaultIp = iface.address;
            }
        }
    }
    return defaultIp;
}

/**
 * 格式化文件大小 (bytes -> 可读字符串)
 */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return (bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1) + ' ' + units[i];
}

/**
 * 根据文件扩展名判断文件类别
 */
function getFileCategory(filename) {
    const ext = path.extname(filename).toLowerCase();
    const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg', '.ico', '.heic'];
    const videoExts = ['.mp4', '.webm', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.m4v', '.3gp'];
    const audioExts = ['.mp3', '.wav', '.ogg', '.flac', '.aac', '.m4a', '.wma'];
    const docExts = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.md', '.csv'];

    if (imageExts.includes(ext)) return 'image';
    if (videoExts.includes(ext)) return 'video';
    if (audioExts.includes(ext)) return 'audio';
    if (docExts.includes(ext)) return 'document';
    return 'other';
}

/**
 * 从 User-Agent 解析设备名称
 */
function parseDeviceName(userAgent) {
    if (!userAgent) return '未知设备';

    // 手机设备
    if (/iPhone/.test(userAgent)) {
        const match = userAgent.match(/iPhone\s?(\w*)/);
        return match ? `iPhone ${match[1]}`.trim() : 'iPhone';
    }
    if (/Android/.test(userAgent)) {
        // 尝试提取设备型号
        const match = userAgent.match(/;\s*([^;)]+)\s*Build/);
        if (match) return match[1].trim();
        return 'Android 设备';
    }
    if (/iPad/.test(userAgent)) return 'iPad';

    // 电脑
    if (/Windows/.test(userAgent)) return 'Windows 电脑';
    if (/Macintosh/.test(userAgent)) return 'Mac 电脑';
    if (/Linux/.test(userAgent)) return 'Linux 电脑';

    return '未知设备';
}

/**
 * 检查路径是否安全（防止路径遍历攻击）
 */
function isPathSafe(basePath, targetPath) {
    const resolvedBase = path.resolve(basePath);
    const resolvedTarget = path.resolve(basePath, targetPath);
    return resolvedTarget.startsWith(resolvedBase);
}

/**
 * 解析虚拟路径
 * @param {Object} sharedDirs - 共享目录映射 (比如 {"E盘": "E:\\", "电影": "D:\\Movies"})
 * @param {string} relativePath - 客户端请求的相对路径 (比如 "E盘/Videos" 或 "")
 * @returns {Object} 包含 { isRoot, targetDir, alias, error } 的结果
 */
function resolveVirtualPath(sharedDirs, relativePath) {
    if (!relativePath || relativePath === '/') {
        return { isRoot: true };
    }

    // 处理路径分隔符并拆分
    const parts = relativePath.split(/[/\\]+/).filter(Boolean);
    if (parts.length === 0) return { isRoot: true };

    const alias = parts[0];
    const realRootPath = sharedDirs[alias];

    if (!realRootPath) {
        return { error: '挂载的目录不存在' };
    }

    const restPath = parts.slice(1).join('/');

    if (!restPath) {
        return { targetDir: realRootPath, isRoot: false, alias };
    }

    if (!isPathSafe(realRootPath, restPath)) {
        return { error: '禁止访问该路径' };
    }

    const targetDir = path.resolve(realRootPath, restPath);
    return { targetDir, isRoot: false, alias };
}

module.exports = {
    getLocalIP,
    formatFileSize,
    getFileCategory,
    parseDeviceName,
    isPathSafe,
    resolveVirtualPath
};
