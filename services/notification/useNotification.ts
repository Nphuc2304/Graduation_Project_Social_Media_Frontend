import {useEffect, useState, useCallback} from 'react';
import {
  checkInitialNotification,
  onMessageListener,
  onNotificationOpenedApp,
} from './notification';
import { AppDispatch } from '@services/store';
import { setIsReadNoti } from '@services/notificationRedux/notificationReducer';
import { useDispatch } from 'react-redux';

export const useNotificationHandler = (onNavigate: (data: any) => void) => {
  const [modalData, setModalData] = useState<any | null>(null);
  const dispatch = useDispatch<AppDispatch>();

  const handleMessage = useCallback((remoteMessage: any) => {
    setModalData({
      title: remoteMessage.notification?.title,
      body: remoteMessage.notification?.body,
      data: remoteMessage.data,
    });
    dispatch(setIsReadNoti(true));
  }, []);

  const handleNavigate = useCallback(
    (remoteMessage: any) => {
      if (remoteMessage?.data) {
        onNavigate(remoteMessage.data);
        dispatch(setIsReadNoti(false));
      }
    },
    [onNavigate],
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
