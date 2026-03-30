import { Server, Socket } from 'socket.io';
import { parseDeviceName } from './utils';

export interface DeviceInfo {
  id: string;
  name: string;
  customName: string | null;
  ip: string;
  connectedAt: string;
  userAgent?: string;
}

export interface OnlineDevicesMap {
  [socketId: string]: DeviceInfo;
}

// 在线设备列表 Map<socketId, deviceInfo>
const onlineDevices = new Map<string, DeviceInfo>();

/**
 * 初始化 Socket.IO 事件处理
 * @param io - Socket.IO 实例
 */
export function initSocket(io: Server): void {
  io.on('connection', (socket: Socket) => {
    const userAgent = socket.handshake.headers['user-agent'] || '';
    const autoName = parseDeviceName(userAgent);

    // 注册设备信息
    const deviceInfo: DeviceInfo = {
      id: socket.id,
      name: autoName,
      customName: null,
      ip: socket.handshake.address,
      connectedAt: new Date().toISOString(),
      userAgent: userAgent,
    };

    onlineDevices.set(socket.id, deviceInfo);
    console.log(`[+] 设备上线：${deviceInfo.name} (${socket.id})`);

    // 广播最新在线列表
    broadcastDeviceList(io);

    // 客户端设置自定义名称
    socket.on('set-device-name', (name: string) => {
      const device = onlineDevices.get(socket.id);
      if (device && name && name.trim()) {
        device.customName = name.trim();
        console.log(`[~] 设备更名：${device.name} -> ${device.customName}`);
        broadcastDeviceList(io);
      }
    });

    // 监听文件变更通知（上传完成后服务端调用）
    socket.on('disconnect', () => {
      const device = onlineDevices.get(socket.id);
      if (device) {
        console.log(`[-] 设备下线：${device.customName || device.name} (${socket.id})`);
      }
      onlineDevices.delete(socket.id);
      broadcastDeviceList(io);
    });
  });
}

/**
 * 广播当前在线设备列表给所有连接
 */
export function broadcastDeviceList(io: Server): void {
  const list = Array.from(onlineDevices.values()).map((d) => ({
    id: d.id,
    name: d.customName || d.name,
    ip: d.ip,
    connectedAt: d.connectedAt,
  }));
  io.emit('device-list', list);
}

/**
 * 通知所有设备有新文件上传
 */
export function notifyFileUpdate(io: Server, fileInfo: FileUpdateInfo): void {
  io.emit('file-updated', fileInfo);
}

export interface FileUpdateInfo {
  action: string;
  files: string[];
  uploadedBy: string;
  timestamp: string;
}

export { onlineDevices };
