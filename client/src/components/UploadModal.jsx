import { useState, useRef, useEffect } from 'react';
import { Upload, X, CheckCircle, AlertCircle, FileUp } from 'lucide-react';
import { uploadFiles } from '../api';

export default function UploadModal({ onClose, initialFiles }) {
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [result, setResult] = useState(null); // { success, message }
    const [dragOver, setDragOver] = useState(false);
    const inputRef = useRef(null);

    // 如果有初始文件（从全局拖拽），自动处理
    useEffect(() => {
        if (initialFiles && initialFiles.length > 0) {
            handleFiles(initialFiles);
        }
    }, [initialFiles]);

    const handleFiles = (files) => {
        setSelectedFiles(Array.from(files));
        setResult(null);
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
        setResult(null);

        try {
            const res = await uploadFiles(selectedFiles, '', (p) => setProgress(p));
            setResult({ success: true, message: res.message });
            setSelectedFiles([]);
            // 通知文件列表刷新
            if (window.__winff_refreshFiles) {
                window.__winff_refreshFiles();
            }
        } catch (err) {
            setResult({ success: false, message: err.message || '上传失败' });
        } finally {
            setUploading(false);
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
                        onClick={() => inputRef.current?.click()}
                        className={`
              border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
              ${dragOver
                                ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10'
                                : 'border-[var(--color-border)] hover:border-[var(--color-text-muted)]'
                            }
            `}
                    >
                        <FileUp size={40} className="mx-auto mb-3 text-[var(--color-text-muted)]" />
                        <p className="text-sm text-[var(--color-text-muted)]">
                            点击选择文件或拖拽到此处
                        </p>
                        <input
                            ref={inputRef}
                            type="file"
                            multiple
                            className="hidden"
                            onChange={(e) => handleFiles(e.target.files)}
                        />
                    </div>

                    {/* 已选文件列表 */}
                    {selectedFiles.length > 0 && (
                        <div className="mt-4 space-y-2">
                            <p className="text-xs text-[var(--color-text-muted)]">
                                已选择 {selectedFiles.length} 个文件
                            </p>
                            {selectedFiles.map((file, i) => (
                                <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-[var(--color-bg)] text-sm">
                                    <span className="truncate flex-1">{file.name}</span>
                                    <span className="text-[var(--color-text-muted)] shrink-0">{formatSize(file.size)}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* 上传进度 */}
                    {uploading && (
                        <div className="mt-4">
                            <div className="flex justify-between text-xs text-[var(--color-text-muted)] mb-1">
                                <span>上传中...</span>
                                <span>{progress}%</span>
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
                </div>
            </div>
        </div>
    );
}
