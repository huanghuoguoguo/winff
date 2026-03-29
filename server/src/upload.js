const path = require('path');
const multer = require('multer');
const fs = require('fs');
const { resolveVirtualPath } = require('./utils');

/**
 * 创建文件上传路由
 * @param {string} uploadDir - 默认上传目录（用于兼容）
 * @param {Object} sharedDirs - 共享目录映射
 * @param {import('socket.io').Server} io - Socket.IO 实例（用于广播通知）
 */
function createUploadRouter(uploadDir, sharedDirs, io) {
    const router = require('express').Router();

    // 确保默认上传目录存在
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
    }

    // 配置 multer 存储
    const storage = multer.diskStorage({
        destination: (req, file, cb) => {
            // 支持上传到共享目录下的任意位置
            const targetPathParam = req.body.targetDir || '';
            
            let targetPath;
            if (targetPathParam) {
                // 解析虚拟路径（例如 "E 盘/照片/2024"）
                const resolved = resolveVirtualPath(sharedDirs, targetPathParam);
                if (resolved.error || resolved.isRoot) {
                    // 如果路径无效或是根目录，使用默认上传目录
                    targetPath = uploadDir;
                } else {
                    targetPath = resolved.targetDir;
                }
            } else {
                // 没有指定目标目录，使用默认上传目录
                targetPath = uploadDir;
            }

            // 直接使用 mkdirSync，不需要预先检查存在性
            fs.mkdirSync(targetPath, { recursive: true });

            cb(null, targetPath);
        },
        filename: (req, file, cb) => {
            // 解决中文文件名乱码问题
            const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');

            // 使用与 destination 相同的路径解析逻辑
            const targetPathParam = req.body.targetDir || '';
            let targetPath;
            if (targetPathParam) {
                const resolved = resolveVirtualPath(sharedDirs, targetPathParam);
                if (resolved.error || resolved.isRoot) {
                    targetPath = uploadDir;
                } else {
                    targetPath = resolved.targetDir;
                }
            } else {
                targetPath = uploadDir;
            }

            const fullPath = path.join(targetPath, originalName);

            if (fs.existsSync(fullPath)) {
                const ext = path.extname(originalName);
                const base = path.basename(originalName, ext);
                const timestamp = Date.now();
                cb(null, `${base}_${timestamp}${ext}`);
            } else {
                cb(null, originalName);
            }
        },
    });

    const upload = multer({
        storage,
        limits: {
            fileSize: 10 * 1024 * 1024 * 1024, // 10GB 限制
        },
    });

    /**
     * POST /api/upload
     * 上传文件（支持多文件同时上传）
     */
    router.post('/', upload.array('files', 20), (req, res) => {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: '没有检测到上传的文件' });
        }

        const uploadedFiles = req.files.map((f) => {
            const originalName = Buffer.from(f.originalname, 'latin1').toString('utf8');
            return {
                name: originalName,
                savedAs: f.filename,
                size: f.size,
                path: f.path,
            };
        });

        console.log(`[↑] 收到 ${uploadedFiles.length} 个文件上传:`);
        uploadedFiles.forEach((f) => console.log(`    - ${f.name} (${f.size} bytes)`));

        // 通过 WebSocket 广播文件更新事件
        if (io) {
            const { notifyFileUpdate } = require('./socket');
            notifyFileUpdate(io, {
                action: 'upload',
                files: uploadedFiles.map((f) => f.name),
                uploadedBy: req.headers['x-device-name'] || '未知设备',
                timestamp: new Date().toISOString(),
            });
        }

        res.json({
            success: true,
            message: `成功上传 ${uploadedFiles.length} 个文件`,
            files: uploadedFiles,
        });
    });

    return router;
}

module.exports = { createUploadRouter };
