const path = require('path');
const multer = require('multer');
const fs = require('fs');

/**
 * 创建文件上传路由
 * @param {string} uploadDir - 上传文件保存目录
 * @param {import('socket.io').Server} io - Socket.IO 实例（用于广播通知）
 */
function createUploadRouter(uploadDir, io) {
    const router = require('express').Router();

    // 确保上传目录存在
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
    }

    // 配置 multer 存储
    const storage = multer.diskStorage({
        destination: (req, file, cb) => {
            // 支持上传到子目录
            const subDir = req.body.targetDir || '';
            const targetPath = subDir ? path.join(uploadDir, subDir) : uploadDir;

            if (!fs.existsSync(targetPath)) {
                fs.mkdirSync(targetPath, { recursive: true });
            }

            cb(null, targetPath);
        },
        filename: (req, file, cb) => {
            // 解决中文文件名乱码问题
            const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');

            // 如果同名文件已存在，加上时间戳后缀
            const targetPath = req.body.targetDir
                ? path.join(uploadDir, req.body.targetDir)
                : uploadDir;
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
