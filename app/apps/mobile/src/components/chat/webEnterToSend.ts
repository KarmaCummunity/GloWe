import { Platform, type NativeSyntheticEvent, type TextInputKeyPressEventData } from 'react-native';

/** Web composer: Enter sends, Shift+Enter inserts a new line. No-op on native. */
export function webEnterToSend(send: () => void, disabled: boolean) {
  return (e: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
    if (Platform.OS !== 'web') return;
    const ne = e.nativeEvent as TextInputKeyPressEventData & { shiftKey?: boolean };
    if (ne.key !== 'Enter' || ne.shiftKey) return;
    e.preventDefault();
    if (!disabled) send();
  };
}
