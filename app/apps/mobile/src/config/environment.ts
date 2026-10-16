// Single source for app-wide environment detection.
//
// Read lazily (per call) instead of caching at module load: keeps the
// helper trivially testable (no module-cache resets needed) and the cost
// of one process.env lookup per render is negligible.
//
// Fail-safe to "production": if the env var is missing or has an unknown
// value we treat it as prod. Better to under-warn than to over-warn a
// real production user.

export type AppEnvironment = 'development' | 'production';

export function getAppEnvironment(): AppEnvironment {
  const raw =
    typeof process !== 'undefined'
      ? process.env['EXPO_PUBLIC_ENVIRONMENT']
      : undefined;
  return raw === 'development' ? 'development' : 'production';
}

export function isDevEnvironment(): boolean {
  return getAppEnvironment() === 'development';
}

/**
 * Gates the dev preview route at `/dev/shell-preview`. Defaults ON in dev
 * (set EXPO_PUBLIC_SHELL_V2=0 to disable), always OFF in production.
 *
 * The real desktop shell (AppShell in root _layout.tsx) is NOT gated by
 * this flag — it always branches on viewport width.
 */
export const SHELL_V2_ENABLED: boolean =
  typeof __DEV__ !== 'undefined' &&
  __DEV__ &&
  !(typeof process !== 'undefined' && process.env['EXPO_PUBLIC_SHELL_V2'] === '0');
