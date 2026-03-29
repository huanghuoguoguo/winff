import { X, ZoomIn, ZoomOut, RotateCw, Download } from 'lucide-react';
import { useState, useRef } from 'react';

export default function ImagePreview({ src, name, onClose }) {
    const [scale, setScale] = useState(1);
    const [rotation, setRotation] = useState(0);
    const imgRef = useRef(null);

    const zoomIn = () => setScale((s) => Math.min(s + 0.3, 5));
    const zoomOut = () => setScale((s) => Math.max(s - 0.3, 0.3));
    const rotate = () => setRotation((r) => r + 90);

    return (
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col animate-fade-in" onClick={onClose}>
            {/* 顶部工具栏 */}
            <div
                className="flex items-center justify-between px-4 py-3 bg-black/50 backdrop-blur-sm"
                onClick={(e) => e.stopPropagation()}
            >
                <h3 className="text-sm font-medium truncate max-w-[60%]">{name}</h3>
                <div className="flex items-center gap-2">
                    <button onClick={zoomOut} className="p-2 rounded-lg hover:bg-white/10 transition cursor-pointer">
                        <ZoomOut size={18} />
                    </button>
                    <span className="text-xs text-[var(--color-text-muted)] w-12 text-center">{Math.round(scale * 100)}%</span>
                    <button onClick={zoomIn} className="p-2 rounded-lg hover:bg-white/10 transition cursor-pointer">
                        <ZoomIn size={18} />
                    </button>
                    <button onClick={rotate} className="p-2 rounded-lg hover:bg-white/10 transition cursor-pointer">
                        <RotateCw size={18} />
                    </button>
                    <a href={src} download={name} className="p-2 rounded-lg hover:bg-white/10 transition" onClick={(e) => e.stopPropagation()}>
                        <Download size={18} />
                    </a>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 transition cursor-pointer">
                        <X size={18} />
                    </button>
                </div>
            </div>

            {/* 图片区域 */}
            <div className="flex-1 flex items-center justify-center overflow-hidden p-4">
                <img
                    ref={imgRef}
                    src={src}
                    alt={name}
                    className="max-w-full max-h-full object-contain transition-transform duration-200 select-none"
                    style={{
                        transform: `scale(${scale}) rotate(${rotation}deg)`,
                    }}
                    draggable={false}
                    onWheel={(e) => {
                        e.preventDefault();
                        if (e.deltaY < 0) zoomIn();
                        else zoomOut();
                    }}
                />
            </div>
        </div>
    );
}
