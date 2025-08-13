import {AppRegistry} from 'react-native';
import App from './src/App';
import {name as appName} from './app.json';
import messaging from '@react-native-firebase/messaging';
import notifee, {EventType} from '@notifee/react-native';
import {showIncomingCall, setupCallKeep} from './services/CallKeepService';

// Handler nền cho Notifee
notifee.onBackgroundEvent(async ({type, detail}) => {
  if (type === EventType.ACTION_PRESS) {
    // Xử lý khi bấm action
  }
  if (type === EventType.DISMISSED) {
    // Xử lý khi dismiss
  }
});

// Handler nền cho FCM
messaging().setBackgroundMessageHandler(async remoteMessage => {
  await setupCallKeep();
  if (remoteMessage?.data?.type === 'incoming_call') {
    showIncomingCall({
      callerName: remoteMessage.data.callerName ?? 'Caller',
      handle: remoteMessage.data.handle ?? 'number',
      hasVideo: remoteMessage.data.hasVideo === 'true',
    });
  }
});

AppRegistry.registerComponent(appName, () => App);
