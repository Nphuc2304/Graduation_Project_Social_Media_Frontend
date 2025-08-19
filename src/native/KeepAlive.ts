import {NativeModules, Platform, PermissionsAndroid} from 'react-native';
const {KeepAlive} = NativeModules;

export async function startKeepAlive(title?: string, text?: string) {
  if (Platform.OS !== 'android' || !KeepAlive) return;
  if (Platform.Version >= 33) {
    const granted = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS as any,
    );
    if (!granted) {
      await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS as any,
      );
    }
  }
  await KeepAlive.start({title, text});
}

export async function stopKeepAlive() {
  if (Platform.OS !== 'android' || !KeepAlive) return;
  await KeepAlive.stop();
}
