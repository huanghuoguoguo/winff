import { useState, useEffect, useCallback, useRef } from 'react';
import { Upload, HardDrive, Menu, X } from 'lucide-react';
import socket from './socket';
import FileList from './components/FileList';
import DeviceList from './components/DeviceList';
import ImagePreview from './components/ImagePreview';
import VideoPlayer from './components/VideoPlayer';
import UploadModal from './components/UploadModal';
import ThemeToggle from './components/ThemeToggle';
import QrCodeButton from './components/QrCodeButton';

export default function App() {
  const [showUpload, setShowUpload] = useState(false);
  const [dragFiles, setDragFiles] = useState(null);
  const [previewImage, setPreviewImage] = useState(null); // { src, name }
  const [playVideo, setPlayVideo] = useState(null);       // { src, name }
  const [showSidebar, setShowSidebar] = useState(false);
  const [connected, setConnected] = useState(socket.connected);
  const [dragOver, setDragOver] = useState(false);
  const dropZoneRef = useRef(null);

  useEffect(() => {
    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    // 监听文件更新事件，自动刷新
    socket.on('file-updated', () => {
      if (window.__winff_refreshFiles) {
        window.__winff_refreshFiles();
      }
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('file-updated');
    };
  }, []);

  // 监听全局拖拽文件事件
  useEffect(() => {
    const handleDropFiles = (e) => {
      if (e.detail && e.detail.files) {
        setDragFiles(e.detail.files);
        setShowUpload(true);
      }
    };

    const handleDragOver = (e) => {
      e.preventDefault();
      setDragOver(true);
    };

    const handleDragLeave = (e) => {
      if (e.relatedTarget === null) {
        setDragOver(false);
      }
    };

    const handleDrop = (e) => {
      e.preventDefault();
      setDragOver(false);
      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        const dropEvent = new CustomEvent('winff-drop-files', {
          detail: { files: Array.from(files) }
        });
        window.dispatchEvent(dropEvent);
      }
    };

    document.addEventListener('dragover', handleDragOver);
    document.addEventListener('dragleave', handleDragLeave);
    document.addEventListener('drop', handleDrop);
    window.addEventListener('winff-drop-files', handleDropFiles);

    return () => {
      document.removeEventListener('dragover', handleDragOver);
      document.removeEventListener('dragleave', handleDragLeave);
      document.removeEventListener('drop', handleDrop);
      window.removeEventListener('winff-drop-files', handleDropFiles);
    };
  }, []);

  return (
    <div className="h-dvh flex flex-col bg-[var(--color-bg)]">
      {/* ===== 顶栏 ===== */}
      <header className="relative z-40 shrink-0 flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-surface)]/80 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className="sm:hidden p-2 rounded-lg hover:bg-[var(--color-surface-hover)] transition cursor-pointer"
          >
            {showSidebar ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--color-primary)] to-purple-500 flex items-center justify-center shadow-lg shadow-[var(--color-primary)]/20">
              <HardDrive size={16} className="text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold leading-tight">WinFF</h1>
              <p className="text-[10px] text-[var(--color-text-muted)] leading-none">局域网文件共享</p>
            </div>
          </div>
          <div className="hidden sm:block border-l border-[var(--color-border)] h-8 mx-1"></div>
          <QrCodeButton />
        </div>

        <div className="flex items-center gap-2">
          {/* 连接状态 */}
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs ${connected
            ? 'bg-[var(--color-success-bg)] text-[var(--color-success-text)]'
            : 'bg-[var(--color-danger-bg)] text-[var(--color-danger-text)]'
            }`}>
            <div className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-[var(--color-success-text)]' : 'bg-[var(--color-danger-text)]'}`}
              style={connected ? { animation: 'pulse-dot 2s infinite' } : {}} />
            {connected ? '已连接' : '断开'}
          </div>

          {/* 主题切换 */}
          <ThemeToggle />

          {/* 上传按钮 */}
          <button
            onClick={() => setShowUpload(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white text-sm font-medium transition-all shadow-lg shadow-[var(--color-primary)]/25 cursor-pointer"
          >
            <Upload size={16} />
            <span className="hidden sm:inline">上传</span>
          </button>
        </div>
      </header>

      {/* ===== 主体 ===== */}
      <div className="flex-1 flex min-h-0 relative">
        {/* 侧边栏 - 设备列表 */}
        <aside className={`
          absolute sm:relative z-30 h-full w-64 border-r border-[var(--color-border)]
          bg-[var(--color-surface)] shrink-0 transition-transform duration-300
          ${showSidebar ? 'translate-x-0' : '-translate-x-full sm:translate-x-0'}
        `}>
          <DeviceList />
        </aside>

        {/* 侧边栏遮罩（移动端） */}
        {showSidebar && (
          <div
            className="sm:hidden fixed inset-0 z-20 bg-black/40"
            onClick={() => setShowSidebar(false)}
          />
        )}

        {/* 文件浏览区 */}
        <main className="flex-1 min-w-0">
          <FileList
            onPreviewImage={(src, name) => setPreviewImage({ src, name })}
            onPlayVideo={(src, name) => setPlayVideo({ src, name })}
          />
        </main>
      </div>

      {/* ===== 模态层 ===== */}
      {showUpload && <UploadModal onClose={() => { setShowUpload(false); setDragFiles(null); }} initialFiles={dragFiles} />}
      {previewImage && (
        <ImagePreview
          src={previewImage.src}
          name={previewImage.name}
          onClose={() => setPreviewImage(null)}
        />
      )}
      {playVideo && (
        <VideoPlayer
          src={playVideo.src}
          name={playVideo.name}
          onClose={() => setPlayVideo(null)}
        />
      )}

      {/* 全局拖拽遮罩 */}
      {dragOver && (
        <div
          ref={dropZoneRef}
          className="fixed inset-0 z-[100] bg-[var(--color-primary)]/20 backdrop-blur-sm border-4 border-dashed border-[var(--color-primary)] m-4 rounded-2xl flex items-center justify-center pointer-events-none"
        >
          <div className="bg-[var(--color-surface)] rounded-2xl px-8 py-6 shadow-2xl flex flex-col items-center gap-3 animate-bounce-in">
            <Upload size={64} className="text-[var(--color-primary)]" />
            <p className="text-xl font-semibold text-[var(--color-primary)]">松开以上传文件</p>
          </div>
        </div>
      )}
    </div>
  );
}
