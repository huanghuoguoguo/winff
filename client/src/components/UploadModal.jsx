import { useState, useRef, useEffect } from 'react';
import { Upload, X, CheckCircle, AlertCircle, FileUp } from 'lucide-react';
import { uploadFiles } from '../api';

export default function UploadModal({ onClose, initialFiles }) {
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [uploadSpeed, setUploadSpeed] = useState(0);
    const [remainingTime, setRemainingTime] = useState(null);
    const [result, setResult] = useState(null);
    const [dragOver, setDragOver] = useState(false);
    const [isFolderUpload, setIsFolderUpload] = useState(false);
    const inputRef = useRef(null);
    const folderInputRef = useRef(null);
    const uploadTaskRef = useRef(null);

    // 格式化速度
    const formatSpeed = (bytesPerSecond) => {
        if (!bytesPerSecond || bytesPerSecond <= 0) return '--';
        if (bytesPerSecond < 1024) return bytesPerSecond.toFixed(0) + ' B/s';
        if (bytesPerSecond < 1024 * 1024) return (bytesPerSecond / 1024).toFixed(1) + ' KB/s';
        return (bytesPerSecond / (1024 * 1024)).toFixed(1) + ' MB/s';
    };

    // 格式化时间
    const formatTime = (seconds) => {
        if (!seconds || seconds <= 0) return '--';
        if (seconds < 60) return Math.round(seconds) + ' 秒';
        const mins = Math.floor(seconds / 60);
        const secs = Math.round(seconds % 60);
        return `${mins}分${secs}秒`;
    };

    // 如果有初始文件（从全局拖拽），自动处理
    useEffect(() => {
        if (initialFiles && initialFiles.length > 0) {
            handleFiles(initialFiles);
        }
    }, [initialFiles]);

    // 根据进度和速度计算剩余时间
    useEffect(() => {
        if (uploading && progress > 0 && uploadSpeed > 0) {
            const remaining = ((100 - progress) / 100) * (progress / (uploadSpeed / 1));
            setRemainingTime(remaining);
        } else {
            setRemainingTime(null);
        }
    }, [progress, uploadSpeed, uploading]);

    const handleFiles = (files, isFolder = false) => {
        setSelectedFiles(Array.from(files));
        setIsFolderUpload(isFolder);
        setResult(null);
    };

    // 按目录结构分组文件
    const groupFilesByDirectory = (files) => {
        const dirMap = new Map();
        for (const file of files) {
            if (file.webkitRelativePath) {
                const parts = file.webkitRelativePath.split('/');
                const dir = parts.slice(0, -1).join('/');
                if (!dirMap.has(dir)) {
                    dirMap.set(dir, []);
                }
                dirMap.get(dir).push(file);
            }
        }
        return dirMap;
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setDragOver(false);
        if (e.dataTransfer.files.length > 0) {
            handleFiles(e.dataTransfer.files);
        }
    };

    const handleUpload = async () => {
        if (selectedFiles.length === 0) return;
        setUploading(true);
        setProgress(0);
        setUploadSpeed(0);
        setRemainingTime(null);
        setResult(null);

        try {
            // 如果是文件夹上传，按目录结构分别上传
            if (isFolderUpload && selectedFiles[0].webkitRelativePath) {
                const dirMap = groupFilesByDirectory(selectedFiles);
                const totalDirs = dirMap.size;
                let completedDirs = 0;
                let totalProgress = 0;

                for (const [dir, files] of dirMap) {
                    const task = uploadFiles(files, dir, (data) => {
                        // 计算总体进度
                        const dirProgress = data.percent / 100;
                        const weight = 1 / totalDirs;
                        totalProgress += dirProgress * weight;
                        setProgress(Math.min(100, Math.round(totalProgress * 100)));
                        setUploadSpeed(data.speed);
                    });
                    uploadTaskRef.current = task;
                    await task.promise;
                    completedDirs++;
                }

                setResult({ success: true, message: `成功上传 ${completedDirs} 个目录` });
            } else {
                const task = uploadFiles(selectedFiles, '', (data) => {
                    setProgress(data.percent);
                    setUploadSpeed(data.speed);
                });
                uploadTaskRef.current = task;

                const res = await task.promise;
                setResult({ success: true, message: res.message });
            }

            setSelectedFiles([]);
            // 通知文件列表刷新
            if (window.__winff_refreshFiles) {
                window.__winff_refreshFiles();
            }
        } catch (err) {
            if (err.name !== 'AbortError') {
                setResult({ success: false, message: err.message || '上传失败' });
            }
        } finally {
            setUploading(false);
            uploadTaskRef.current = null;
        }
    };

    const handleCancel = () => {
        if (uploadTaskRef.current) {
            uploadTaskRef.current.abort();
            setUploading(false);
            setResult({ success: false, message: '已取消上传' });
            uploadTaskRef.current = null;
        }
    };

    const formatSize = (bytes) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
        return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center" onClick={onClose}>
            <div
                className="bg-[var(--color-surface)] w-full sm:w-[480px] sm:rounded-2xl rounded-t-2xl max-h-[80vh] flex flex-col animate-slide-up"
                onClick={(e) => e.stopPropagation()}
            >
                {/* 头部 */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
                    <h2 className="font-semibold text-base flex items-center gap-2">
                        <Upload size={18} className="text-[var(--color-primary-light)]" />
                        上传文件
                    </h2>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--color-surface-hover)] transition cursor-pointer">
                        <X size={18} />
                    </button>
                </div>

                {/* 拖拽目标区域 */}
                <div className="p-5 flex-1 overflow-y-auto">
                    <div
                        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={handleDrop}
                        className={`
              border-2 border-dashed rounded-xl p-8 text-center transition-all mb-4
              ${dragOver
                                ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10'
                                : 'border-[var(--color-border)] hover:border-[var(--color-text-muted)]'
                            }
            `}
                    >
                        <FileUp size={40} className="mx-auto mb-3 text-[var(--color-text-muted)]" />
                        <p className="text-sm text-[var(--color-text-muted)]">
                            拖拽文件或文件夹到此处
                        </p>
                    </div>

                    {/* 选择文件按钮 */}
                    <div className="flex gap-2">
                        <button
                            onClick={() => inputRef.current?.click()}
                            className="flex-1 py-3 px-4 rounded-xl border border-[var(--color-border)] hover:bg-[var(--color-surface-hover)] transition-colors text-sm font-medium cursor-pointer"
                        >
                            选择文件
                        </button>
                        <button
                            onClick={() => folderInputRef.current?.click()}
                            className="flex-1 py-3 px-4 rounded-xl border border-[var(--color-border)] hover:bg-[var(--color-surface-hover)] transition-colors text-sm font-medium cursor-pointer"
                        >
                            选择文件夹
                        </button>
                    </div>

                    <input
                        ref={inputRef}
                        type="file"
                        multiple
                        className="hidden"
                        onChange={(e) => handleFiles(e.target.files, false)}
                    />
                    <input
                        ref={folderInputRef}
                        type="file"
                        webkitdirectory=""
                        mozdirectory=""
                        msdirectory=""
                        directory=""
                        className="hidden"
                        onChange={(e) => handleFiles(e.target.files, true)}
                    />

                    {/* 已选文件列表 */}
                    {selectedFiles.length > 0 && (
                        <div className="mt-4 space-y-2">
                            <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)]">
                                <span>已选择 {selectedFiles.length} 个文件</span>
                                {isFolderUpload && (
                                    <span className="px-2 py-0.5 rounded-full bg-[var(--color-primary)]/20 text-[var(--color-primary)]">
                                        文件夹模式
                                    </span>
                                )}
                            </div>
                            <div className="max-h-40 overflow-y-auto space-y-1">
                                {selectedFiles.slice(0, 10).map((file, i) => (
                                    <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-[var(--color-bg)] text-sm">
                                        <span className="truncate flex-1">{file.name}</span>
                                        <span className="text-[var(--color-text-muted)] shrink-0">{formatSize(file.size)}</span>
                                    </div>
                                ))}
                                {selectedFiles.length > 10 && (
                                    <p className="text-xs text-[var(--color-text-muted)] text-center py-1">
                                        还有 {selectedFiles.length - 10} 个文件...
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* 上传进度 */}
                    {uploading && (
                        <div className="mt-4">
                            <div className="flex justify-between text-xs text-[var(--color-text-muted)] mb-1">
                                <span>上传中... {progress}%</span>
                                <span className="flex items-center gap-2">
                                    <span>{formatSpeed(uploadSpeed)}</span>
                                    {remainingTime && <span>剩余 {formatTime(remainingTime)}</span>}
                                </span>
                            </div>
                            <div className="w-full h-2 bg-[var(--color-bg)] rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-light)] rounded-full transition-all duration-200"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </div>
                    )}

                    {/* 结果提示 */}
                    {result && (
                        <div className={`mt-4 flex items-center gap-2 p-3 rounded-lg text-sm ${result.success ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                            }`}>
                            {result.success ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                            {result.message}
                        </div>
                    )}
                </div>

                {/* 底部按钮 */}
                <div className="px-5 py-4 border-t border-[var(--color-border)]">
                    {uploading ? (
                        <button
                            onClick={handleCancel}
                            className="w-full py-3 rounded-xl font-medium text-sm transition-all bg-[var(--color-danger)] hover:bg-[var(--color-danger-dark)] text-white cursor-pointer shadow-lg shadow-[var(--color-danger)]/25"
                        >
                            取消上传
                        </button>
                    ) : (
                        <button
                            onClick={handleUpload}
                            disabled={selectedFiles.length === 0 || uploading}
                            className={`
                w-full py-3 rounded-xl font-medium text-sm transition-all
                ${selectedFiles.length > 0 && !uploading
                                    ? 'bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white cursor-pointer shadow-lg shadow-[var(--color-primary)]/25'
                                    : 'bg-[var(--color-border)] text-[var(--color-text-muted)] cursor-not-allowed'
                                }
              `}
                        >
                            {uploading ? '上传中...' : `上传 ${selectedFiles.length > 0 ? `(${selectedFiles.length} 个文件)` : ''}`}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
