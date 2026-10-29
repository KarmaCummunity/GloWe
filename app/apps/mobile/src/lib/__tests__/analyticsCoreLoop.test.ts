import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('expo-constants', () => ({
  default: { expoConfig: { extra: {} } },
}));

vi.mock('../observability/posthog', () => ({
  capturePosthog: vi.fn(),
}));

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(async () => null),
    setItem: vi.fn(async () => undefined),
  },
}));

describe('trackCoreLoop', () => {
  beforeEach(() => {
    (globalThis as { __DEV__?: boolean }).__DEV__ = false;
  });

  afterEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it('adds city segment from cityId', async () => {
    const { trackCoreLoop } = await import('../analyticsCoreLoop');
    const { capturePosthog } = await import('../observability/posthog');
    trackCoreLoop('listing_created', { world: 'items', cityId: '7000' });
    expect(capturePosthog).toHaveBeenCalledWith('listing_created', {
      world: 'items',
      city: 'lod',
    });
  });
});
