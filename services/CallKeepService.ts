import RNCallKeep from 'react-native-callkeep';
import {Permission, PermissionsAndroid, Platform} from 'react-native';
import {GlobalAlertManager} from '../components/Global/AlertModal';

export const requestCallPermissions = async () => {
  if (Platform.OS !== 'android') return true;

  // Base required permissions
  const required: Permission[] = [
    PermissionsAndroid.PERMISSIONS.RECORD_AUDIO as Permission,
  ];

  // Conditional permissions based on Android version and availability
  const conditional: Permission[] = [];
  
  if (Platform.Version >= 27 && PermissionsAndroid.PERMISSIONS.MANAGE_OWN_CALLS) {
    conditional.push(PermissionsAndroid.PERMISSIONS.MANAGE_OWN_CALLS as Permission);
  }

  // Android 13+ notifications
  if (Platform.Version >= 33 && PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS) {
    conditional.push(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS as Permission);
  }

  // Phone permissions for better native call integration
  if (PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE) {
    conditional.push(PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE as Permission);
  }

  try {
    // Request required permissions first
    const requiredResults = await PermissionsAndroid.requestMultiple(required);
    console.log('[CallKeep] Required permission results:', requiredResults);

    const requiredGranted = required.every(
      p => requiredResults[p] === PermissionsAndroid.RESULTS.GRANTED,
    );

    if (!requiredGranted) {
      console.error('[CallKeep] Required permissions denied:', requiredResults);
      GlobalAlertManager.show(
        'Quyền bị từ chối',
        'Ứng dụng cần quyền Micro để hoạt động cuộc gọi.',
      );
      return false;
    }

    if (conditional.length > 0) {
      try {
        const conditionalResults = await PermissionsAndroid.requestMultiple(conditional);
        console.log('[CallKeep] Conditional permission results:', conditionalResults);
        
        conditional.forEach(p => {
          if (conditionalResults[p] !== PermissionsAndroid.RESULTS.GRANTED) {
            console.warn(`[CallKeep] Conditional permission denied (non-critical): ${p}`);
          }
        });
      } catch (conditionalErr) {
        console.warn('[CallKeep] Error requesting conditional permissions:', conditionalErr);
      }
    }

    console.log('[CallKeep] Permission setup completed successfully');
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
    includesCallsInRecents: true,
    supportsHolding: false,
    supportsGrouping: false,
    supportsUngrouping: false,
    ringtoneSound: 'system_ringtone_default',
  },
  android: {
    alertTitle: 'Quyền cuộc gọi',
    alertDescription: 'Ứng dụng cần quyền truy cập cuộc gọi để hoạt động',
    cancelButton: 'Hủy',
    okButton: 'OK',
    additionalPermissions: [],
    selfManaged: true, 
    connectionService: {
      skipInitialState: false,
      audioModeInCall: 0, 
    },
    foregroundService: {
      channelId: 'com.cirla.call',
      channelName: 'Cuộc gọi Cirla',
      notificationTitle: 'Cuộc gọi đang diễn ra',
      notificationIcon: 'logo_loading',
      notificationImportance: 'high',
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

    const hasPermissions = await requestCallPermissions();
    if (!hasPermissions) {
      console.warn('[CallKeep] Setup aborted - missing permissions');
      return false;
    }

    await RNCallKeep.setup(options);
    
    // Critical: Set as available and register for phone account
    RNCallKeep.setAvailable(true);
    
    // Android-specific: Register phone account for better native integration
    if (Platform.OS === 'android') {
      try {
        // This helps with showing the call in native UI
        RNCallKeep.registerPhoneAccount(options);
        console.log('[CallKeep] Phone account registered');
      } catch (err) {
        console.warn('[CallKeep] Could not register phone account:', err);
        // Not critical for basic functionality
      }
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

export const showIncomingCall = ({
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
    console.log(`[CallKeep] Displaying native incoming call: ${name} (${handle}) UUID: ${uuid}`);
    
    // Enhanced call display with better native integration
    const callData = {
      uuid,
      handle,
      localizedCallerName: name,
      hasVideo,
      fromPushKit: false, // We're using FCM, not PushKit
      payload: {
        callerId: handle,
        callerName: name,
        hasVideo,
      }
    };
    
    console.log('[CallKeep] Call data being sent:', callData);
    
    // Key: Use 'number' type for native phone call appearance
    RNCallKeep.displayIncomingCall(
      uuid,
      handle,
      name,
      'number', // This makes it look like a real phone call
      hasVideo
    );
    
    // Additional step: Ensure the call is properly activated in the system
    setTimeout(() => {
      try {
        RNCallKeep.backToForeground();
        console.log('[CallKeep] Brought call to foreground');
      } catch (err) {
        console.warn('[CallKeep] Could not bring to foreground:', err);
      }
    }, 500);
    
  } catch (err) {
    console.error('[CallKeep] Failed to display incoming call:', err);
  }
};

export const endCall = (uuid: string, reason?: number) => {
  try {
    console.log(`[CallKeep] Ending call: ${uuid} with reason: ${reason || 'unknown'}`);
    RNCallKeep.endCall(uuid);
  } catch (err) {
    console.error('[CallKeep] Failed to end call:', err);
  }
};

export const startCall = (uuid: string, handle: string, name: string, hasVideo = true) => {
  try {
    console.log(`[CallKeep] Starting call: ${name} (${handle}) UUID: ${uuid}`);
    RNCallKeep.startCall(uuid, handle, name, 'number', hasVideo);
  } catch (err) {
    console.error('[CallKeep] Failed to start call:', err);
  }
};

// Enhanced call state management
export const setCallActive = (uuid: string) => {
  try {
    RNCallKeep.setCurrentCallActive(uuid);
    console.log(`[CallKeep] Set call active: ${uuid}`);
  } catch (err) {
    console.error('[CallKeep] Failed to set call active:', err);
  }
};

export const setCallOnHold = (uuid: string, hold: boolean) => {
  try {
    RNCallKeep.setOnHold(uuid, hold);
    console.log(`[CallKeep] Set call ${hold ? 'on hold' : 'off hold'}: ${uuid}`);
  } catch (err) {
    console.error('[CallKeep] Failed to set call hold state:', err);
  }
};

// Helper to check if CallKeep is properly set up
export const isCallKeepAvailable = (): boolean => {
  try {
    return RNCallKeep && isSetupComplete;
  } catch (err) {
    console.error('[CallKeep] Error checking availability:', err);
    return false;
  }
};

// Helper to get active calls
export const getActiveCalls = async () => {
  try {
    const calls = await RNCallKeep.getCalls();
    console.log('[CallKeep] Active calls:', calls);
    return calls;
  } catch (err) {
    console.error('[CallKeep] Failed to get active calls:', err);
    return [];
  }
};

// Cleanup function
export const cleanup = () => {
  try {
    RNCallKeep.setAvailable(false);
    isSetupComplete = false;
    console.log('[CallKeep] Cleanup completed');
  } catch (err) {
    console.error('[CallKeep] Error during cleanup:', err);
  }
};