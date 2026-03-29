const fs = require('fs');
const path = require('path');
const mime = require('mime-types');
const { isPathSafe } = require('./utils');

/**
 * 创建文件流/下载路由
 * @param {Object} sharedDirs - 共享根目录映射
 */
function createStreamRouter(sharedDirs) {
    const router = require('express').Router();

    /**
     * GET /api/stream?path=xxx
     * 支持 Range 请求的流式文件传输
     */
    router.get('/', (req, res) => {
        const filePath = req.query.path;

        if (!filePath) {
            return res.status(400).json({ error: '缺少 path 参数' });
        }

        const { isRoot, targetDir, error } = require('./utils').resolveVirtualPath(sharedDirs, filePath);

        if (error) {
            return res.status(403).json({ error });
        }
        if (isRoot) {
            return res.status(400).json({ error: '不能流式传输目录' });
        }

        const absolutePath = targetDir;

        // 检查文件是否存在
        if (!fs.existsSync(absolutePath)) {
            return res.status(404).json({ error: '文件不存在' });
        }

        const stat = fs.statSync(absolutePath);

        if (stat.isDirectory()) {
            return res.status(400).json({ error: '不能流式传输目录' });
        }

        const fileSize = stat.size;
        const mimeType = mime.lookup(absolutePath) || 'application/octet-stream';
        const range = req.headers.range;

        if (range) {
            // === Range 请求：视频拖拽的核心 ===
            const parts = range.replace(/bytes=/, '').split('-');
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

            // 验证 range 合法性
            if (start >= fileSize || end >= fileSize || start > end) {
                res.status(416).set({
                    'Content-Range': `bytes */${fileSize}`,
                });
                return res.end();
            }

            const chunkSize = end - start + 1;

            res.status(206).set({
                'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunkSize,
                'Content-Type': mimeType,
            });

            const stream = fs.createReadStream(absolutePath, { start, end });
            stream.pipe(res);
        } else {
            // === 普通请求：完整返回文件 ===
            res.set({
                'Content-Length': fileSize,
                'Content-Type': mimeType,
                'Accept-Ranges': 'bytes',
                'Cache-Control': 'public, max-age=86400',
            });

            const stream = fs.createReadStream(absolutePath);
            stream.pipe(res);
        }
    });

    /**
     * GET /api/download?path=xxx
     * 强制下载文件
     */
    router.get('/download', (req, res) => {
        const filePath = req.query.path;

        if (!filePath) {
            return res.status(400).json({ error: '缺少 path 参数' });
        }

        const { isRoot, targetDir, error } = require('./utils').resolveVirtualPath(sharedDirs, filePath);

        if (error) {
            return res.status(403).json({ error });
        }
        if (isRoot) {
            return res.status(400).json({ error: '不能下载目录' });
        }

        const absolutePath = targetDir;

        if (!fs.existsSync(absolutePath)) {
            return res.status(404).json({ error: '文件不存在' });
        }

        const fileName = path.basename(absolutePath);
        res.download(absolutePath, fileName);
    });

    return router;
}

module.exports = { createStreamRouter };
