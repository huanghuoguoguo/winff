import path from 'path';
import multer from 'multer';
import fs from 'fs';
import { Request, Response, Router } from 'express';
import { Server } from 'socket.io';
import { resolveVirtualPath, SharedDirs } from './utils';
import { notifyFileUpdate, FileUpdateInfo } from './socket';

export interface UploadedFile {
  name: string;
  savedAs: string;
  size: number;
  path: string;
}

export interface UploadResponse {
  success: boolean;
  message: string;
  files: UploadedFile[];
}

/**
 * 创建文件上传路由
 * @param uploadDir - 默认上传目录
 * @param sharedDirs - 共享目录映射
 * @param io - Socket.IO 实例
 */
export function createUploadRouter(
  uploadDir: string,
  sharedDirs: SharedDirs,
  io: Server
): Router {
  const router = Router();

  // 确保默认上传目录存在
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  // 配置 multer 存储
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      // 支持上传到共享目录下的任意位置
      const targetPathParam = req.body.targetDir || '';

      let targetPath: string;
      if (targetPathParam) {
        // 解析虚拟路径（例如 "E 盘/照片/2024"）
        const resolved = resolveVirtualPath(sharedDirs, targetPathParam);
        if (resolved.error || resolved.isRoot) {
          // 如果路径无效或是根目录，使用默认上传目录
          targetPath = uploadDir;
        } else {
          targetPath = resolved.targetDir!;
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
      let targetPath: string;
      if (targetPathParam) {
        const resolved = resolveVirtualPath(sharedDirs, targetPathParam);
        if (resolved.error || resolved.isRoot) {
          targetPath = uploadDir;
        } else {
          targetPath = resolved.targetDir!;
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
  router.post('/', upload.array('files', 20), (req: Request, res: Response<UploadResponse>) => {
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      return res.status(400).json({ error: '没有检测到上传的文件' } as unknown as UploadResponse);
    }

    const uploadedFiles: UploadedFile[] = files.map((f) => {
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
      notifyFileUpdate(io, {
        action: 'upload',
        files: uploadedFiles.map((f) => f.name),
        uploadedBy: req.headers['x-device-name'] as string || '未知设备',
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
