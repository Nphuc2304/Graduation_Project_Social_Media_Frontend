import {useEffect, useState, useCallback} from 'react';
import {
  checkInitialNotification,
  onMessageListener,
  onNotificationOpenedApp,
} from './notification';
import {AppDispatch, RootState} from '@services/store';
import {setIsReadNoti} from '@services/notificationRedux/notificationReducer';
import {useDispatch, useSelector} from 'react-redux';
import {
  setupCallKeep,
  showIncomingCall,
  setCallKeepUserId,
} from '../../src/core/callkeep/callkeep';
import {useSocket} from '@services/SocketContext';

export const useNotificationHandler = (onNavigate: (data: any) => void) => {
  const [modalData, setModalData] = useState<any | null>(null);
  const dispatch = useDispatch<AppDispatch>();
  const {connectToSocket} = useSocket();
  const user = useSelector((s: RootState) => s.user.user);

  const handleIncomingCallPush = useCallback(
    async (data: any) => {
      await setupCallKeep();
      connectToSocket();
      if (user?._id) setCallKeepUserId(user._id);

      showIncomingCall({
        uuid: data.callUuid,
        callerName: data.userName || 'Cuộc gọi tới',
        handle: data.userId,
        hasVideo: (data.callType || 'video') === 'video',
        roomId: data.callId || data.roomId,
        callerId: data.userId,
        image: data.image,
      });
    },
    [connectToSocket, user?._id],
  );

  const handleMessage = useCallback(
    async (remoteMessage: any) => {
      const t = remoteMessage?.data?.type;
      if (t === 'incoming_call') {
        await handleIncomingCallPush(remoteMessage.data);
        return; 
      }

      setModalData({
        title: remoteMessage.notification?.title,
        body: remoteMessage.notification?.body,
        data: remoteMessage.data,
      });
      dispatch(setIsReadNoti(true));
    },
    [dispatch, handleIncomingCallPush],
  );

  const handleNavigate = useCallback(
    async (remoteMessage: any) => {
      const t = remoteMessage?.data?.type;
      if (t === 'incoming_call') {
        await handleIncomingCallPush(remoteMessage.data);
        return;
      }

      if (remoteMessage?.data) {
        onNavigate(remoteMessage.data);
        dispatch(setIsReadNoti(false));
      }
    },
    [dispatch, onNavigate, handleIncomingCallPush],
  );

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
    modalData,
    clearModal: () => setModalData(null),
  };
};
