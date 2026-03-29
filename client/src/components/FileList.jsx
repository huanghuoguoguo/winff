import { useState, useEffect } from 'react';
import {
    Folder, FileText, Film, Image, Music, File, ChevronRight,
    ArrowLeft, Download, Eye, LayoutGrid, List, Search, X
} from 'lucide-react';
import { fetchFiles, getStreamUrl, getDownloadUrl } from '../api';

const categoryIcons = {
    image: Image,
    video: Film,
    audio: Music,
    document: FileText,
    other: File,
};

const categoryColors = {
    image: 'text-emerald-400',
    video: 'text-purple-400',
    audio: 'text-amber-400',
    document: 'text-blue-400',
    other: 'text-slate-400',
};

export default function FileList({ onPreviewImage, onPlayVideo }) {
    const [currentPath, setCurrentPath] = useState('');
    const [parentPath, setParentPath] = useState(null);
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState(() => {
        return localStorage.getItem('winff-view-mode') || 'list';
    });
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);

    useEffect(() => {
        localStorage.setItem('winff-view-mode', viewMode);
    }, [viewMode]);

    const loadFiles = async (dirPath = '') => {
        setLoading(true);
        try {
            const data = await fetchFiles(dirPath);
            setFiles(data.items || []);
            setCurrentPath(data.currentPath || '/');
            setParentPath(data.parentPath);
            // 切换目录时清空搜索
            setSearchQuery('');
            setIsSearching(false);
        } catch (err) {
            console.error('加载文件列表失败:', err);
        } finally {
            setLoading(false);
        }
    };

    // 过滤文件（搜索逻辑）
    const filteredFiles = searchQuery.trim()
        ? files.filter(file => {
            const query = searchQuery.toLowerCase();
            return file.name.toLowerCase().includes(query);
        })
        : files;

    useEffect(() => {
        loadFiles();
    }, []);

    // 暴露刷新方法给父组件
    useEffect(() => {
        window.__winff_refreshFiles = () => loadFiles(currentPath === '/' ? '' : currentPath);
        return () => { delete window.__winff_refreshFiles; };
    }, [currentPath]);

    const handleItemClick = (item) => {
        if (item.isDirectory) {
            loadFiles(item.path);
        } else if (item.category === 'image') {
            onPreviewImage?.(getStreamUrl(item.path), item.name);
        } else if (item.category === 'video') {
            onPlayVideo?.(getStreamUrl(item.path), item.name);
        }
    };

    const handleGoBack = () => {
        if (parentPath !== null) {
            loadFiles(parentPath === '.' ? '' : parentPath);
        }
    };

    // 面包屑路径
    const pathParts = currentPath === '/' ? [] : currentPath.split('/').filter(Boolean);

    return (
        <div className="flex flex-col h-full">
            {/* 路径导航与工具栏 */}
            <div className="flex flex-col gap-2 px-4 py-3 border-b border-[var(--color-border)]">
                <div className="flex items-center gap-2">
                    {/* 搜索框 */}
                    <div className="relative flex-1">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setIsSearching(e.target.value.trim() !== '');
                            }}
                            placeholder="搜索当前目录..."
                            className="w-full pl-9 pr-8 py-2 text-sm rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:outline-none transition-colors"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => { setSearchQuery(''); setIsSearching(false); }}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-[var(--color-surface-hover)] transition-colors cursor-pointer"
                            >
                                <X size={14} className="text-[var(--color-text-muted)]" />
                            </button>
                        )}
                    </div>

                    {/* 视图切换 */}
                    <div className="flex items-center gap-1 bg-[var(--color-surface-hover)] p-1 rounded-lg shrink-0">
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-1.5 rounded-md transition-colors cursor-pointer ${viewMode === 'list' ? 'bg-[var(--color-bg)] text-[var(--color-primary)] shadow-sm border border-[var(--color-border)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] border border-transparent'}`}
                            title="列表视图"
                        >
                            <List size={16} />
                        </button>
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-1.5 rounded-md transition-colors cursor-pointer ${viewMode === 'grid' ? 'bg-[var(--color-bg)] text-[var(--color-primary)] shadow-sm border border-[var(--color-border)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] border border-transparent'}`}
                            title="大图标视图"
                        >
                            <LayoutGrid size={16} />
                        </button>
                    </div>
                </div>

                {/* 路径导航 */}
                <div className="flex items-center gap-1 overflow-x-auto whitespace-nowrap text-sm">
                    {parentPath !== null && (
                        <button
                            onClick={handleGoBack}
                            className="p-1.5 rounded-lg hover:bg-[var(--color-surface-hover)] transition-colors shrink-0 cursor-pointer"
                        >
                            <ArrowLeft size={18} />
                        </button>
                    )}
                    <button
                        onClick={() => loadFiles('')}
                        className="px-2 py-1 rounded hover:bg-[var(--color-surface-hover)] transition-colors text-[var(--color-primary-light)] font-medium cursor-pointer"
                    >
                        根目录
                    </button>
                    {pathParts.map((part, i) => (
                        <span key={i} className="flex items-center gap-1">
                            <ChevronRight size={14} className="text-[var(--color-text-muted)] shrink-0" />
                            <button
                                onClick={() => loadFiles(pathParts.slice(0, i + 1).join('/'))}
                                className="px-2 py-1 rounded hover:bg-[var(--color-surface-hover)] transition-colors cursor-pointer"
                            >
                                {part}
                            </button>
                        </span>
                    ))}
                    {isSearching && (
                        <span className="flex items-center gap-1 text-[var(--color-primary)]">
                            <ChevronRight size={14} className="shrink-0" />
                            <span className="font-medium">搜索结果：{searchQuery}</span>
                        </span>
                    )}
                </div>
            </div>

            {/* 文件列表 */}
            <div className="flex-1 overflow-y-auto">
                {loading ? (
                    <div className="flex items-center justify-center h-40">
                        <div className="w-8 h-8 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : filteredFiles.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 text-[var(--color-text-muted)]">
                        <Folder size={48} className="mb-2 opacity-30" />
                        <p>
                            {searchQuery.trim()
                                ? `没有找到匹配 "${searchQuery}" 的文件`
                                : (files.length === 0 ? '此目录为空' : '没有权限访问此目录')}
                        </p>
                    </div>
                ) : (
                    <div className={viewMode === 'list' ? "divide-y divide-[var(--color-border)]" : "p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"}>
                        {filteredFiles.map((item, index) => {
                            const IconComp = item.isDirectory
                                ? Folder
                                : (categoryIcons[item.category] || File);
                            const iconColor = item.isDirectory
                                ? 'text-yellow-400'
                                : (categoryColors[item.category] || 'text-slate-400');

                            if (viewMode === 'grid') {
                                return (
                                    <div
                                        key={item.path}
                                        className="flex flex-col items-center gap-2 p-3 rounded-2xl border border-transparent hover:border-[var(--color-border)] hover:bg-[var(--color-surface-hover)] hover:shadow-md transition-all cursor-pointer group animate-fade-in relative text-center"
                                        style={{ animationDelay: `${index * 20}ms` }}
                                        onClick={() => handleItemClick(item)}
                                    >
                                        <div className={`w-20 h-20 flex items-center justify-center rounded-xl overflow-hidden ${item.category === 'image' ? 'shadow-sm border border-[var(--color-border)] bg-[var(--color-surface)]/50' : iconColor}`}>
                                            {item.category === 'image' ? (
                                                <img
                                                    src={getStreamUrl(item.path)}
                                                    alt={item.name}
                                                    loading="lazy"
                                                    className="w-full h-full object-cover transition-transform group-hover:scale-110"
                                                />
                                            ) : (
                                                <IconComp size={48} className="opacity-80" />
                                            )}
                                        </div>

                                        <div className="w-full">
                                            <p className="text-sm font-medium truncate w-full px-1" title={item.name}>{item.name}</p>
                                            {!item.isDirectory && (
                                                <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">{item.sizeFormatted}</p>
                                            )}
                                        </div>

                                        {!item.isDirectory && (
                                            <div className="absolute top-2 right-2 flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {(item.category === 'image' || item.category === 'video') && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleItemClick(item); }}
                                                        className="p-1.5 rounded-lg bg-[var(--color-surface)]/90 backdrop-blur-sm border border-[var(--color-border)] shadow-sm hover:text-[var(--color-primary)] text-[var(--color-text)] transition-colors cursor-pointer"
                                                        title="预览"
                                                    >
                                                        <Eye size={14} />
                                                    </button>
                                                )}
                                                <a
                                                    href={getDownloadUrl(item.path)}
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="p-1.5 rounded-lg bg-[var(--color-surface)]/90 backdrop-blur-sm border border-[var(--color-border)] shadow-sm hover:text-[var(--color-primary)] text-[var(--color-text)] transition-colors"
                                                    title="下载"
                                                >
                                                    <Download size={14} />
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                );
                            }

                            return (
                                <div
                                    key={item.path}
                                    className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--color-surface-hover)] transition-all cursor-pointer animate-fade-in group"
                                    style={{ animationDelay: `${index * 30}ms` }}
                                    onClick={() => handleItemClick(item)}
                                >
                                    {/* 缩略图或图标 */}
                                    <div className={`shrink-0 flex items-center justify-center ${item.category === 'image' ? '' : iconColor} ${item.category === 'image' ? 'w-10 h-10' : 'w-10 h-10'}`}>
                                        {item.category === 'image' ? (
                                            <div className="w-10 h-10 rounded-lg overflow-hidden border border-[var(--color-border)] shadow-sm bg-[var(--color-surface)]/50 shrink-0">
                                                <img
                                                    src={getStreamUrl(item.path)}
                                                    alt={item.name}
                                                    loading="lazy"
                                                    className="w-full h-full object-cover transition-transform hover:scale-110"
                                                />
                                            </div>
                                        ) : (
                                            <IconComp size={22} className="opacity-80" />
                                        )}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <p className="truncate font-medium text-sm">{item.name}</p>
                                        {!item.isDirectory && (
                                            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                                                {item.sizeFormatted}
                                            </p>
                                        )}
                                    </div>

                                    {!item.isDirectory && (
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                            {(item.category === 'image' || item.category === 'video') && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleItemClick(item); }}
                                                    className="p-1.5 rounded-lg hover:bg-[var(--color-primary)]/20 text-[var(--color-primary-light)] cursor-pointer"
                                                    title="预览"
                                                >
                                                    <Eye size={16} />
                                                </button>
                                            )}
                                            <a
                                                href={getDownloadUrl(item.path)}
                                                onClick={(e) => e.stopPropagation()}
                                                className="p-1.5 rounded-lg hover:bg-[var(--color-primary)]/20 text-[var(--color-primary-light)]"
                                                title="下载"
                                            >
                                                <Download size={16} />
                                            </a>
                                        </div>
                                    )}

                                    {item.isDirectory && (
                                        <ChevronRight size={16} className="text-[var(--color-text-muted)] shrink-0" />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
