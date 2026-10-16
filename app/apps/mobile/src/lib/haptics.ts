import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

export function hapticSuccess(): void {
  if (Platform.OS === 'web') return;
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
}

export function hapticLightImpact(): void {
  if (Platform.OS === 'web') return;
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

/** Light tap for likes, reactions, toggles — native only. */
export function hapticLightTap(): void {
  if (Platform.OS === 'web') return;
  if (Platform.OS === 'ios') {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    return;
  }
  void Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Context_Click);
}
