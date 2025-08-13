/**
 * @format
 */

import {AppRegistry} from 'react-native';
import App from './src/App';
import {name as appName} from './app.json';
import messaging from '@react-native-firebase/messaging';
import { showIncomingCall, setupCallKeep } from './services/CallKeepService';

AppRegistry.registerComponent(appName, () => App);

// Background message handler
messaging().setBackgroundMessageHandler(async remoteMessage => {
  // CallKeep cần được setup trước khi displayIncomingCall
  await setupCallKeep();

  if (remoteMessage?.data?.type === 'incoming_call') {
    showIncomingCall({
      callerName: remoteMessage.data.callerName ?? 'Caller',
      handle: remoteMessage.data.handle ?? 'number',
      hasVideo: remoteMessage.data.hasVideo === 'true',
    });
  }
});