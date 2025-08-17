import React, {createContext, useContext, useRef, useState} from 'react';
import {io, Socket} from 'socket.io-client';
import {BASE_URL} from '../services/api';
import {useSelector} from 'react-redux';
import {RootState} from '../services/store';
import {
  setCallKeepSocket,
  setCallKeepUserId,
  wireCallSocketHandlers,
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

export const SocketProvider = ({children}: {children: React.ReactNode}) => {
  const socketRef = useRef<Socket | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const user = useSelector((state: RootState) => state.user.user);

  const connectToSocket = () => {
    if (!user?._id) return;

    // Nếu đã có socket và còn sống thì không connect lại
    if (socketRef.current?.connected) return;

    const newSocket = io(BASE_URL, {
      transports: ['websocket'],
      query: {userId: user._id},
    });

    newSocket.on('connect', () => {
      console.log('✅ Socket connected!');
      setCallKeepSocket(newSocket);
      wireCallSocketHandlers();
      setCallKeepUserId(user._id);
    });

    newSocket.on('disconnect', () => {
      console.log('❌ Socket disconnected!');
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
      console.log('🔌 Socket manually disconnected.');
      setCallKeepSocket(null);
    }
  };

  const joinRoom = (roomId: string) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('joinRoom', {roomId, userId: user?._id});
      console.log('➡️ joinRoom:', roomId);
    }
  };

  const leaveRoom = (roomId: string) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('leaveRoom', roomId);
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
