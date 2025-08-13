/**
 * @format
 */

import {AppRegistry, Platform} from 'react-native';
import App from './src/App';
import {name as appName} from './app.json';

import messaging from '@react-native-firebase/messaging';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { showIncomingCall, setupCallKeep, cleanupCallData } from './services/CallKeepService';
import { v4 as uuidv4 } from 'uuid';

AppRegistry.registerComponent(appName, () => App);

// Background message handler - this is crucial for the native call experience
messaging().setBackgroundMessageHandler(async remoteMessage => {
  try {
    console.log('[BG MSG HANDLER] Received message:', remoteMessage);
    const data = remoteMessage?.data || {};
    
    // Only handle incoming call notifications
    if (data.type === 'incoming_call') {
      console.log('[BG MSG HANDLER] Processing incoming call:', data);
      
      // Generate UUID for this call (use provided one or create new)
      const callUuid = data.callUuid || uuidv4();
      
      // Clean up any previous call data to prevent conflicts
      await cleanupCallData();
      
      // Store comprehensive call data
      const callData = {
        ...data,
        callUuid,
        receivedAt: new Date().toISOString(),
        processedInBackground: true,
      };
      
      await AsyncStorage.setItem(
        `incoming_call:${callUuid}`, 
        JSON.stringify(callData)
      );
      
      console.log('[BG] Stored call data for UUID:', callUuid);

      try {
        // Setup CallKeep if not already done
        const setupSuccess = await setupCallKeep();
        if (!setupSuccess) {
          console.error('[BG] CallKeep setup failed');
          return;
        }
        
        console.log('[BG] CallKeep setup successful');
        
        // Show the native incoming call interface
        await showIncomingCall({
          uuid: callUuid,
          handle: data.userId || data.senderId || 'unknown',
          name: data.userName || remoteMessage.notification?.title || 'Unknown Caller',
          hasVideo: (data.callType || 'video') === 'video',
        });

        console.log(`[BG] Successfully displayed incoming call for UUID: ${callUuid}`);
        
        // Store active call UUID for cleanup later
        await AsyncStorage.setItem('active_call_uuid', callUuid);
        
      } catch (callKeepError) {
        console.error('[BG] CallKeep error:', callKeepError);
        
        // Fallback: at least store the data for foreground handling
        console.log('[BG] Falling back to foreground notification handling');
      }
    } else {
      console.log('[BG MSG HANDLER] Non-call message, ignoring');
    }
  } catch (err) {
    console.error('[BG MSG HANDLER] Critical error:', err);
  }
});

// Handle app launch from killed state
messaging().getInitialNotification().then(remoteMessage => {
  if (remoteMessage?.data?.type === 'incoming_call') {
    console.log('[INITIAL MSG] App launched from call notification:', remoteMessage.data);
    // The call would have been handled by background handler
    // Just log for debugging
  }
});