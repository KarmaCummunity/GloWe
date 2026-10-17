// Online presence (green dot): one shared `presence:online` channel per signed-in,
// foregrounded app session whose "Show my active status" is ON. Rows/headers read the shared set via useIsOnline —
// they never open their own channels.
import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';
import { useAuthStore } from '../store/authStore';
import { container } from '../lib/container';
import { useActiveStatusSetting } from './useActiveStatusSetting';

/** Mount once near the root: tracks the signed-in user while the app is active. */
export function useOnlinePresenceLifecycle(): void {
  const userId = useAuthStore((s) => s.session?.userId ?? null);
  // "Show my active status" (0419): only join once we know it's ON; when OFF we neither
  // broadcast nor receive (the server enforces both directions too).
  const { enabled: showActiveStatus } = useActiveStatusSetting(userId);
  const shouldTrack = Boolean(userId) && showActiveStatus === true;
  useEffect(() => {
    const presence = container.onlinePresence;
    if (!userId || !shouldTrack) {
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
  }, [userId, shouldTrack]);
}

/** True while `userId` is tracked on presence:online. */
export function useIsOnline(userId: string | null | undefined): boolean {
  const presence = container.onlinePresence;
  const subscribe = useCallback((onChange: () => void) => presence.subscribe(onChange), [presence]);
  const read = useCallback(() => presence.isOnline(userId), [presence, userId]);
  return useSyncExternalStore(subscribe, read, () => false);
}
