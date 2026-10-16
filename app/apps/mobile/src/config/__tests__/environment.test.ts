import { afterEach, describe, expect, it } from 'vitest';
import { getAppEnvironment, isDevEnvironment } from '../environment';

const ORIGINAL = process.env.EXPO_PUBLIC_ENVIRONMENT;

afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.EXPO_PUBLIC_ENVIRONMENT;
  else process.env.EXPO_PUBLIC_ENVIRONMENT = ORIGINAL;
});

describe('getAppEnvironment', () => {
  it('returns development when EXPO_PUBLIC_ENVIRONMENT=development', () => {
    process.env.EXPO_PUBLIC_ENVIRONMENT = 'development';
    expect(getAppEnvironment()).toBe('development');
  });

  it('defaults to production when unset', () => {
    delete process.env.EXPO_PUBLIC_ENVIRONMENT;
    expect(getAppEnvironment()).toBe('production');
  });
});

describe('isDevEnvironment', () => {
  it('mirrors getAppEnvironment', () => {
    process.env.EXPO_PUBLIC_ENVIRONMENT = 'development';
    expect(isDevEnvironment()).toBe(true);
    delete process.env.EXPO_PUBLIC_ENVIRONMENT;
    expect(isDevEnvironment()).toBe(false);
  });
});
