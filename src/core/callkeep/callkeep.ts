import RNCallKeep, {IOptions} from 'react-native-callkeep';
import 'react-native-get-random-values';
import {navigationRef} from '../../../src/NavigationService';
import {v4 as uuidv4} from 'uuid';

const options: IOptions = {
  ios: {appName: 'YourApp', supportsVideo: true},
  android: {
    alertTitle: 'Quyền gọi',
    alertDescription: 'Ứng dụng cần quyền để hiển thị cuộc gọi.',
    cancelButton: 'Huỷ',
    okButton: 'OK',
    additionalPermissions: [],
  },
};

let initialized = false;

export async function setupCallKeep() {
  if (initialized) return;
  await RNCallKeep.setup(options);
  RNCallKeep.setAvailable(true);

  // Listeners
  RNCallKeep.addEventListener('answerCall', ({callUUID}) => {
    navigationRef.current?.navigate('ZegoCallScreen', {
      callUUID,
      isIncoming: true,
    });
  });

  RNCallKeep.addEventListener('endCall', ({callUUID}) => {
    if (navigationRef.current?.canGoBack()) {
      navigationRef.current.goBack();
    } else {
      navigationRef.current?.navigate('BottomTabs');
    }
    RNCallKeep.endCall(callUUID);
  });

  RNCallKeep.addEventListener(
    'didDisplayIncomingCall',
    ({callUUID, handle}) => {
      // optional: log/analytics
    },
  );

  initialized = true;
}

export function showIncomingCall({
  uuid = uuidv4(),
  callerName = 'Người gọi',
  handle = 'number',
  hasVideo = true,
}: {
  uuid?: string;
  callerName?: string;
  handle?: string;
  hasVideo?: boolean;
}) {
  RNCallKeep.displayIncomingCall(uuid, handle, callerName, 'generic', hasVideo);
  return uuid;
}

export function startOutgoingCall({
  uuid = uuidv4(),
  callee = 'number',
  hasVideo = true,
}: {
  uuid?: string;
  callee?: string;
  hasVideo?: boolean;
}) {
  RNCallKeep.startCall(uuid, callee, callee, 'number', hasVideo);
  return uuid;
}

export function endCall(uuid: string) {
  RNCallKeep.endCall(uuid);
}

export function endAllCalls() {
  RNCallKeep.endAllCalls();
}
