/**
 * @format
 */

import {AppRegistry, Platform} from 'react-native';
import App from './src/App';
import {name as appName} from './app.json';

import messaging from '@react-native-firebase/messaging';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';
import {setupCallKeep} from './services/CallKeepService';

import RNCallKeep from 'react-native-callkeep';

AppRegistry.registerComponent(appName, () => App);
setupCallKeep().catch(err => console.warn('[INDEX] setupCallKeep failed', err));

const setupCallKeepHeadless = async () => {
  try {
    const options = {
      ios: {
        appName: 'Cirla',
        supportsVideo: true,
        maximumCallGroups: '1',
        maximumCallsPerCallGroup: '1',
      },
      android: {
        alertTitle: 'Quyền cuộc gọi',
        alertDescription: 'Ứng dụng cần quyền truy cập cuộc gọi để hoạt động',
        cancelButton: 'Hủy',
        okButton: 'OK',
        additionalPermissions: [],
        selfManaged: true,
        foregroundService: {
          channelId: 'com.cirla.call',
          channelName: 'Cuộc gọi Cirla',
          notificationTitle: 'Cuộc gọi đang diễn ra',
          notificationIcon: 'logo_loading',
        },
      },
    };

    console.log('[HEADLESS] Setting up CallKeep...');
    await RNCallKeep.setup(options);
    RNCallKeep.setAvailable(true);
    console.log('[HEADLESS] CallKeep setup completed');
    return true;
  } catch (err) {
    console.error('[HEADLESS] CallKeep setup failed:', err);
    return false;
  }
};

// Show incoming call in headless mode
const showIncomingCallHeadless = ({uuid, handle, name, hasVideo = true}) => {
  try {
    console.log(`[HEADLESS] Displaying native incoming call: ${name} (${handle}) UUID: ${uuid}`);
    
    RNCallKeep.displayIncomingCall(
      uuid,
      handle,
      name,
      'number',
      hasVideo
    );
    
    console.log(`[HEADLESS] Native call UI displayed for UUID: ${uuid}`);
  } catch (err) {
    console.error('[HEADLESS] Failed to display incoming call:', err);
  }
};

messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log('[BG HANDLER] ===== BACKGROUND MESSAGE RECEIVED =====');
  console.log('[BG HANDLER] Full message:', JSON.stringify(remoteMessage, null, 2));
  
  try {
    const data = remoteMessage?.data || {};
    const notification = remoteMessage?.notification || {};
    
    console.log('[BG HANDLER] Extracted data:', JSON.stringify(data, null, 2));
    console.log('[BG HANDLER] Notification:', JSON.stringify(notification, null, 2));
    
    if (data.type === 'incoming_call') {
      console.log('[BG HANDLER] 📞 Processing incoming call...');
      
      const callUuid = data.callUuid || uuidv4();
      const userName = data.userName || 'Unknown Caller';
      const userId = data.userId || data.senderId || 'unknown';
      const callType = data.callType || 'video';
      
      console.log('[BG HANDLER] Call details:', {
        callUuid,
        userName,
        userId,
        callType,
        callId: data.callId,
        roomId: data.roomId
      });
      
      const callData = {
        ...data,
        callUuid,
        timestamp: Date.now(),
        backgroundReceived: true,
        platform: Platform.OS,
        callType,
        messageId: remoteMessage.messageId,
      };
      
      console.log('[BG HANDLER] Storing call data...');
      await AsyncStorage.setItem(`incoming_call:${callUuid}`, JSON.stringify(callData));
      console.log('[BG HANDLER] Call data stored successfully');
      
      try {
        console.log('[BG HANDLER] Setting up CallKeep...');
        // const setupSuccess = await setupCallKeepHeadless();
        
        // if (!setupSuccess) {
        //   console.error('[BG HANDLER] CallKeep setup failed in background');
        //   return;
        // }
        RNCallKeep.setAvailable(true); 
        RNCallKeep.displayIncomingCall(
          callUuid,
          userId,
          userName,
          'number',
          data.callType !== 'voice'
        );
        await AsyncStorage.setItem('active_call_uuid', callUuid);
        console.log('[BG] RNCallKeep.displayIncomingCall called', callUuid);
        // console.log('[BG HANDLER] CallKeep setup successful, showing native call UI...');
        
        showIncomingCallHeadless({
          uuid: callUuid,
          handle: userId,
          name: userName,
          hasVideo: callType !== 'voice',
        });
        
        await AsyncStorage.setItem('active_call_uuid', callUuid);
        
        console.log('[BG HANDLER] ✅ Background call setup completed successfully');
        
      } catch (callKeepErr) {
        console.error('[BG HANDLER] ❌ CallKeep error:', callKeepErr);
      }
    } else {
      console.log('[BG HANDLER] Non-call message type:', data.type);
    }
    
  } catch (err) {
    console.error('[BG HANDLER] ❌ Critical error in background handler:', err);
    console.error('[BG HANDLER] Error stack:', err.stack);
  }
  
  console.log('[BG HANDLER] ===== END BACKGROUND HANDLER =====');
});

console.log('[INDEX] Background message handler registered');

messaging().onMessage(async remoteMessage => {
  console.log('[FG HANDLER] Foreground message received:', JSON.stringify(remoteMessage?.data, null, 2));
  
  const data = remoteMessage?.data || {};
  if (data.type === 'incoming_call') {
    console.log('[FG HANDLER] Incoming call in foreground - should show native UI');
    
    const callUuid = data.callUuid || uuidv4();
    const userName = data.userName || 'Unknown Caller';
    const userId = data.userId || data.senderId || 'unknown';
    const callType = data.callType || 'video';
    
    const callData = {
      ...data,
      callUuid,
      timestamp: Date.now(),
      foregroundReceived: true,
    };
    
    await AsyncStorage.setItem(`incoming_call:${callUuid}`, JSON.stringify(callData));
    
    try {
      await setupCallKeepHeadless();
      showIncomingCallHeadless({
        uuid: callUuid,
        handle: userId,
        name: userName,
        hasVideo: callType !== 'voice',
      });
    } catch (err) {
      console.error('[FG HANDLER] Error showing call UI:', err);
    }
  }
});

messaging()
  .getToken()
  .then(token => {
    console.log('[INDEX] FCM Token:', token ? 'Token exists' : 'No token');
  })
  .catch(err => {
    console.error('[INDEX] Error getting FCM token:', err);
  });

console.log('[INDEX] Firebase messaging setup completed');
console.log('[INDEX] Platform:', Platform.OS, 'Version:', Platform.Version);