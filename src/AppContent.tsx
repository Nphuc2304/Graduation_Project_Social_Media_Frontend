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
import {useNotificationHandler} from '@services/notification/useNotification'; // <- đảm bảo file hook đã được cập nhật như mình gửi
import {navigationRef} from './NavigationService';
import {Linking, PermissionsAndroid, Platform} from 'react-native';
import {navigateFromUrl} from './core/deeplinkHandler';
import {useSocket} from '@services/SocketContext';
import {useSelector} from 'react-redux';
import {RootState} from '@services/store';
import CallInvitePopup from '@services/notification/CallInvitePopup';

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
  const {connectToSocket, socket} = useSocket();

  useEffect(() => {
    createNotificationChannel();
  }, []);

  useEffect(() => {
    connectToSocket();
  }, []);

  const {
    modalData,
    clearModal,
    incomingCall,
    acceptIncomingCall,
    declineIncomingCall,
  } = useNotificationHandler(data => {
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
        // Không điều hướng trực tiếp ở đây — hook đã set incomingCall để hiển thị popup
        break;

      case 'call_accepted':
        // Khi user bấm Chấp nhận trong popup → hook gọi onNavigate với case này
        socket?.emit('acceptCall', {
          roomId: data.roomId,
          userId: user?._id,
          callType: data.callType || 'video',
        });
        navigationRef.navigate('ZegoCallScreen', {
          callID: data.roomId,
          userID: user?._id,
          userName: user?.username,
          image: user?.profilePic,
          isCaller: false,
          callType: data.callType || 'video',
        });
        break;

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
    })();
  }, []);

  return (
    <>
      <AppNavigator />
      <Toast />

      {/* Notification in-app chung cho các loại khác */}
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
                case 'message':
                  navigationRef.navigate('MessageScreen', {
                    room: modalData.data?.roomId,
                    isWaiting: modalData.data?.isWaiting,
                  });
                  break;

                // LƯU Ý: KHÔNG điều hướng thẳng với 'incoming_call' tại modal này nữa.
                // Vì ta đã có CallInvitePopup hiển thị riêng để Accept/Decline.
                case 'incoming_call':
                case 'call':
                default:
                  break;
              }
            }
          }}
        />
      )}

      {/* Popup cuộc gọi đến: chấp nhận / từ chối */}
      <CallInvitePopup
        visible={Boolean(incomingCall?.visible)}
        callerName={incomingCall?.callerName}
        callerAvatar={incomingCall?.callerAvatar}
        callType={incomingCall?.callType}
        onAccept={acceptIncomingCall}
        onDecline={declineIncomingCall}
        onRequestClose={declineIncomingCall}
      />

      <GlobalAlert ref={handleAlertRef} />
    </>
  );
};

export default AppContent;
