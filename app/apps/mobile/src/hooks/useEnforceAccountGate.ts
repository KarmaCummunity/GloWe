// FR-MOD-010 AC4 — sign-in + periodic mid-session enforcement + fetch-level ban detection.
import { useEffect, useRef } from 'react';
import { useRouter, type Href } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { container, supabase } from '../lib/container';
import { useAuthStore } from '../store/authStore';
import { setOnForbiddenCallback } from '@kc/infrastructure-supabase';
import { performFullSignOut } from '../services/performFullSignOut';

const RECHECK_MS = 60_000;

export function useEnforceAccountGate(userId: string | null) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const signOutLocal = useAuthStore((s) => s.signOut);
  const enforcingRef = useRef(false);

  useEffect(() => {
    if (!userId) {
      enforcingRef.current = false;
      setOnForbiddenCallback(null);
      return;
    }

    let cancelled = false;

    const check = async () => {
      if (cancelled || enforcingRef.current) return;
      try {
        const result = await container.checkAccountGate.execute({ userId });
        if (cancelled || result.allowed) return;
        enforcingRef.current = true;
        if ((result.reason as string | undefined) === 'pending_verification') {
          await performFullSignOut({
            deviceRepo: container.deviceRepo,
            queryClient,
            signOutLocal,
          });
          router.replace('/(auth)/sign-in');
          return;
        }
        await performFullSignOut({
          deviceRepo: container.deviceRepo,
          queryClient,
          signOutLocal,
        });
        router.replace({
          pathname: '/account-blocked',
          params: {
            reason: result.reason ?? 'banned',
            until: result.until ?? '',
          },
        } as unknown as Href);
      } catch {
        // Network failure is best-effort — the next interval tick retries.
      }
    };

    setOnForbiddenCallback(() => { void check(); });

    void check();
    const id = setInterval(() => void check(), RECHECK_MS);

    return () => {
      cancelled = true;
      clearInterval(id);
      setOnForbiddenCallback(null);
    };
  }, [userId, signOutLocal, router, queryClient]);
}
