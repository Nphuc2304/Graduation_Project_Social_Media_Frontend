import {
  getMessaging,
  onMessage,
  getToken,
  getInitialNotification,
  onNotificationOpenedApp as onNotificationOpenedAppListener,
  requestPermission,
  AuthorizationStatus,
} from '@react-native-firebase/messaging';
import {getApp} from '@react-native-firebase/app';
import notifee, {AndroidImportance} from '@notifee/react-native';

const messaging = getMessaging(getApp());

/**
 * Xin quyền nhận thông báo từ người dùng.
 * Trả về true nếu được cấp quyền.
 */
export async function requestUserPermission(): Promise<boolean> {
  const authStatus = await requestPermission(messaging);
  const enabled =
    authStatus === AuthorizationStatus.AUTHORIZED ||
    authStatus === AuthorizationStatus.PROVISIONAL;

  return enabled;
}

/**
 * Lấy FCM Token sau khi được cấp quyền.
 */
export async function getFCMToken(): Promise<string | null> {
  const hasPermission = await requestUserPermission();
  if (!hasPermission) return null;

  try {
    const token = await getToken(messaging);
    return token;
  } catch (error) {
    console.error('[FCM] Error getting token:', error);
    return null;
  }
}

/**
 * Tạo notification channel cho Android (gọi 1 lần khi app khởi động)
 */
export async function createNotificationChannel() {
  await notifee.createChannel({
    id: 'default',
    name: 'Default Channel',
    importance: AndroidImportance.HIGH,
  });
}

/**
 * Lắng nghe thông báo khi app đang mở (foreground)
 */
export function onMessageListener(callback: (message: any) => void) {
  return onMessage(messaging, callback);
}

/**
 * Lắng nghe khi người dùng mở app từ background bằng cách bấm vào thông báo
 */
export function onNotificationOpenedApp(callback: (message: any) => void) {
  return onNotificationOpenedAppListener(getMessaging(getApp()), callback);
}

/**
 * Kiểm tra xem app có được mở từ quit state bằng thông báo không
 */
export async function checkInitialNotification(
  callback: (message: any) => void,
) {
  const remoteMessage = await getInitialNotification(messaging);
  if (remoteMessage) {
    callback(remoteMessage);
  }
}

export function isIncomingCallMessage(remoteMessage: any) {
  return remoteMessage?.data?.type === 'incoming_call';
}
