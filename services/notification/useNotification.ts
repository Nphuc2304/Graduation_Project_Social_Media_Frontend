import {useEffect, useState, useCallback, useMemo} from 'react';
import {
  checkInitialNotification,
  onMessageListener,
  onNotificationOpenedApp,
} from './notification';
import {AppDispatch, RootState} from '@services/store';
import {setIsReadNoti} from '@services/notificationRedux/notificationReducer';
import {useDispatch, useSelector} from 'react-redux';
import {useSocket} from '@services/SocketContext';

type IncomingCallState = {
  visible: boolean;
  roomId: string;
  callUuid?: string;
  callType: 'video' | 'voice';
  callerId: string;
  callerName: string;
  callerAvatar?: string;
} | null;

export const useNotificationHandler = (onNavigate: (data: any) => void) => {
  const [modalData, setModalData] = useState<any | null>(null);
  const [incomingCall, setIncomingCall] = useState<IncomingCallState>(null);

  const dispatch = useDispatch<AppDispatch>();
  const {connectToSocket, joinRoom, socket} = useSocket();
  const user = useSelector((s: RootState) => s.user.user);

  const myUserId = user?._id;

  const parseIncomingCall = useCallback((data: any): IncomingCallState => {
    // Phía BE gửi:
    // {
    //   type: 'incoming_call',
    //   callId: roomId,
    //   callUuid,
    //   userId: callerId,
    //   userName: callerName,
    //   callType: 'video' | 'voice',
    //   roomId
    // }
    if (!data) return null;
    const type = String(data?.type || '');
    if (type !== 'incoming_call') return null;

    const roomId = String(data.roomId || data.callId || '');
    const callUuid = String(data.callUuid || '');
    const callerId = String(data.userId || '');
    const callerName = String(data.userName || 'Người gọi');
    const callType = String(data.callType || 'video') as 'video' | 'voice';

    if (!roomId || !callerId) return null;

    return {
      visible: true,
      roomId,
      callUuid,
      callerId,
      callerName,
      callType,
      callerAvatar: data.callerAvatar, // có thể không có trong FCM
    };
  }, []);

  const handleMessage = useCallback(
    async (remoteMessage: any) => {
      const t = remoteMessage?.data?.type;

      // 1) Xử lý incoming_call (foreground)
      const inc = parseIncomingCall(remoteMessage?.data);
      if (inc) {
        // đảm bảo socket sẵn sàng
        connectToSocket?.();
        setIncomingCall(inc);
        return;
      }

      // 2) Mặc định: hiển thị notification in-app của bạn
      setModalData({
        title: remoteMessage?.notification?.title,
        body: remoteMessage?.notification?.body,
        data: remoteMessage?.data,
      });
      dispatch(setIsReadNoti(true));
    },
    [dispatch, parseIncomingCall, connectToSocket],
  );

  const handleNavigate = useCallback(
    async (remoteMessage: any) => {
      // App mở từ background / quit do bấm vào notification
      const inc = parseIncomingCall(remoteMessage?.data);
      if (inc) {
        connectToSocket?.();
        setIncomingCall(inc); // vẫn show popup để user quyết định
        return;
      }

      if (remoteMessage?.data) {
        onNavigate(remoteMessage.data);
        dispatch(setIsReadNoti(false));
      }
    },
    [dispatch, onNavigate, parseIncomingCall, connectToSocket],
  );

  // ===== Accept / Decline handlers =====
  const acceptIncomingCall = useCallback(() => {
    if (!incomingCall || !myUserId) return;

    // Join room để nhận emit theo room
    joinRoom?.(incomingCall.roomId);

    // emit acceptCall cho caller & những ai trong room
    socket?.emit('acceptCall', {
      roomId: incomingCall.roomId,
      userId: myUserId,
      callType: incomingCall.callType,
    });

    // đóng popup
    setIncomingCall(null);

    // Điều hướng sang màn call (Zego)
    onNavigate({
      type: 'call_accepted',
      roomId: incomingCall.roomId,
      callUuid: incomingCall.callUuid,
      callType: incomingCall.callType,
      peerId: incomingCall.callerId,
      peerName: incomingCall.callerName,
    });
  }, [incomingCall, myUserId, joinRoom, socket, onNavigate]);

  const declineIncomingCall = useCallback(() => {
    if (!incomingCall || !myUserId) {
      setIncomingCall(null);
      return;
    }
    // Thông báo kết thúc / bỏ lỡ
    socket?.emit('callEnded', {
      roomId: incomingCall.roomId,
      senderId: myUserId,
      missed: true,
      duration: 0,
    });
    setIncomingCall(null);
  }, [incomingCall, myUserId, socket]);

  useEffect(() => {
    const unsubscribeOnMessage = onMessageListener(handleMessage);
    const unsubscribeOpenedApp = onNotificationOpenedApp(handleNavigate);
    checkInitialNotification(handleNavigate);

    return () => {
      unsubscribeOnMessage();
      unsubscribeOpenedApp();
    };
  }, [handleMessage, handleNavigate]);

  return {
    // notification in-app mặc định
    modalData,
    clearModal: () => setModalData(null),

    // incoming call popup
    incomingCall,
    acceptIncomingCall,
    declineIncomingCall,
  };
};
