// Shared native-stack options for modal/detail routes (see root `app/_layout.tsx`).
import { Platform } from 'react-native';
import { useTheme } from '@kc/ui';
import { nativeStackHeaderLeftIconOnly } from './nativeHeaderIconOnly';
import { rootStackGestureEnabled, rootStackScreenAnimation } from './rootStackAnimation';

export function useDetailStackScreenOptions() {
  const { colors } = useTheme();
  return {
    headerShown: true,
    ...nativeStackHeaderLeftIconOnly(colors.primary),
    headerBackVisible: false,
    headerTintColor: colors.primary,
    headerStyle: { backgroundColor: colors.surface },
    headerTitleAlign: 'center' as const,
    animation: rootStackScreenAnimation(),
    gestureEnabled: rootStackGestureEnabled,
    fullScreenGestureEnabled: Platform.OS === 'ios',
  } as const;
}
