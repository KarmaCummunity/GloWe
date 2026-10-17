import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('expo-constants', () => ({
  default: { expoConfig: { extra: {} } },
}));

describe('posthog observability', () => {
  beforeEach(() => {
    (globalThis as { __DEV__?: boolean }).__DEV__ = false;
  });

  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it('hasPosthogKey is false without EXPO_PUBLIC_POSTHOG_KEY', async () => {
    vi.stubEnv('EXPO_PUBLIC_POSTHOG_KEY', '');
    const mod = await import('../posthog');
    expect(mod.hasPosthogKey()).toBe(false);
    await mod.initPosthog();
    expect(mod.isPosthogInitialised()).toBe(false);
    expect(mod.getPosthogIfInit()).toBeNull();
  });

  it('capturePosthog is a no-op when not initialised', async () => {
    vi.stubEnv('EXPO_PUBLIC_POSTHOG_KEY', '');
    const mod = await import('../posthog');
    expect(() => mod.capturePosthog('signup', { method: 'email' })).not.toThrow();
  });
});
