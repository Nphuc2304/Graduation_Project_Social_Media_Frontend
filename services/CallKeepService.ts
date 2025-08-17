import RNCallKeep from 'react-native-callkeep';
import {Permission, PermissionsAndroid, Platform} from 'react-native';
import {GlobalAlertManager} from '../components/Global/AlertModal';

export const requestCallPermissions = async () => {
  if (Platform.OS !== 'android') return true;

  // Quyền BẮT BUỘC
  const required: Permission[] = [
    PermissionsAndroid.PERMISSIONS.RECORD_AUDIO as Permission,
  ];

  // Quyền TÙY CHỌN (không làm fail tất cả nếu bị từ chối)
  const optional: Permission[] = [];

  // Android 13+ (API 33): thông báo cho foreground service
  if (
    Platform.Version >= 33 &&
    PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
  ) {
    optional.push(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS as Permission,
    );
  }

  // Android 12+ (API 31): nếu bạn muốn route audio qua tai nghe BT
  // 👉 CHỈ giữ dòng này nếu Manifest có BLUETOOTH_CONNECT
  // optional.push(PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT as Permission);

  try {
    const toAsk: Permission[] = [...required, ...optional];

    const results = await PermissionsAndroid.requestMultiple(toAsk);
    console.log(
      '[CallKeep] requestResults:',
      results,
      'API:',
      Platform.Version,
    );

    const requiredGranted = required.every(
      p => results[p] === PermissionsAndroid.RESULTS.GRANTED,
    );

    if (!requiredGranted) {
      GlobalAlertManager.show(
        'Quyền bị từ chối',
        'Ứng dụng cần quyền Micro để hoạt động cuộc gọi.',
      );
      return false;
    }

    // Nếu optional bị từ chối, chỉ cảnh báo nhẹ, không chặn
    optional.forEach(p => {
      if (results[p] !== PermissionsAndroid.RESULTS.GRANTED) {
        console.warn('[CallKeep] Optional permission denied:', p);
      }
    });

    return true;
  } catch (err) {
    console.error('[CallKeep] Error requesting permissions:', err);
    return false;
  }
};

const options = {
  ios: {
    appName: 'Cirla',
    supportsVideo: true,
    maximumCallGroups: '10',
    maximumCallsPerCallGroup: '10',
  },
  android: {
    alertTitle: 'Quyền cuộc gọi',
    alertDescription: 'Ứng dụng cần quyền truy cập cuộc gọi để hoạt động',
    cancelButton: 'Hủy',
    okButton: 'OK',
    additionalPermissions: [],
    // selfManaged: true,
    foregroundService: {
      channelId: 'com.cirla.call',
      channelName: 'Cuộc gọi Cirla',
      notificationTitle: 'Cuộc gọi đang diễn ra',
      notificationIcon: 'logo_loading',
    },
  },
};

let isSetupComplete = false;

export const setupCallKeep = async () => {
  if (isSetupComplete) {
    console.log('[CallKeep] Already setup, skipping');
    return true;
  }

  try {
    console.log('[CallKeep] Starting setup...');

    // Request permissions first
    const hasPermissions = await requestCallPermissions();
    if (!hasPermissions) {
      console.warn('[CallKeep] Setup aborted - missing permissions');
      return false;
    }

    // Setup CallKeep
    await RNCallKeep.setup(options);
    RNCallKeep.setAvailable(true);

    isSetupComplete = true;
    console.log('[CallKeep] Setup completed successfully');
    return true;
  } catch (err) {
    console.error('[CallKeep] Setup failed:', err);
    isSetupComplete = false; // Reset flag on failure
    return false;
  }
};

export const showIncomingCall = ({
  uuid,
  handle,
  name,
}: {
  uuid: string;
  handle: string;
  name: string;
}) => {
  try {
    console.log(
      `[CallKeep] Displaying incoming call: ${name} (${handle}) UUID: ${uuid}`,
    );
    RNCallKeep.displayIncomingCall(uuid, handle, name, 'generic', true);
  } catch (err) {
    console.error('[CallKeep] Failed to display incoming call:', err);
  }
};

export const endCall = (uuid: string) => {
  try {
    console.log(`[CallKeep] Ending call: ${uuid}`);
    RNCallKeep.endCall(uuid);
  } catch (err) {
    console.error('[CallKeep] Failed to end call:', err);
  }
};

export const startCall = (uuid: string, handle: string, name: string) => {
  try {
    console.log(`[CallKeep] Starting call: ${name} (${handle}) UUID: ${uuid}`);
    RNCallKeep.startCall(uuid, handle, name);
  } catch (err) {
    console.error('[CallKeep] Failed to start call:', err);
  }
};
