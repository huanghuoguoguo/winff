import { X, Download } from 'lucide-react';

export default function VideoPlayer({ src, name, onClose }) {
    return (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col animate-fade-in">
            {/* 顶部标题栏 */}
            <div className="flex items-center justify-between px-4 py-3 bg-black/50 backdrop-blur-sm shrink-0">
                <h3 className="text-sm font-medium truncate max-w-[70%]">{name}</h3>
                <div className="flex items-center gap-2">
                    <a
                        href={src}
                        download={name}
                        className="p-2 rounded-lg hover:bg-white/10 transition"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <Download size={18} />
                    </a>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 transition cursor-pointer">
                        <X size={18} />
                    </button>
                </div>
            </div>

            {/* 视频播放区域 */}
            <div className="flex-1 flex items-center justify-center p-4 min-h-0">
                <video
                    src={src}
                    controls
                    autoPlay
                    playsInline
                    className="max-w-full max-h-full rounded-lg shadow-2xl"
                    style={{ outline: 'none' }}
                >
                    你的浏览器不支持播放此视频
                </video>
            </div>
        </div>
    );
}
