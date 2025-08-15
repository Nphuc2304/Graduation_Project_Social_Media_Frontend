import React, {createContext, useContext, useRef, useState} from 'react';
import {io, Socket} from 'socket.io-client';
import {BASE_URL} from '../services/api';
import {useSelector} from 'react-redux';
import {RootState} from '../services/store';
import {setCallKeepSocket} from '../src/core/callkeep/callkeep';

interface SocketContextType {
  socket: Socket | null;
  connectToSocket: (roomId: string) => void;
  disconnectSocket: () => void;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  connectToSocket: () => {},
  disconnectSocket: () => {},
});

export const SocketProvider = ({children}: {children: React.ReactNode}) => {
  const socketRef = useRef<Socket | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const user = useSelector((state: RootState) => state.user.user);

  const connectToSocket = (roomId: string) => {
    if (!user?._id || !roomId) return;

    // Ngắt kết nối socket cũ nếu có
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
      console.log('✅ Socket connected!');
      newSocket.emit('joinRoom', {roomId});

      setCallKeepSocket(newSocket);
    });

    newSocket.on('connect_error', err => {
      console.log('❌ Socket error:', err.message);
    });

    socketRef.current = newSocket;
    setSocket(newSocket);
  };

  const disconnectSocket = () => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setSocket(null);
      console.log('🔌 Socket disconnected.');

      setCallKeepSocket(null);
    }
  };

  return (
    <SocketContext.Provider value={{socket, connectToSocket, disconnectSocket}}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
