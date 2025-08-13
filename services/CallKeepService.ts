import RNCallKeep from 'react-native-callkeep';
import {Permission, PermissionsAndroid, Platform, AppState} from 'react-native';
import {GlobalAlertManager} from '../components/Global/AlertModal';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const requestCallPermissions = async () => {
  if (Platform.OS !== 'android') return true;

  // Required permissions for CallKeep
  const required: Permission[] = [
    PermissionsAndroid.PERMISSIONS.RECORD_AUDIO as Permission,
    PermissionsAndroid.PERMISSIONS.CAMERA as Permission, // For video calls
  ];

  // Optional permissions
  const optional: Permission[] = [];

  if (Platform.Version >= 33 && PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS) {
    optional.push(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS as Permission);
  }

  // Android 10+ permissions for CallKeep
  if (Platform.Version >= 29) {
    if (PermissionsAndroid.PERMISSIONS.USE_FULL_SCREEN_INTENT) {
      required.push(PermissionsAndroid.PERMISSIONS.USE_FULL_SCREEN_INTENT as Permission);
    }
    if (PermissionsAndroid.PERMISSIONS.SYSTEM_ALERT_WINDOW) {
      optional.push(PermissionsAndroid.PERMISSIONS.SYSTEM_ALERT_WINDOW as Permission);
    }
  }

  try {
    const toAsk: Permission[] = [...required, ...optional];
    const results = await PermissionsAndroid.requestMultiple(toAsk);
    
    console.log('[CallKeep] Permission results:', results, 'API Level:', Platform.Version);

    const requiredGranted = required.every(
      p => results[p] === PermissionsAndroid.RESULTS.GRANTED,
    );

    if (!requiredGranted) {
      GlobalAlertManager.show(
        'Quyền bị từ chối',
        'Ứng dụng cần quyền Micro và Camera để hoạt động cuộc gọi.',
      );
      return false;
    }

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
    maximumCallGroups: '1',
    maximumCallsPerCallGroup: '1',
    ringtoneSound: 'default', // Use default iOS ringtone
    includesCallsInRecents: true,
  },
  android: {
    alertTitle: 'Quyền cuộc gọi',
    alertDescription: 'Ứng dụng cần quyền truy cập cuộc gọi để hoạt động',
    cancelButton: 'Hủy',
    okButton: 'OK',
    additionalPermissions: [
      PermissionsAndroid.PERMISSIONS.USE_FULL_SCREEN_INTENT,
      PermissionsAndroid.PERMISSIONS.SYSTEM_ALERT_WINDOW,
    ],
    selfManaged: true,
    foregroundService: {
      channelId: 'com.cirla.call',
      channelName: 'Cuộc gọi Cirla',
      notificationTitle: 'Cuộc gọi đang diễn ra',
      notificationIcon: 'logo_loading',
      notificationImportance: 'high',
    },
    // Enable wake screen and ringtone
    wakeScreenWhenReceivingCall: true,
    ringtoneFileAsset: 'default', // This will use system default ringtone
  },
};

let isSetupComplete = false;

export const setupCallKeep = async (): Promise<boolean> => {
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

    // Check if app has permission to display over other apps (Android 10+)
    // NOTE: RNCallKeep does not provide canDrawOverlays or requestDisplayOverApps methods.
    // If overlay permission is required, handle it using native modules or other libraries.

    // Setup CallKeep with enhanced options
    await RNCallKeep.setup(options);
    
    // Mark as available
    RNCallKeep.setAvailable(true);

    // Configure audio session for better call quality
    if (Platform.OS === 'ios') {
      RNCallKeep.setReachable();
    }

    isSetupComplete = true;
    console.log('[CallKeep] Setup completed successfully');
    return true;
  } catch (err) {
    console.error('[CallKeep] Setup failed:', err);
    isSetupComplete = false;
    return false;
  }
};

export const showIncomingCall = async ({
  uuid,
  handle,
  name,
  hasVideo = true,
}: {
  uuid: string;
  handle: string;
  name: string;
  hasVideo?: boolean;
}) => {
  try {
    console.log(`[CallKeep] Displaying incoming call: ${name} (${handle}) UUID: ${uuid}, Video: ${hasVideo}`);
    
    // Ensure CallKeep is setup before showing call
    await setupCallKeep();
    
    // Display incoming call with video support
    RNCallKeep.displayIncomingCall(
      uuid, 
      handle, 
      name, 
      'generic', // localizedCallerName type
      hasVideo, // hasVideo
    );

    // For Android, you may want to set the call as active if needed
    if (Platform.OS === 'android') {
      RNCallKeep.setCurrentCallActive(uuid);
    }
    
    console.log(`[CallKeep] Successfully displayed incoming call for UUID: ${uuid}`);
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

export const startCall = (uuid: string, handle: string, name: string, hasVideo: boolean = true) => {
  try {
    console.log(`[CallKeep] Starting call: ${name} (${handle}) UUID: ${uuid}`);
    RNCallKeep.startCall(uuid, handle, name, 'generic', hasVideo);
  } catch (err) {
    console.error('[CallKeep] Failed to start call:', err);
  }
};

export const reportCallUpdate = (uuid: string, localizedCallerName: string) => {
  try {
    RNCallKeep.updateDisplay(uuid, localizedCallerName, 'generic');
  } catch (err) {
    console.error('[CallKeep] Failed to update call display:', err);
  }
};

export const setCallActive = (uuid: string, active: boolean = true) => {
  try {
    if (active) {
      RNCallKeep.setCurrentCallActive(uuid);
    }
  } catch (err) {
    console.error('[CallKeep] Failed to set call active:', err);
  }
};

// Utility function to check if CallKeep is properly configured
export const isCallKeepAvailable = async (): Promise<boolean> => {
  try {
    if (!isSetupComplete) {
      return await setupCallKeep();
    }
    return true;
  } catch (err) {
    console.error('[CallKeep] Availability check failed:', err);
    return false;
  }
};

// Clean up any orphaned call data
export const cleanupCallData = async (uuid?: string) => {
  try {
    if (uuid) {
      await AsyncStorage.removeItem(`incoming_call:${uuid}`);
    } else {
      // Clean all call data
      const keys = await AsyncStorage.getAllKeys();
      const callKeys = keys.filter(key => key.startsWith('incoming_call:'));
      await AsyncStorage.multiRemove(callKeys);
    }
  } catch (err) {
    console.error('[CallKeep] Failed to cleanup call data:', err);
  }
};