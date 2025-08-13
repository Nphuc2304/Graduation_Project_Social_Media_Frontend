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
import {Linking, AppState, AppStateStatus} from 'react-native';
import {navigateFromUrl} from './core/deeplinkHandler';
import RNCallKeep from 'react-native-callkeep';
import { setupCallKeep, endCall, cleanupCallData } from '@services/CallKeepService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import messaging from '@react-native-firebase/messaging';

const AppContent = () => {
  const appState = useRef(AppState.currentState);

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
          userID: data?.userId,
        });
        break;
      case 'incoming_call':
      case 'call':
        // For incoming calls in foreground, show CallKeep interface instead of navigating directly
        handleForegroundIncomingCall(data);
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

  const handleForegroundIncomingCall = async (data: any) => {
    try {
      console.log('[FG] Handling incoming call in foreground:', data);
      
      // Don't show CallKeep if app is active and user might be in a call already
      if (appState.current === 'active') {
        console.log('[FG] App is active, navigating directly to call screen');
        navigationRef.navigate('ZegoCallScreen', {
          callID: data.callId || data.roomId,
          userID: data.userId,
          userName: data.userName,
          image: data.image,
          isCaller: false,
          callType: data.callType || 'video',
        });
        return;
      }

      // If app is in background/inactive, show CallKeep interface
      const { showIncomingCall } = await import('@services/CallKeepService');
      const callUuid = data.callUuid || `fg-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
      
      await AsyncStorage.setItem(`incoming_call:${callUuid}`, JSON.stringify({
        ...data,
        callUuid,
        processedInForeground: true,
      }));
      
      await showIncomingCall({
        uuid: callUuid,
        handle: data.userId || 'unknown',
        name: data.userName || 'Unknown Caller',
        hasVideo: (data.callType || 'video') === 'video',
      });
      
    } catch (err) {
      console.error('[FG] Error handling incoming call:', err);
      // Fallback to direct navigation
      navigationRef.navigate('ZegoCallScreen', {
        callID: data.callId || data.roomId,
        userID: data.userId,
        userName: data.userName,
        image: data.image,
        isCaller: false,
        callType: data.callType || 'video',
      });
    }
  };

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
    const initializeCallKeep = async () => {
      try {
        console.log('[App] Initializing CallKeep...');
        const success = await setupCallKeep();
        if (success) {
          console.log('[App] CallKeep initialization successful');
        } else {
          console.error('[App] CallKeep initialization failed');
        }
      } catch (err) {
        console.error('[App] CallKeep initialization error:', err);
      }
    };

    initializeCallKeep();

    // Enhanced CallKeep event handlers
    const onAnswerCall = async ({ callUUID }: { callUUID: string }) => {
      console.log(`[CallKeep] Answer call: ${callUUID}`);
      try {
        const raw = await AsyncStorage.getItem(`incoming_call:${callUUID}`);
        
        if (!raw || raw === 'undefined') {
          console.log('[CallKeep] No valid call data found, ending call');
          RNCallKeep.endCall(callUUID);
          return;
        }

        let data;
        try {
          data = JSON.parse(raw);
        } catch (parseErr) {
          console.error('[CallKeep] Failed to parse call data:', parseErr);
          RNCallKeep.endCall(callUUID);
          return;
        }

        console.log('[CallKeep] Retrieved call data for answer:', data);

        if (!data || !data.callId) {
          console.log('[CallKeep] Invalid call data, ending call');
          RNCallKeep.endCall(callUUID);
          return;
        }

        // Mark call as answered and active
        RNCallKeep.setCurrentCallActive(callUUID);

        // Navigate to call screen
        const navigateToCall = () => {
          if (navigationRef.isReady()) {
            console.log('[CallKeep] Navigating to ZegoCallScreen after answer...');
            
            navigationRef.navigate('ZegoCallScreen', {
              userID: data.userId || 'unknown',
              userName: data.userName || 'Unknown',
              callID: data.callId,
              image: data.image,
              isCaller: false,
              callType: data.callType || 'video',
              answeredViaCallKeep: true,
              callUUID: callUUID,
              roomId: data.roomId || data.callId,
            });

            // Clean up stored data after successful navigation
            setTimeout(async () => {
              await AsyncStorage.removeItem(`incoming_call:${callUUID}`);
            }, 1000);
            
          } else {
            console.log('[CallKeep] Navigation not ready, retrying...');
            setTimeout(navigateToCall, 100);
          }
        };

        // Small delay to ensure CallKeep UI transitions properly
        setTimeout(navigateToCall, 300);
        
      } catch (err) {
        console.error('[CallKeep] Answer handler error:', err);
        RNCallKeep.endCall(callUUID);
      }
    };

    const onEndCall = async ({ callUUID }: { callUUID: string }) => {
      console.log(`[CallKeep] End call: ${callUUID}`);
      try {
        // Get call data before cleanup
        const raw = await AsyncStorage.getItem(`incoming_call:${callUUID}`);
        if (raw && raw !== 'undefined') {
          try {
            const data = JSON.parse(raw);
            console.log('[CallKeep] Call was declined/ended via CallKeep for room:', data.roomId);
            
            // TODO: Emit socket event to notify other users call was declined
            // This would require global socket access
            
          } catch (parseErr) {
            console.error('[CallKeep] Failed to parse call data for decline notification:', parseErr);
          }
        }
        
        // Clean up call data
        await AsyncStorage.removeItem(`incoming_call:${callUUID}`);
        await AsyncStorage.removeItem('active_call_uuid');
        
      } catch (err) {
        console.error('[CallKeep] Error in end call handler:', err);
      }
    };

    const onCallDisplayed = ({ callUUID }: { callUUID: string }) => {
      console.log(`[CallKeep] Call displayed: ${callUUID}`);
    };

    const onToggleHold = ({ callUUID, hold }: { callUUID: string; hold: boolean }) => {
      console.log(`[CallKeep] Toggle hold: ${callUUID}, hold: ${hold}`);
      RNCallKeep.setOnHold(callUUID, hold);
    };

    // Register event listeners
    const answerSubscription = RNCallKeep.addEventListener('answerCall', onAnswerCall);
    const endSubscription = RNCallKeep.addEventListener('endCall', onEndCall);
    const displayedSubscription = RNCallKeep.addEventListener('didDisplayIncomingCall', onCallDisplayed);
    const holdSubscription = RNCallKeep.addEventListener('didToggleHoldCallAction', onToggleHold);

    return () => {
      answerSubscription?.remove?.();
      endSubscription?.remove?.();
      displayedSubscription?.remove?.();
      holdSubscription?.remove?.();
    };
  }, []);

  // Handle app state changes
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      console.log('[App] App state changed:', appState.current, '->', nextAppState);
      appState.current = nextAppState;

      if (nextAppState === 'active') {
        // App came to foreground - cleanup any orphaned calls
        cleanupOrphanedCalls();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, []);

  // Clean up calls that might be orphaned
  const cleanupOrphanedCalls = async () => {
    try {
      const activeCallUuid = await AsyncStorage.getItem('active_call_uuid');
      if (activeCallUuid) {
        // Check if this call is still valid
        const callData = await AsyncStorage.getItem(`incoming_call:${activeCallUuid}`);
        if (!callData) {
          // Call data missing, clean up
          await AsyncStorage.removeItem('active_call_uuid');
          console.log('[App] Cleaned up orphaned call UUID');
        }
      }
    } catch (err) {
      console.error('[App] Error cleaning up orphaned calls:', err);
    }
  };

  // Handle foreground notifications (when app is open)
  useEffect(() => {
    const unsubscribe = messaging().onMessage(async remoteMessage => {
      console.log('[FG MSG] Received foreground message:', remoteMessage);
      
      if (remoteMessage.data?.type === 'incoming_call') {
        // Handle incoming call in foreground
        await handleForegroundIncomingCall(remoteMessage.data);
      }
    });

    return unsubscribe;
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