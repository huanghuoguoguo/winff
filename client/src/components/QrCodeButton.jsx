import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { QrCode, Smartphone } from 'lucide-react';
import { fetchServerInfo } from '../api';

export default function QrCodeButton() {
    const [localUrl, setLocalUrl] = useState('');

    useEffect(() => {
        fetchServerInfo()
            .then((info) => {
                if (info.lanIp && info.port) {
                    setLocalUrl(`http://${info.lanIp}:${info.port}`);
                }
            })
            .catch((err) => console.error('Failed to fetch server info for QR code', err));
    }, []);

    if (!localUrl) return null;

    return (
        <div className="relative flex items-center group">
            <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[var(--color-surface-hover)] border border-[var(--color-border)] hover:bg-[var(--color-border)] text-sm font-medium transition-all cursor-pointer">
                <QrCode size={16} className="text-[var(--color-primary-light)]" />
                <span className="hidden sm:inline">手机扫码</span>
            </button>

            {/* Popover */}
            {/* 隐藏并使用 invisible 避免在 DOM 中影响，但仍然能触发 group-hover */}
            <div className="absolute top-full left-0 pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                <div className="p-4 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-xl flex flex-col items-center gap-3 w-max">
                    <div className="bg-white p-2 rounded-xl shadow-inner">
                        <QRCodeSVG value={localUrl} size={150} level="M" bgColor="#ffffff" fgColor="#000000" />
                    </div>
                    <div className="flex items-center justify-center gap-1.5 text-xs text-[var(--color-text-muted)] font-medium bg-[var(--color-bg)] w-full py-1.5 rounded-lg">
                        <Smartphone size={14} />
                        <span>扫码连接此设备</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
