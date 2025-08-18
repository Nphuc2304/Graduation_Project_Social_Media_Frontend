import React, {createContext, useContext, useRef, useState} from 'react';
import {io, Socket} from 'socket.io-client';
import {BASE_URL} from '../services/api';
import {useSelector} from 'react-redux';
import {RootState} from '../services/store';
import {
  setCallKeepSocket,
  setCallKeepUserId,
} from '../src/core/callkeep/callkeep';

interface SocketContextType {
  socket: Socket | null;
  connectToSocket: () => void;
  disconnectSocket: () => void;
  joinRoom: (roomId: string) => void;
  leaveRoom: (roomId: string) => void;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  connectToSocket: () => {},
  disconnectSocket: () => {},
  joinRoom: () => {},
  leaveRoom: () => {},
});

// ===== Singleton để tránh nhiều kết nối khi Fast Refresh =====
declare global {
  // eslint-disable-next-line no-var
  var __GLOBAL_SOCKET__: Socket | null | undefined;
}
const getGlobalSocket = (): Socket | null =>
  ((globalThis as any).__GLOBAL_SOCKET__ ?? null) as Socket | null;
const setGlobalSocket = (s: Socket | null) => {
  (globalThis as any).__GLOBAL_SOCKET__ = s;
};

export const SocketProvider = ({children}: {children: React.ReactNode}) => {
  const socketRef = useRef<Socket | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const user = useSelector((state: RootState) => state.user.user);

  const connectToSocket = () => {
    if (!user?._id) return;

    // Dùng lại socket global nếu còn sống
    const existing = getGlobalSocket();
    if (existing?.connected) {
      socketRef.current = existing;
      setSocket(existing);
      // đảm bảo CallKeep dùng đúng instance
      setCallKeepSocket(existing);
      setCallKeepUserId(user._id);
      return;
    }

    // Tạo socket mới
    const newSocket = io(BASE_URL, {
      transports: ['websocket'],
      auth: {userId: user._id}, // BE lấy được ở handshake.auth
      query: {userId: user._id}, // ...và cả handshake.query (phòng trường hợp)
      // path: '/socket.io',            // nếu BE dùng path custom thì bật dòng này
      // reconnection: true,            // mặc định true
    });

    // Gắn vào CallKeep NGAY (trước 'connect') để wire listener sớm
    setCallKeepSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('✅ Socket connected!', newSocket.id);
      setCallKeepUserId(user._id);
      // Nếu đang có call dở, CallKeep module sẽ tự join lại (nên implement ở đó nếu cần)
    });

    newSocket.on('disconnect', reason => {
      console.log('❌ Socket disconnected!', reason);
    });

    newSocket.on('connect_error', err => {
      console.log('❌ Socket error:', err.message);
    });

    // (Tuỳ chọn) debug bắt mọi event về client
    // newSocket.onAny((ev, ...args) => console.log('[SOCKET <-]', ev, args?.[0]));

    socketRef.current = newSocket;
    setSocket(newSocket);
    setGlobalSocket(newSocket);
  };

  const disconnectSocket = () => {
    const s = socketRef.current ?? getGlobalSocket();
    if (s) {
      s.removeAllListeners(); // dọn listener để tránh rò rỉ
      s.disconnect();
      if (socketRef.current === s) socketRef.current = null;
      if (getGlobalSocket() === s) setGlobalSocket(null);
      setSocket(null);
      setCallKeepSocket(null);
      console.log('🔌 Socket manually disconnected.');
    }
  };

  const joinRoom = (roomId: string) => {
    const s = socketRef.current ?? getGlobalSocket();
    if (s?.connected && roomId) {
      s.emit('joinRoom', {roomId, userId: user?._id});
      console.log('➡️ joinRoom:', roomId);
    }
  };

  const leaveRoom = (roomId: string) => {
    const s = socketRef.current ?? getGlobalSocket();
    if (s?.connected && roomId) {
      s.emit('leaveRoom', roomId);
      console.log('⬅️ leaveRoom:', roomId);
    }
  };

  return (
    <SocketContext.Provider
      value={{socket, connectToSocket, disconnectSocket, joinRoom, leaveRoom}}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
