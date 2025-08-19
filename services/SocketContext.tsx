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

declare global {
  var __GLOBAL_SOCKET__: Socket | null | undefined;
  var __SOCKET_CONNECTING__: boolean | undefined;
}
const getGlobalSocket = (): Socket | null =>
  ((globalThis as any).__GLOBAL_SOCKET__ ?? null) as Socket | null;
const setGlobalSocket = (s: Socket | null) => {
  (globalThis as any).__GLOBAL_SOCKET__ = s;
};
const isConnecting = () => Boolean((globalThis as any).__SOCKET_CONNECTING__);
const setConnecting = (v: boolean) => {
  (globalThis as any).__SOCKET_CONNECTING__ = v;
};

export const SocketProvider = ({children}: {children: React.ReactNode}) => {
  const socketRef = useRef<Socket | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const user = useSelector((state: RootState) => state.user.user);

  const connectToSocket = () => {
    if (!user?._id) return;

    const existing = getGlobalSocket();
    if (existing?.connected) {
      socketRef.current = existing;
      setSocket(existing);
      setCallKeepUserId(user._id);
      setCallKeepSocket(existing);
      return;
    }
    if (isConnecting()) {
      // đã có nơi khác gọi connect rồi -> không tạo thêm
      return;
    }

    setConnecting(true);
    const s = io(BASE_URL, {
      transports: ['websocket'],
      auth: {userId: user._id}, // BE đọc handshake.auth.userId
      query: {userId: user._id}, // và cả handshake.query.userId
      // path: '/socket.io',              // nếu BE dùng path custom thì bật
    });

    s.on('connect', () => {
      console.log('✅ Socket connected!', s.id);
      setCallKeepUserId(user._id);
      setCallKeepSocket(s);
      setConnecting(false);
    });

    s.on('disconnect', reason => {
      console.log('❌ Socket disconnected!', reason);
    });

    s.on('connect_error', err => {
      console.log('❌ Socket error:', err?.message);
      setConnecting(false);
    });

    socketRef.current = s;
    setSocket(s);
    setGlobalSocket(s);
  };

  const disconnectSocket = () => {
    const s = socketRef.current ?? getGlobalSocket();
    if (!s) return;

    setCallKeepSocket(null);
    s.removeAllListeners();
    s.disconnect();

    if (socketRef.current === s) socketRef.current = null;
    if (getGlobalSocket() === s) setGlobalSocket(null);
    setSocket(null);
    setConnecting(false);
    console.log('🔌 Socket manually disconnected.');
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
