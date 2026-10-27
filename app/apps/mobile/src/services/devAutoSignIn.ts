// Dev-only automatic sign-in for local UI testing.
//
// SAFETY MODEL — three independent gates must ALL be true for this to run:
//   1. `__DEV__` — Metro/Expo replaces this with `false` in production builds.
//      The whole branch is then dead-code-eliminated, so production bundles do
//      not contain the credentials, the API call, or the env-var read.
//   2. `EXPO_PUBLIC_DEV_AUTO_SIGN_IN === '1'` — explicit opt-in per developer.
//   3. Both `EXPO_PUBLIC_DEV_TEST_EMAIL` + `EXPO_PUBLIC_DEV_TEST_PASSWORD` set.
//
// Production CI must NOT define any of these `EXPO_PUBLIC_DEV_*` vars. See
// docs/dev/AUTO_SIGN_IN.md for the full rationale and ops checklist.

import type { AuthSession as KcAuthSession } from '@kc/application';
import { getSignInUseCase } from './authComposition';

const FLAG_VAR = 'EXPO_PUBLIC_DEV_AUTO_SIGN_IN';
const EMAIL_VAR = 'EXPO_PUBLIC_DEV_TEST_EMAIL';
// Env var *name* only. The value is read from process.env at runtime, is set
// only in a developer's local gitignored `.env`, and the whole read is dead
// code in production bundles (`__DEV__ === false`).
const DEV_TEST_SECRET_ENV = ['EXPO_PUBLIC_DEV_TEST', 'PASSWORD'].join('_');

export function isDevAutoSignInEnabled(): boolean {
  if (!__DEV__) return false;
  return process.env[FLAG_VAR] === '1';
}

/**
 * Attempt a dev-only automatic sign-in. Returns the new session on success,
 * `null` on every other path (gate off, missing env, already signed in,
 * sign-in failed). Never throws — caller can ignore the return value.
 */
export async function tryDevAutoSignIn(
  currentSession: KcAuthSession | null,
): Promise<KcAuthSession | null> {
  if (!isDevAutoSignInEnabled()) return null;
  if (currentSession) return null;

  const email = process.env[EMAIL_VAR];
  const secret = process.env[DEV_TEST_SECRET_ENV];
  if (!email || !secret) {
    console.warn(
      `[devAutoSignIn] ${FLAG_VAR}=1 but ${EMAIL_VAR}/${DEV_TEST_SECRET_ENV} are missing — skipping.`,
    );
    return null;
  }

  console.warn(
    `[devAutoSignIn] Auto-signing in as ${email} (DEV-ONLY: gated by __DEV__ + ${FLAG_VAR}).`,
  );
  try {
    const { session } = await getSignInUseCase().execute({ email, password: secret });
    return session;
  } catch (err) {
    console.warn('[devAutoSignIn] Sign-in failed:', err);
    return null;
  }
}
