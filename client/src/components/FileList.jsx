import { useState, useEffect, useRef, useMemo } from 'react';
import {
    Folder, FileText, Film, Image, Music, File, ChevronRight,
    ArrowLeft, Download, Eye, LayoutGrid, List, Search, X,
    Check, CheckSquare, Square, Trash2, Archive,
    ArrowUpDown, ArrowUpAZ, ArrowDownAZ, ArrowDownWideNarrow, ArrowUpWideNarrow, Clock
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

export default function FileList({ onPreviewImage, onPlayVideo, onPathChange }) {
    const [currentPath, setCurrentPath] = useState('');
    const [parentPath, setParentPath] = useState(null);
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState(() => {
        return localStorage.getItem('winff-view-mode') || 'list';
    });
    const [sortBy, setSortBy] = useState(() => {
        return localStorage.getItem('winff-sort-by') || 'name';
    });
    const [sortOrder, setSortOrder] = useState(() => {
        return localStorage.getItem('winff-sort-order') || 'asc';
    });
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [showSortMenu, setShowSortMenu] = useState(false);
    // 分页状态
    const [visibleCount, setVisibleCount] = useState(100);
    const [hasMore, setHasMore] = useState(false);
    const listContainerRef = useRef(null);
    // 批量操作
    const [selectMode, setSelectMode] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState(new Set());

    useEffect(() => {
        localStorage.setItem('winff-view-mode', viewMode);
    }, [viewMode]);

    useEffect(() => {
        localStorage.setItem('winff-sort-by', sortBy);
    }, [sortBy]);

    useEffect(() => {
        localStorage.setItem('winff-sort-order', sortOrder);
    }, [sortOrder]);

    const loadFiles = async (dirPath = '') => {
        setLoading(true);
        try {
            const data = await fetchFiles(dirPath);
            setFiles(data.items || []);
            setCurrentPath(data.currentPath || '/');
            // 通知父组件当前路径
            if (onPathChange) onPathChange(data.currentPath || '/');
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

    // 排序文件（使用 useMemo 缓存结果）
    const sortedFiles = useMemo(() => {
        return [...filteredFiles].sort((a, b) => {
            // 目录始终排在文件前面
            if (a.isDirectory !== b.isDirectory) {
                return a.isDirectory ? -1 : 1;
            }

            let comparison = 0;
            switch (sortBy) {
                case 'name':
                    comparison = a.name.localeCompare(b.name, 'zh-CN');
                    break;
                case 'size':
                    comparison = (a.size || 0) - (b.size || 0);
                    break;
                case 'date':
                    comparison = (a.date || 0) - (b.date || 0);
                    break;
                case 'type':
                    comparison = (a.category || '').localeCompare(b.category || '');
                    break;
                default:
                    comparison = a.name.localeCompare(b.name, 'zh-CN');
            }

            return sortOrder === 'asc' ? comparison : -comparison;
        });
    }, [filteredFiles, sortBy, sortOrder]);

    // 分页：根据可见数量截取文件列表
    const visibleFiles = sortedFiles.slice(0, visibleCount);
    const hasMoreFiles = visibleCount < sortedFiles.length;

    // 切换目录时重置分页
    useEffect(() => {
        setVisibleCount(100);
    }, [currentPath, searchQuery, sortedFiles.length]);

    // 更新 hasMoreFiles 状态
    useEffect(() => {
        setHasMore(visibleCount < sortedFiles.length);
    }, [visibleCount, sortedFiles.length]);

    // 监听滚动加载更多
    useEffect(() => {
        const container = listContainerRef.current;
        if (!container || !hasMoreFiles) return;

        const handleScroll = () => {
            const scrollTop = container.scrollTop;
            const scrollHeight = container.scrollHeight;
            const clientHeight = container.clientHeight;

            // 距离底部 100px 时加载更多
            if (scrollHeight - scrollTop - clientHeight < 100) {
                setVisibleCount(prev => Math.min(prev + 100, filteredFiles.length));
            }
        };

        container.addEventListener('scroll', handleScroll);
        return () => container.removeEventListener('scroll', handleScroll);
    }, [hasMoreFiles, filteredFiles.length]);

    // 切换目录时清空选择
    useEffect(() => {
        setSelectedFiles(new Set());
        setSelectMode(false);
        setShowSortMenu(false);
    }, [currentPath]);

    // 切换选择模式
    const toggleSelectMode = () => {
        setSelectMode(!selectMode);
        setSelectedFiles(new Set());
    };

    // 切换文件选择状态
    const toggleFileSelect = (path) => {
        setSelectedFiles(prev => {
            const next = new Set(prev);
            if (next.has(path)) {
                next.delete(path);
            } else {
                next.add(path);
            }
            return next;
        });
    };

    // 全选/取消全选
    const toggleSelectAll = () => {
        if (selectedFiles.size === visibleFiles.length) {
            setSelectedFiles(new Set());
        } else {
            setSelectedFiles(new Set(visibleFiles.map(f => f.path)));
        }
    };

    // 批量删除
    const handleBatchDelete = () => {
        if (selectedFiles.size === 0) return;
        if (!confirm(`确定要删除选中的 ${selectedFiles.size} 个文件/目录吗？`)) return;
        // TODO: 调用删除 API
        console.log('删除:', Array.from(selectedFiles));
        // 删除后刷新
        loadFiles(currentPath === '/' ? '' : currentPath);
        setSelectMode(false);
        setSelectedFiles(new Set());
    };

    // 批量下载
    const handleBatchDownload = () => {
        if (selectedFiles.size === 0) return;
        // TODO: 调用批量下载 API（打包 ZIP）
        console.log('下载:', Array.from(selectedFiles));
        // 临时方案：逐个下载
        visibleFiles.filter(f => selectedFiles.has(f.path)).forEach(f => {
            window.open(getDownloadUrl(f.path), '_blank');
        });
    };

    useEffect(() => {
        loadFiles();
    }, []);

    // 暴露刷新方法给父组件
    useEffect(() => {
        window.__winff_refreshFiles = () => loadFiles(currentPath === '/' ? '' : currentPath);
        return () => { delete window.__winff_refreshFiles; };
    }, [currentPath, searchQuery]);

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

                    {/* 视图切换和批量操作 */}
                    {selectMode ? (
                        <div className="flex items-center gap-1">
                            <button
                                onClick={toggleSelectAll}
                                className="px-3 py-2 rounded-lg bg-[var(--color-primary)]/20 text-[var(--color-primary)] text-sm font-medium"
                            >
                                {selectedFiles.size === visibleFiles.length ? '取消全选' : '全选'}
                            </button>
                            <button
                                onClick={handleBatchDownload}
                                disabled={selectedFiles.size === 0}
                                className="p-2 rounded-lg hover:bg-[var(--color-surface-hover)] transition-colors disabled:opacity-50 cursor-pointer"
                                title="批量下载"
                            >
                                <Archive size={18} className="text-[var(--color-text)]" />
                            </button>
                            <button
                                onClick={handleBatchDelete}
                                disabled={selectedFiles.size === 0}
                                className="p-2 rounded-lg hover:bg-red-500/20 transition-colors disabled:opacity-50 cursor-pointer"
                                title="批量删除"
                            >
                                <Trash2 size={18} className="text-red-400" />
                            </button>
                            <button
                                onClick={toggleSelectMode}
                                className="p-2 rounded-lg hover:bg-[var(--color-surface-hover)] transition-colors cursor-pointer"
                            >
                                <X size={18} className="text-[var(--color-text-muted)]" />
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-1 bg-[var(--color-surface-hover)] p-1 rounded-lg shrink-0">
                            {/* 排序按钮 */}
                            <div className="relative">
                                <button
                                    onClick={() => setShowSortMenu(!showSortMenu)}
                                    className={`p-1.5 rounded-md transition-colors cursor-pointer ${showSortMenu ? 'bg-[var(--color-bg)] text-[var(--color-primary)] shadow-sm border border-[var(--color-border)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] border border-transparent'}`}
                                    title="排序"
                                >
                                    <ArrowUpDown size={16} />
                                </button>
                                {showSortMenu && (
                                    <>
                                        <div
                                            className="fixed inset-0 z-40"
                                            onClick={() => setShowSortMenu(false)}
                                        />
                                        <div className="absolute right-0 top-full mt-1 z-50 min-w-[160px] bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg shadow-xl overflow-hidden">
                                            <div className="px-3 py-2 border-b border-[var(--color-border)] text-xs font-medium text-[var(--color-text-muted)]">
                                                排序方式
                                            </div>
                                            <button
                                                onClick={() => { setSortBy('name'); setShowSortMenu(false); }}
                                                className={`w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-[var(--color-surface-hover)] transition-colors cursor-pointer ${sortBy === 'name' ? 'text-[var(--color-primary)] bg-[var(--color-primary)]/10' : 'text-[var(--color-text)]'}`}
                                            >
                                                <span className="flex items-center gap-2">
                                                    <ArrowUpAZ size={16} />
                                                    名称
                                                </span>
                                                {sortBy === 'name' && (sortOrder === 'asc' ? <ArrowUpAZ size={14} /> : <ArrowDownAZ size={14} />)}
                                            </button>
                                            <button
                                                onClick={() => { setSortBy('size'); setShowSortMenu(false); }}
                                                className={`w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-[var(--color-surface-hover)] transition-colors cursor-pointer ${sortBy === 'size' ? 'text-[var(--color-primary)] bg-[var(--color-primary)]/10' : 'text-[var(--color-text)]'}`}
                                            >
                                                <span className="flex items-center gap-2">
                                                    <ArrowUpWideNarrow size={16} />
                                                    大小
                                                </span>
                                                {sortBy === 'size' && (sortOrder === 'asc' ? <ArrowUpWideNarrow size={14} /> : <ArrowDownWideNarrow size={14} />)}
                                            </button>
                                            <button
                                                onClick={() => { setSortBy('type'); setShowSortMenu(false); }}
                                                className={`w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-[var(--color-surface-hover)] transition-colors cursor-pointer ${sortBy === 'type' ? 'text-[var(--color-primary)] bg-[var(--color-primary)]/10' : 'text-[var(--color-text)]'}`}
                                            >
                                                <span className="flex items-center gap-2">
                                                    <ArrowUpDown size={16} />
                                                    类型
                                                </span>
                                                {sortBy === 'type' && (sortOrder === 'asc' ? <ArrowUpDown size={14} /> : <ArrowUpDown size={14} />)}
                                            </button>
                                            <button
                                                onClick={() => { setSortBy('date'); setShowSortMenu(false); }}
                                                className={`w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-[var(--color-surface-hover)] transition-colors cursor-pointer ${sortBy === 'date' ? 'text-[var(--color-primary)] bg-[var(--color-primary)]/10' : 'text-[var(--color-text)]'}`}
                                            >
                                                <span className="flex items-center gap-2">
                                                    <Clock size={16} />
                                                    修改时间
                                                </span>
                                                {sortBy === 'date' && (sortOrder === 'asc' ? <ArrowUpDown size={14} /> : <ArrowUpDown size={14} />)}
                                            </button>
                                            <div className="px-3 py-2 border-t border-[var(--color-border)]">
                                                <button
                                                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                                                    className="w-full flex items-center justify-center gap-2 px-3 py-1.5 text-sm rounded-md bg-[var(--color-surface-hover)] hover:bg-[var(--color-surface-hover)]/80 transition-colors cursor-pointer text-[var(--color-text)]"
                                                >
                                                    {sortOrder === 'asc' ? <ArrowUpAZ size={14} /> : <ArrowDownAZ size={14} />}
                                                    {sortOrder === 'asc' ? '升序' : '降序'}
                                                </button>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>

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
                            <button
                                onClick={toggleSelectMode}
                                className="p-1.5 rounded-md transition-colors cursor-pointer text-[var(--color-text-muted)] hover:text-[var(--color-text)] border border-transparent"
                                title="批量操作"
                            >
                                <Square size={16} />
                            </button>
                        </div>
                    )}
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
            <div ref={listContainerRef} className="flex-1 overflow-y-auto">
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
                        {visibleFiles.map((item, index) => {
                            const IconComp = item.isDirectory
                                ? Folder
                                : (categoryIcons[item.category] || File);
                            const iconColor = item.isDirectory
                                ? 'text-yellow-400'
                                : (categoryColors[item.category] || 'text-slate-400');

                            if (viewMode === 'grid') {
                                const isSelected = selectedFiles.has(item.path);
                                return (
                                    <div
                                        key={item.path}
                                        className={`flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all cursor-pointer group relative text-center ${isSelected ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10' : 'border-transparent hover:border-[var(--color-border)] hover:bg-[var(--color-surface-hover)] hover:shadow-md'}`}
                                        onClick={() => {
                                            if (selectMode) {
                                                toggleFileSelect(item.path);
                                            } else {
                                                handleItemClick(item);
                                            }
                                        }}
                                    >
                                        {/* 选择框 */}
                                        {selectMode && (
                                            <div className="absolute top-2 right-2 z-10">
                                                {isSelected ? (
                                                    <CheckSquare size={20} className="text-[var(--color-primary)]" />
                                                ) : (
                                                    <Square size={20} className="text-[var(--color-text-muted)]" />
                                                )}
                                            </div>
                                        )}
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

                            const isSelected = selectedFiles.has(item.path);
                            return (
                                <div
                                    key={item.path}
                                    className={`flex items-center gap-3 px-4 py-3 transition-all cursor-pointer group ${isSelected ? 'bg-[var(--color-primary)]/10' : 'hover:bg-[var(--color-surface-hover)]'}`}
                                    onClick={() => {
                                        if (selectMode) {
                                            toggleFileSelect(item.path);
                                        } else {
                                            handleItemClick(item);
                                        }
                                    }}
                                >
                                    {/* 选择框 */}
                                    {selectMode && (
                                        <div className="shrink-0">
                                            {isSelected ? (
                                                <CheckSquare size={20} className="text-[var(--color-primary)]" />
                                            ) : (
                                                <Square size={20} className="text-[var(--color-text-muted)]" />
                                            )}
                                        </div>
                                    )}
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

                {/* 加载更多提示 */}
                {hasMoreFiles && (
                    <div className="py-4 text-center text-sm text-[var(--color-text-muted)]">
                        <p>已显示 {visibleFiles.length} / {filteredFiles.length} 个文件</p>
                        <p className="mt-1">滚动加载更多...</p>
                    </div>
                )}
            </div>
        </div>
    );
}
