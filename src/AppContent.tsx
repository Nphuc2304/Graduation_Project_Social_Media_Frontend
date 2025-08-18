import React, {useEffect} from 'react';
import AppNavigator from './Navigation/AppNavigation';
import Toast from 'react-native-toast-message';
import {
  GlobalAlert,
  GlobalAlertManager,
  GlobalAlertRef,
} from '../components/Global/AlertModal';
import NotificationModal from '@services/notification/NotificationModal';
import {createNotificationChannel} from '@services/notification/notification';
import {useNotificationHandler} from '@services/notification/useNotification';
import {navigationRef} from './NavigationService';
import {Linking, PermissionsAndroid, Platform} from 'react-native';
import {navigateFromUrl} from './core/deeplinkHandler';
import {
  setCallKeepUserId,
  setupCallKeep,
  showIncomingCall,
} from './core/callkeep/callkeep';
import {useSocket} from '@services/SocketContext';
import {useSelector} from 'react-redux';
import {RootState} from '@services/store';

async function requestCallPermissions() {
  if (Platform.OS !== 'android') return;
  const perms = [
    PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
    PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
  ];
  if (
    Platform.Version >= 31 &&
    PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT
  ) {
    perms.push(PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT);
  }
  if (
    Platform.Version >= 33 &&
    PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
  ) {
    perms.push(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
  }
  await PermissionsAndroid.requestMultiple(perms);
}

const AppContent = () => {
  const user = useSelector((state: RootState) => state.user.user);
  const {connectToSocket} = useSocket();
  useEffect(() => {
    createNotificationChannel();
  }, []);

  useEffect(() => {
    connectToSocket();
  }, []);

  const {modalData, clearModal} = useNotificationHandler(data => {
    if (!navigationRef.isReady()) return;

    switch (data?.type) {
      case 'comment':
        if (data?.postId) {
          navigationRef.navigate('PostDetailScreen', {
            postId: data?.postId,
            commentId: data?.commentId,
          });
        }
        break;
      case 'like':
      case 'post':
        if (data?.postId) {
          navigationRef.navigate('PostDetailScreen', {
            postId: data?.postId,
          });
        }
        break;
      case 'follow':
        navigationRef.navigate('ProfileComp', {
          userID: data?.userId,
        });
        break;
      case 'incoming_call':
      case 'call': {
        if (user?._id) setCallKeepUserId(user._id);
        showIncomingCall({
          uuid: modalData.data.callUuid,
          callerName: modalData.data.userName || 'Cuộc gọi tới',
          handle: modalData.data.userId,
          hasVideo: (modalData.data.callType || 'video') === 'video',
          roomId: modalData.data.callId || modalData.data.roomId,
          callerId: modalData.data.userId,
          image: modalData.data.image,
        });
        break;
      }
      case 'message':
        navigationRef.navigate('MessageScreen', {
          room: data?.roomId,
          isWaiting: data?.isWaiting,
        });
        break;
      default:
        break;
    }
  });

  const handleAlertRef = (ref: GlobalAlertRef | null) => {
    if (ref) {
      GlobalAlertManager.setAlertRef(ref);
    }
  };

  useEffect(() => {
    const sub = Linking.addEventListener('url', ({url}) => {
      if (url) {
        const stripped = url
          .replace('cirla://', '')
          .replace('https://cirla.io.vn/', '');
        navigateFromUrl(stripped);
      }
    });

    return () => sub.remove();
  }, []);

  useEffect(() => {
    (async () => {
      await requestCallPermissions();
      await setupCallKeep();
    })();
  }, []);

  return (
    <>
      <AppNavigator />
      <Toast />
      {modalData && (
        <NotificationModal
          visible={true}
          title={modalData.title}
          body={modalData.body}
          onClose={clearModal}
          onAction={() => {
            clearModal();
            if (modalData.data) {
              switch (modalData.data.type) {
                case 'comment':
                  if (modalData.data?.postId) {
                    navigationRef.navigate('PostDetailScreen', {
                      postId: modalData.data?.postId,
                      commentId: modalData.data?.commentId,
                    });
                  }
                  break;
                case 'like':
                case 'post':
                  if (modalData.data?.postId) {
                    navigationRef.navigate('PostDetailScreen', {
                      postId: modalData.data?.postId,
                    });
                  }
                  break;
                case 'follow':
                  navigationRef.navigate('ProfileComp', {
                    userID: modalData.data?.userId,
                  });
                  break;
                case 'incoming_call':
                case 'call':
                  navigationRef.navigate('ZegoCallScreen', {
                    callID: modalData.data.callId || modalData.data.roomId,
                    userID: modalData.data.userId,
                    userName: modalData.data.userName,
                    image: modalData.data.image,
                    isCaller: false,
                    callType: modalData.data.callType || 'video',
                  });
                  break;
                case 'message':
                  navigationRef.navigate('MessageScreen', {
                    room: modalData.data.roomId,
                    isWaiting: modalData.data?.isWaiting,
                  });
                  break;
                default:
                  break;
              }
            }
          }}
        />
      )}
      <GlobalAlert ref={handleAlertRef} />
    </>
  );
};

export default AppContent;
