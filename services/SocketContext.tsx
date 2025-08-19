import React, {
  createContext,
  useContext,
  useRef,
  useState,
  useCallback,
} from 'react';
import {io, Socket} from 'socket.io-client';
import {BASE_URL} from '../services/api';
import {useSelector} from 'react-redux';
import {RootState} from '../services/store';
import {
  setCallKeepSocket,
  setCallKeepUserId,
  setupCallKeep,
  showIncomingCall,
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
  // eslint-disable-next-line no-var
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

  // Handler duy nhất: nhận cuộc gọi khi app foreground
  const onIncomingCall = useCallback(
    (payload: {
      callerId: string;
      callerName: string;
      type: 'video' | 'voice';
      roomId: string;
      callUuid?: string;
      image?: string;
    }) => {
      if (!user?._id) return;
      // đảm bảo CallKeep biết self hiện tại
      setCallKeepUserId(user._id);
      // Hiện UI cuộc gọi hệ thống
      showIncomingCall({
        uuid: payload.callUuid,
        callerName: payload.callerName,
        handle: payload.callerId,
        hasVideo: payload.type === 'video',
        roomId: payload.roomId,
        callerId: payload.callerId,
        image: payload.image,
      });
    },
    [user?._id],
  );

  const connectToSocket = () => {
    if (!user?._id) return;

    const existing = getGlobalSocket();
    if (existing?.connected) {
      socketRef.current = existing;
      setSocket(existing);

      // Cắm CallKeep
      setCallKeepUserId(user._id);
      setCallKeepSocket(existing);
      setupCallKeep();

      // Đảm bảo chỉ 1 listener
      existing.off('incomingCall', onIncomingCall);
      existing.on('incomingCall', onIncomingCall);
      return;
    }
    if (isConnecting()) return;

    setConnecting(true);
    const s = io(BASE_URL, {
      transports: ['websocket'],
      auth: {userId: user._id},
      query: {userId: user._id},
      // path: '/socket.io',
    });

    s.on('connect', () => {
      console.log('✅ Socket connected!', s.id);

      // Cắm CallKeep
      setCallKeepUserId(user._id);
      setCallKeepSocket(s);
      setupCallKeep();

      setConnecting(false);
    });

    // Lắng nghe incomingCall (foreground)
    s.on('incomingCall', onIncomingCall);

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

    // Tháo CallKeep socket binding
    setCallKeepSocket(null);

    // Tháo listener foreground
    s.off('incomingCall', onIncomingCall);

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
