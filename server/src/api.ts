import fs from 'fs';
import path from 'path';
import { Router, Request, Response } from 'express';
import { formatFileSize, getFileCategory, isPathSafe, resolveVirtualPath, SharedDirs, FileInfo } from './utils';

/**
 * 创建文件列表 API 路由
 * @param sharedDirs - 共享根目录映射
 */
export function createApiRouter(sharedDirs: SharedDirs): Router {
  const router = Router();

  /**
   * GET /api/files?path=xxx
   * 获取指定目录下的文件列表
   */
  router.get('/files', (req: Request, res: Response) => {
    const relativePath = req.query.path as string || '';

    const { isRoot, targetDir, error } = resolveVirtualPath(sharedDirs, relativePath);

    if (error) {
      return res.status(403).json({ error });
    }

    if (isRoot) {
      // 返回共享目录列表作为虚拟根目录
      const items = Object.keys(sharedDirs).map(alias => ({
        name: alias,
        path: alias,
        isDirectory: true,
        size: 0,
        sizeFormatted: '',
        category: 'other'
      }));

      return res.json({
        currentPath: '/',
        parentPath: null,
        items,
        totalItems: items.length
      });
    }

    // 检查目录是否存在
    if (!fs.existsSync(targetDir!)) {
      return res.status(404).json({ error: '目录不存在' });
    }

    const stat = fs.statSync(targetDir!);
    if (!stat.isDirectory()) {
      return res.status(400).json({ error: '路径不是目录' });
    }

    try {
      const items = fs.readdirSync(targetDir!, { withFileTypes: true });

      const fileList = items
        .filter((item) => {
          // 过滤掉隐藏文件（以 . 开头的）
          return !item.name.startsWith('.');
        })
        .map((item) => {
          const itemPath = path.join(targetDir!, item.name);
          const itemRelativePath = relativePath
            ? path.join(relativePath, item.name)
            : item.name;

          const info: FileInfo = {
            name: item.name,
            path: itemRelativePath.replace(/\\/g, '/'), // 统一用正斜杠
            isDirectory: item.isDirectory(),
          };

          if (!item.isDirectory()) {
            try {
              const fileStat = fs.statSync(itemPath);
              info.size = fileStat.size;
              info.sizeFormatted = formatFileSize(fileStat.size);
              info.modifiedAt = fileStat.mtime.toISOString();
              info.category = getFileCategory(item.name);
            } catch (e) {
              info.size = 0;
              info.sizeFormatted = '未知';
              info.category = 'other';
            }
          }

          return info;
        })
        .sort((a, b) => {
          // 目录排在前面，然后按名称排序
          if (a.isDirectory && !b.isDirectory) return -1;
          if (!a.isDirectory && b.isDirectory) return 1;
          return a.name.localeCompare(b.name, 'zh-CN');
        });

      res.json({
        currentPath: relativePath || '/',
        parentPath: relativePath ? path.dirname(relativePath).replace(/\\/g, '/') : null,
        items: fileList,
        totalItems: fileList.length,
      });
    } catch (err) {
      console.error('读取目录失败:', err);
      res.status(500).json({ error: '读取目录失败' });
    }
  });

  return router;
}
