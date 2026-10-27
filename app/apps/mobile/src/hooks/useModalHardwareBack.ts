import { useEffect } from 'react';
import { BackHandler, Platform } from 'react-native';
import { useActiveModalReservation } from '../components/legal/useActiveModalStack';

/** Android hardware / predictive back dismisses an open modal instead of exiting the app. */
export function useModalHardwareBack(active: boolean, onDismiss: () => void): void {
  useActiveModalReservation(active);

  useEffect(() => {
    if (!active || Platform.OS === 'web') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onDismiss();
      return true;
    });
    return () => sub.remove();
  }, [active, onDismiss]);
}
