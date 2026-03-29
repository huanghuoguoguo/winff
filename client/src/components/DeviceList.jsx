import { useState, useEffect } from 'react';
import { Monitor, Smartphone, Tablet, Wifi, Edit3, Check } from 'lucide-react';
import socket from '../socket';

function getDeviceIcon(name) {
    const lower = name.toLowerCase();
    if (lower.includes('iphone') || lower.includes('android') || lower.includes('手机')) return Smartphone;
    if (lower.includes('ipad') || lower.includes('平板') || lower.includes('tablet')) return Tablet;
    return Monitor;
}

export default function DeviceList() {
    const [devices, setDevices] = useState([]);
    const [editingName, setEditingName] = useState(false);
    const [newName, setNewName] = useState('');
    const [myId, setMyId] = useState('');

    useEffect(() => {
        socket.on('device-list', (list) => {
            setDevices(list);
        });

        socket.on('connect', () => {
            setMyId(socket.id);
        });

        if (socket.connected) {
            setMyId(socket.id);
        }

        return () => {
            socket.off('device-list');
            socket.off('connect');
        };
    }, []);

    const handleRename = () => {
        if (newName.trim()) {
            socket.emit('set-device-name', newName.trim());
            setEditingName(false);
        }
    };

    const myDevice = devices.find((d) => d.id === myId);

    return (
        <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
                <div className="relative">
                    <Wifi size={16} className="text-emerald-400" />
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-400 rounded-full" style={{ animation: 'pulse-dot 2s infinite' }} />
                </div>
                <h3 className="text-sm font-semibold text-[var(--color-text)]">
                    在线设备 <span className="text-[var(--color-primary-light)]">({devices.length})</span>
                </h3>
            </div>

            <div className="space-y-2">
                {devices.map((device) => {
                    const IconComp = getDeviceIcon(device.name);
                    const isMe = device.id === myId;

                    return (
                        <div
                            key={device.id}
                            className={`
                flex items-center gap-3 p-3 rounded-xl transition-all
                ${isMe
                                    ? 'bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30'
                                    : 'bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)]'
                                }
              `}
                        >
                            <div className={`p-2 rounded-lg ${isMe ? 'bg-[var(--color-primary)]/20 text-[var(--color-primary-light)]' : 'bg-[var(--color-border)] text-[var(--color-text-muted)]'}`}>
                                <IconComp size={18} />
                            </div>

                            <div className="flex-1 min-w-0">
                                {isMe && editingName ? (
                                    <div className="flex items-center gap-1">
                                        <input
                                            type="text"
                                            value={newName}
                                            onChange={(e) => setNewName(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleRename()}
                                            className="bg-transparent border-b border-[var(--color-primary)] outline-none text-sm w-full py-0.5"
                                            autoFocus
                                            placeholder="输入新名称..."
                                        />
                                        <button onClick={handleRename} className="text-emerald-400 cursor-pointer p-1">
                                            <Check size={14} />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-1.5">
                                        <p className="text-sm font-medium truncate">{device.name}</p>
                                        {isMe && (
                                            <>
                                                <span className="text-xs px-1.5 py-0.5 rounded-full bg-[var(--color-primary)]/20 text-[var(--color-primary-light)]">我</span>
                                                <button
                                                    onClick={() => { setEditingName(true); setNewName(device.name); }}
                                                    className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] cursor-pointer p-0.5"
                                                    title="修改名称"
                                                >
                                                    <Edit3 size={12} />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                )}
                                <p className="text-xs text-[var(--color-text-muted)] mt-0.5 truncate">
                                    {device.ip}
                                </p>
                            </div>

                            <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" style={{ animation: 'pulse-dot 2s infinite' }} />
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
