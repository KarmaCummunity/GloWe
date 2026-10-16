import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

const KC_CHANNEL_ID = 'kc-default';

/** Android 8+ — required before push tokens are meaningful. */
export async function ensureAndroidNotificationChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(KC_CHANNEL_ID, {
    name: 'KC',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#F97316',
    sound: 'default',
  });
}
