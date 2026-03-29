const BASE = import.meta.env.DEV ? 'http://localhost:3000' : '';

/**
 * 获取文件列表
 */
export async function fetchFiles(dirPath = '') {
    const res = await fetch(`${BASE}/api/files?path=${encodeURIComponent(dirPath)}`);
    if (!res.ok) throw new Error('获取文件列表失败');
    return res.json();
}

/**
 * 获取文件流地址（图片/视频/音频等）
 */
export function getStreamUrl(filePath) {
    return `${BASE}/api/stream?path=${encodeURIComponent(filePath)}`;
}

/**
 * 获取下载地址
 */
export function getDownloadUrl(filePath) {
    return `${BASE}/api/stream/download?path=${encodeURIComponent(filePath)}`;
}

/**
 * 上传文件
 * @param {FileList|File[]} files
 * @param {string} targetDir - 目标子目录
 * @param {function} onProgress - 进度回调 { percent, loaded, total, speed }
 * @returns {{ promise: Promise, abort: function }} - 可取消的上传任务
 */
export function uploadFiles(files, targetDir = '', onProgress) {
    let startTime = null;
    let lastLoaded = 0;
    let speedHistory = [];

    const formData = new FormData();
    for (const file of files) {
        formData.append('files', file);
    }
    if (targetDir) {
        formData.append('targetDir', targetDir);
    }

    const xhr = new XMLHttpRequest();

    // 计算上传速度
    const calculateSpeed = (loaded, timestamp) => {
        if (!startTime) {
            startTime = timestamp;
            return 0;
        }
        const elapsed = (timestamp - startTime) / 1000; // 秒
        if (elapsed < 0.5) return 0;

        const instantSpeed = (loaded - lastLoaded) / ((timestamp - lastLoaded) / 1000 || 1);
        speedHistory.push(instantSpeed);
        if (speedHistory.length > 5) speedHistory.shift();

        const avgSpeed = speedHistory.reduce((a, b) => a + b, 0) / speedHistory.length;
        lastLoaded = loaded;
        return avgSpeed;
    };

    xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) {
            const percent = Math.round((e.loaded / e.total) * 100);
            const speed = calculateSpeed(e.loaded, Date.now());
            onProgress({ percent, loaded: e.loaded, total: e.total, speed });
        }
    };

    const promise = new Promise((resolve, reject) => {
        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                resolve(JSON.parse(xhr.responseText));
            } else {
                reject(new Error(xhr.responseText || '上传失败'));
            }
        };

        xhr.onerror = () => reject(new Error('网络错误'));
    });

    xhr.send(formData);

    return {
        promise,
        abort: () => xhr.abort()
    };
}

/**
 * 获取服务器信息
 */
export async function fetchServerInfo() {
    const res = await fetch(`${BASE}/api/info`);
    if (!res.ok) throw new Error('获取服务器信息失败');
    return res.json();
}
