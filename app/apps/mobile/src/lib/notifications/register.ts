import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { RegisterDeviceUseCase, DeactivateDeviceUseCase } from '@kc/application';
import type { IDeviceRepository } from '@kc/application';
import { ensureAndroidNotificationChannel } from '../pushSetup';

export async function registerCurrentDeviceIfPermitted(
  userId: string,
  deps: { deviceRepo: IDeviceRepository },
): Promise<void> {
  if (!Device.isDevice) return;
  await ensureAndroidNotificationChannel();
  const perm = await Notifications.getPermissionsAsync();
  if (perm.status !== 'granted') return;
  const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
  if (!projectId) {
    console.warn('No EAS projectId configured — push token cannot be registered');
    return;
  }
  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
  const platform = (
    Platform.OS === 'ios' || Platform.OS === 'android' ? Platform.OS : 'web'
  );
  await new RegisterDeviceUseCase(deps.deviceRepo).execute({ userId, pushToken: token, platform });
}

export async function deactivateCurrentDevice(
  deps: { deviceRepo: IDeviceRepository },
): Promise<void> {
  if (!Device.isDevice) return;
  const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
  if (!projectId) return;
  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    await new DeactivateDeviceUseCase(deps.deviceRepo).execute(token);
  } catch {
    // Token unavailable — nothing to deactivate.
  }
}
