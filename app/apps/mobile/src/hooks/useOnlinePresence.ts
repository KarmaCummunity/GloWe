// Online presence (green dot): one shared `presence:online` channel per signed-in,
// foregrounded app session. Rows/headers read the shared set via useIsOnline —
// they never open their own channels.
import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';
import { useAuthStore } from '../store/authStore';
import { container } from '../lib/container';

/** Mount once near the root: tracks the signed-in user while the app is active. */
export function useOnlinePresenceLifecycle(): void {
  const userId = useAuthStore((s) => s.session?.userId ?? null);
  useEffect(() => {
    const presence = container.onlinePresence;
    if (!userId) {
      presence.stop();
      return;
    }
    if (AppState.currentState !== 'background') presence.start(userId);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') presence.start(userId);
      else if (state === 'background') presence.stop();
    });
    return () => {
      sub.remove();
      presence.stop();
    };
  }, [userId]);
}

/** True while `userId` is tracked on presence:online. */
export function useIsOnline(userId: string | null | undefined): boolean {
  const presence = container.onlinePresence;
  const subscribe = useCallback((onChange: () => void) => presence.subscribe(onChange), [presence]);
  const read = useCallback(() => presence.isOnline(userId), [presence, userId]);
  return useSyncExternalStore(subscribe, read, () => false);
}
