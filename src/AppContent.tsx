import React, {useEffect, useRef} from 'react';
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
import {Linking, AppState, Platform, AppStateStatus} from 'react-native';
import {navigateFromUrl} from './core/deeplinkHandler';
import RNCallKeep from 'react-native-callkeep';
import { 
  setupCallKeep, 
  setCallActive, 
  endCall,
  isCallKeepAvailable,
  getActiveCalls 
} from '@services/CallKeepService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AppContent = () => {
  const appState = useRef<AppStateStatus>(AppState.currentState);
  const callHandlersRegistered = useRef(false);

  useEffect(() => {
    createNotificationChannel();
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
          userID: modalData.data.userId,
        });
        break;
      case 'incoming_call':
      case 'call':
        navigationRef.navigate('ZegoCallScreen', {
          callID: data.callId || data.roomId,
          userID: data.userId,
          userName: data.userName,
          image: data.image,
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
    const handleAppStateChange = async (nextAppState: string) => {
      console.log('[AppContent] App state changing from', appState.current, 'to', nextAppState);
      
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        console.log('[AppContent] App came to foreground');
        
        try {
          const activeCalls = await getActiveCalls();
          console.log('[AppContent] Active calls on foreground:', activeCalls);
          
          const activeCallUuid = await AsyncStorage.getItem('active_call_uuid');
          if (activeCallUuid) {
            console.log('[AppContent] Found active call UUID on foreground:', activeCallUuid);
          }
        } catch (err) {
          console.warn('[AppContent] Error checking active calls:', err);
        }
      }
      
      appState.current = nextAppState as AppStateStatus;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, []);

  useEffect(() => {
    const initializeCallKeep = async () => {
      try {
        console.log('[AppContent] Initializing CallKeep...');
        const success = await setupCallKeep();
        console.log('[AppContent] CallKeep initialization result:', success);
      } catch (err) {
        console.error('[AppContent] CallKeep initialization failed:', err);
      }
    };

    initializeCallKeep();

    if (!callHandlersRegistered.current) {
      console.log('[AppContent] Registering CallKeep event handlers...');
      
      const onAnswer = async ({ callUUID }: { callUUID: string }) => {
        console.log(`[CallKeep] ✅ Native call ANSWERED: ${callUUID}`);
        
        try {
          setCallActive(callUUID);
          
          // Retrieve stored call data
          const rawCallData = await AsyncStorage.getItem(`incoming_call:${callUUID}`);
          
          if (!rawCallData || rawCallData === 'undefined') {
            console.error('[CallKeep] No call data found for answered call, ending call');
            endCall(callUUID);
            return;
          }

          let callData;
          try {
            callData = JSON.parse(rawCallData);
          } catch (parseErr) {
            console.error('[CallKeep] Failed to parse call data:', parseErr);
            endCall(callUUID);
            return;
          }

          console.log('[CallKeep] Retrieved call data for answered call:', callData);

          if (!callData || !callData.callId) {
            console.error('[CallKeep] Invalid call data structure, ending call');
            endCall(callUUID);
            return;
          }

          const navigateToCall = () => {
            if (navigationRef.isReady()) {
              console.log('[CallKeep] 📱 Navigating to ZegoCallScreen from answered native call...');
              
              const navigationParams = {
                userID: callData.userId || 'unknown',
                userName: callData.userName || 'Unknown',
                callID: callData.callId,
                image: callData.image,
                isCaller: false,
                callType: callData.callType || 'video',
                answeredViaCallKeep: true,
                callUUID: callUUID,
                roomId: callData.roomId || callData.callId,
                fromNativeCall: true,
              };
              
              console.log('[CallKeep] Navigation params:', navigationParams);
              navigationRef.navigate('ZegoCallScreen', navigationParams);
              
            } else {
              console.log('[CallKeep] Navigation not ready, retrying in 100ms...');
              setTimeout(navigateToCall, 100);
            }
          };

          setTimeout(navigateToCall, 300);
          
          await AsyncStorage.removeItem(`incoming_call:${callUUID}`);
          await AsyncStorage.removeItem('active_call_uuid');
          
          console.log('[CallKeep] Call answer handling completed successfully');
          
        } catch (err) {
          console.error('[CallKeep] Critical error in answer handler:', err);
          endCall(callUUID);
        }
      };

      const onEnd = async ({ callUUID }: { callUUID: string }) => {
        console.log(`[CallKeep] ❌ Native call ENDED/DECLINED: ${callUUID}`);
        
        try {
          const rawCallData = await AsyncStorage.getItem(`incoming_call:${callUUID}`);
          if (rawCallData && rawCallData !== 'undefined') {
            try {
              const callData = JSON.parse(rawCallData);
              console.log('[CallKeep] Call was declined/ended for room:', callData.roomId);
              
            } catch (parseErr) {
              console.error('[CallKeep] Failed to parse call data for decline notification:', parseErr);
            }
          }
          
          await AsyncStorage.removeItem(`incoming_call:${callUUID}`);
          await AsyncStorage.removeItem('active_call_uuid');
          
          console.log('[CallKeep] Call end cleanup completed');
          
        } catch (err) {
          console.error('[CallKeep] Error in end call handler:', err);
        }
      };

      const onDidActivateAudioSession = () => {
        console.log('[CallKeep] 🔊 Audio session activated - call is ready');
      };

      const onDidDeactivateAudioSession = () => {
        console.log('[CallKeep] 🔇 Audio session deactivated - call ended');
      };

      const onDidDisplayIncomingCall = ({ callUUID }: { callUUID: string }) => {
        console.log(`[CallKeep] 📱 Native incoming call UI displayed: ${callUUID}`);
      };

      const onShowIncomingCallUi = ({ callUUID }: { callUUID: string }) => {
        console.log(`[CallKeep] 📱 Native incoming call UI shown: ${callUUID}`);
      };

      const onPerformSetMutedCallAction = ({ callUUID, muted }: { callUUID: string, muted: boolean }) => {
        console.log(`[CallKeep] 🎤 Call ${muted ? 'muted' : 'unmuted'}: ${callUUID}`);
      };

      const subscriptions = [
        RNCallKeep.addEventListener('answerCall', onAnswer),
        RNCallKeep.addEventListener('endCall', onEnd),
        RNCallKeep.addEventListener('didActivateAudioSession', onDidActivateAudioSession),
        RNCallKeep.addEventListener('didDeactivateAudioSession', onDidDeactivateAudioSession),
        RNCallKeep.addEventListener('didDisplayIncomingCall', onDidDisplayIncomingCall),
        RNCallKeep.addEventListener('showIncomingCallUi', onShowIncomingCallUi),
        RNCallKeep.addEventListener('didPerformSetMutedCallAction', onPerformSetMutedCallAction),
      ];

      callHandlersRegistered.current = true;
      console.log('[AppContent] CallKeep event handlers registered successfully');

      // Cleanup function
      return () => {
        console.log('[AppContent] Cleaning up CallKeep event handlers...');
        subscriptions.forEach(sub => {
          try {
            sub?.remove?.();
          } catch (err) {
            console.warn('[AppContent] Error removing CallKeep subscription:', err);
          }
        });
        callHandlersRegistered.current = false;
      };
    }
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