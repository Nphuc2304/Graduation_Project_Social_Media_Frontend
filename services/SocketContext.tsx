import React, {
  createContext,
  useContext,
  useRef,
  useState,
  useEffect,
} from 'react';
import {io, Socket} from 'socket.io-client';
import {BASE_URL} from '../services/api';
import {useSelector} from 'react-redux';
import {RootState} from '../services/store';
import {navigationRef} from '../src/NavigationService';

interface SocketContextType {
  socket: Socket | null;
  connectToSocket: (roomId: string) => void;
  disconnectSocket: () => void;
  globalSocket: Socket | null;
  connectGlobalSocket: () => void;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  connectToSocket: () => {},
  disconnectSocket: () => {},
  globalSocket: null,
  connectGlobalSocket: () => {},
});

/** ===============================
 *  GLOBAL SOCKET (ổn định qua globalThis)
 *  =============================== */
declare global {
  // Giúp TypeScript biết biến global này
  // (có thể dùng ở file khác bằng getGlobalSocket/setGlobalSocket)
  // VD: import { getGlobalSocket } from '@services/SocketContext';
  //     getGlobalSocket()?.emit(...)
  var __GLOBAL_SOCKET__: Socket | null | undefined;
}
export const getGlobalSocket = (): Socket | null =>
  ((globalThis as any).__GLOBAL_SOCKET__ ?? null) as Socket | null;

export const setGlobalSocket = (s: Socket | null) => {
  (globalThis as any).__GLOBAL_SOCKET__ = s;
};

export const SocketProvider = ({children}: {children: React.ReactNode}) => {
  const socketRef = useRef<Socket | null>(null);
  const globalSocketRef = useRef<Socket | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [globalSocket, setGlobalSocketState] = useState<Socket | null>(null);
  const user = useSelector((state: RootState) => state.user.user);

  useEffect(() => {
    if (!globalSocket) return;

    const onIncomingCall = ({
      callUUID,
      userID,
      userName,
      image,
      callID,
    }: any) => {
      navigationRef.current?.navigate('ZegoCallScreen', {
        callUUID,
        isIncoming: true,
        userID,
        userName,
        callID,
        image,
        isCaller: false,
      });
    };

    const onCallAnswered = ({roomId, calleeId, callerId}: any) => {
      // Nếu user hiện tại là caller thì điều hướng vào call screen
      if (callerId === user?._id) {
        navigationRef.current?.navigate('ZegoCallScreen', {
          roomId,
          isIncoming: false,
          userID: calleeId,
          isCaller: true,
        });
      }
    };

    globalSocket.on('incomingCall', onIncomingCall);
    globalSocket.on('callAnswered', onCallAnswered);

    return () => {
      globalSocket.off('incomingCall', onIncomingCall);
      globalSocket.off('callAnswered', onCallAnswered);
    };
  }, [globalSocket, user?._id]);

  // Global socket connection for app-wide events
  const connectGlobalSocket = () => {
    if (!user?._id) return;

    if (globalSocketRef.current) {
      globalSocketRef.current.disconnect();
    }

    const newGlobalSocket = io(BASE_URL, {
      transports: ['websocket'],
      query: {
        userId: user._id,
        type: 'global',
      },
    });

    newGlobalSocket.on('connect', () => {
      console.log('🌐 Global socket connected');
      newGlobalSocket.emit('joinRoom', {
        roomId: `user-${user._id}`,
        userId: user._id,
      });
    });

    newGlobalSocket.on('connect_error', err => {
      console.warn('❌ Global socket error:', err.message);
    });

    globalSocketRef.current = newGlobalSocket;
    setGlobalSocketState(newGlobalSocket);

    // 🔹 Set vào globalThis để nơi khác (CallKeep, utils…) có thể dùng
    setGlobalSocket(newGlobalSocket);
  };

  // Auto-connect global socket when user is available
  useEffect(() => {
    if (user?._id && !globalSocketRef.current) {
      connectGlobalSocket();
    }

    return () => {
      if (globalSocketRef.current) {
        globalSocketRef.current.disconnect();
        globalSocketRef.current = null;
        setGlobalSocketState(null);
        // Clear global
        setGlobalSocket(null);
      }
    };
  }, [user?._id]);

  const connectToSocket = (roomId: string) => {
    if (!user?._id || !roomId) return;

    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    const newSocket = io(BASE_URL, {
      transports: ['websocket'],
      query: {
        userId: user._id,
        roomId,
      },
    });

    newSocket.on('connect', () => {
      newSocket.emit('joinRoom', {roomId, userId: user._id});
    });

    newSocket.on('connect_error', err => {
      console.warn('❌ Socket error:', err.message);
    });

    socketRef.current = newSocket;
    setSocket(newSocket);
  };

  const disconnectSocket = () => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setSocket(null);
    }
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        connectToSocket,
        disconnectSocket,
        globalSocket,
        connectGlobalSocket,
      }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
