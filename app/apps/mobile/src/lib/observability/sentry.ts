/**
 * Mapped to docs/superpowers/specs/2026-05-25-app-performance-overhaul-design.md § Wave 0.
 *
 * Single entry point for Sentry SDK init. Other code MUST NOT call Sentry.init
 * directly.
 *
 * The SDK module (`@sentry/react-native`, ~250 KB minified) is loaded LAZILY
 * via `import()` only when a DSN is actually configured. Without a DSN the
 * SDK never enters the bundle on first paint — important because:
 *   1. Dev builds currently ship without a DSN.
 *   2. Even in prod, deferring the SDK past first paint shaves cold-start time.
 */
import Constants from 'expo-constants';

const DSN: string | undefined =
  (process.env.EXPO_PUBLIC_SENTRY_DSN as string | undefined) ??
  (Constants.expoConfig?.extra as { sentryDsn?: string } | undefined)?.sentryDsn;

type Env = 'dev' | 'prod';
/**
 * Environment comes from the EAS build profile (eas.json sets
 * EXPO_PUBLIC_ENVIRONMENT=production only on the `production` profile),
 * falling back to the EAS Update channel. Everything else reports as `dev`.
 */
function detectEnv(): Env {
  const profileEnv = process.env.EXPO_PUBLIC_ENVIRONMENT;
  if (profileEnv) return profileEnv === 'production' ? 'prod' : 'dev';
  const channel = (Constants.expoConfig?.updates as { requestHeaders?: Record<string, string> } | undefined)
    ?.requestHeaders?.['expo-channel-name'];
  return channel === 'production' ? 'prod' : 'dev';
}

export function hasDsn(): boolean {
  return Boolean(DSN);
}

let initialised = false;
let sentryModule: typeof import('@sentry/react-native') | null = null;

export async function initSentry(): Promise<void> {
  if (initialised) return;
  if (!DSN) {
    if (__DEV__) console.warn('[observability] Sentry DSN missing — skipping init');
    return;
  }
  try {
    const mod = await import('@sentry/react-native');
    const env = detectEnv();
    mod.init({
      dsn: DSN,
      environment: env,
      enableAutoSessionTracking: true,
      // Shared kupay-hb free quota: keep prod tracing <= 0.1 (shared-dev conventions).
      tracesSampleRate: env === 'prod' ? 0.1 : 1.0,
      enableNativeFramesTracking: true,
    });
    sentryModule = mod;
    initialised = true;
  } catch (err) {
    if (__DEV__) console.warn('[observability] Sentry init failed', err);
  }
}

export function isInitialised(): boolean {
  return initialised;
}

export function getSentryIfInit(): typeof import('@sentry/react-native') | null {
  return initialised ? sentryModule : null;
}
