import { describe, expect, it, afterEach, vi } from 'vitest';
import { Platform } from 'react-native';
import { rootStackScreenAnimation } from '../rootStackAnimation';

describe('rootStackScreenAnimation', () => {
  const origPlatform = Platform.OS;

  afterEach(() => {
    (Platform as { OS: typeof Platform.OS }).OS = origPlatform;
  });

  it('returns fade on web', () => {
    (Platform as { OS: typeof Platform.OS }).OS = 'web';
    expect(rootStackScreenAnimation()).toBe('fade');
  });

  it('returns slide_from_right on android', () => {
    (Platform as { OS: typeof Platform.OS }).OS = 'android';
    expect(rootStackScreenAnimation()).toBe('slide_from_right');
  });

  it('returns default on ios', () => {
    (Platform as { OS: typeof Platform.OS }).OS = 'ios';
    expect(rootStackScreenAnimation()).toBe('default');
  });
});

describe('rootStackGestureEnabled', () => {
  const origPlatform = Platform.OS;

  afterEach(() => {
    (Platform as { OS: typeof Platform.OS }).OS = origPlatform;
    vi.resetModules();
  });

  it('is false on web', async () => {
    (Platform as { OS: typeof Platform.OS }).OS = 'web';
    vi.resetModules();
    const mod = await import('../rootStackAnimation');
    expect(mod.rootStackGestureEnabled).toBe(false);
  });

  it('is true on native', async () => {
    (Platform as { OS: typeof Platform.OS }).OS = 'ios';
    vi.resetModules();
    const mod = await import('../rootStackAnimation');
    expect(mod.rootStackGestureEnabled).toBe(true);
  });
});
