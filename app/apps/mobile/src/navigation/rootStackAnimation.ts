import { Platform } from 'react-native';

export function rootStackScreenAnimation(): 'fade' | 'default' | 'slide_from_right' {
  if (Platform.OS === 'web') return 'fade';
  if (Platform.OS === 'android') return 'slide_from_right';
  return 'default';
}

export const rootStackGestureEnabled = Platform.OS !== 'web';
