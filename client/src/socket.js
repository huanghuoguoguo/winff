import { io } from 'socket.io-client';

// 开发环境连接本地3000端口，生产环境连接当前地址
const URL = import.meta.env.DEV ? 'http://localhost:3000' : undefined;

const socket = io(URL, {
    autoConnect: true,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: Infinity,
});

export default socket;
