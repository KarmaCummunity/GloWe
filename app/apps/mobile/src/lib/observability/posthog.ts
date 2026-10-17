/**
 * PostHog product analytics — lazy init, no-op without EXPO_PUBLIC_POSTHOG_KEY.
 * Never identify with email/phone; only opaque user ids when already authenticated.
 */
import Constants from 'expo-constants';

const KEY: string | undefined =
  (process.env.EXPO_PUBLIC_POSTHOG_KEY as string | undefined)?.trim() ||
  (Constants.expoConfig?.extra as { posthogKey?: string } | undefined)?.posthogKey?.trim();

const HOST: string =
  (process.env.EXPO_PUBLIC_POSTHOG_HOST as string | undefined)?.trim() ||
  'https://us.i.posthog.com';

type PostHogClient = {
  capture: (event: string, properties?: Record<string, unknown>) => void;
  screen: (name: string, properties?: Record<string, unknown>) => Promise<void>;
  identify: (distinctId: string, properties?: Record<string, unknown>) => void;
  reset: () => void;
};

let client: PostHogClient | null = null;
let initialised = false;

export function hasPosthogKey(): boolean {
  return Boolean(KEY);
}

export async function initPosthog(): Promise<void> {
  if (initialised) return;
  if (!KEY) {
    if (__DEV__) console.warn('[observability] PostHog key missing — skipping init');
    return;
  }
  try {
    const { PostHog } = await import('posthog-react-native');
    client = new PostHog(KEY, {
      host: HOST,
      // Capture app lifecycle; screen tracking is opt-in via captureScreen().
      captureAppLifecycleEvents: true,
    }) as unknown as PostHogClient;
    initialised = true;
  } catch (err) {
    if (__DEV__) console.warn('[observability] PostHog init failed', err);
  }
}

export function isPosthogInitialised(): boolean {
  return initialised && client != null;
}

export function getPosthogIfInit(): PostHogClient | null {
  return initialised ? client : null;
}

export function capturePosthog(
  event: string,
  properties?: Record<string, unknown>,
): void {
  const ph = getPosthogIfInit();
  if (!ph) return;
  try {
    ph.capture(event, properties);
  } catch {
    /* never break product flows */
  }
}

export async function captureScreen(
  name: string,
  properties?: Record<string, unknown>,
): Promise<void> {
  const ph = getPosthogIfInit();
  if (!ph) return;
  try {
    await ph.screen(name, properties);
  } catch {
    /* ignore */
  }
}
