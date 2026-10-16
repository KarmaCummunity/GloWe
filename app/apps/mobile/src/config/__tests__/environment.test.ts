import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getAppEnvironment, isDevEnvironment } from '../environment';

describe('environment config', () => {
  const original = process.env['EXPO_PUBLIC_ENVIRONMENT'];

  beforeEach(() => {
    delete process.env['EXPO_PUBLIC_ENVIRONMENT'];
  });

  afterEach(() => {
    if (original === undefined) {
      delete process.env['EXPO_PUBLIC_ENVIRONMENT'];
    } else {
      process.env['EXPO_PUBLIC_ENVIRONMENT'] = original;
    }
  });

  it('reports development when env var is "development"', () => {
    process.env['EXPO_PUBLIC_ENVIRONMENT'] = 'development';
    expect(getAppEnvironment()).toBe('development');
    expect(isDevEnvironment()).toBe(true);
  });

  it('reports production when env var is "production"', () => {
    process.env['EXPO_PUBLIC_ENVIRONMENT'] = 'production';
    expect(getAppEnvironment()).toBe('production');
    expect(isDevEnvironment()).toBe(false);
  });

  it('defaults to production when env var is missing', () => {
    expect(getAppEnvironment()).toBe('production');
    expect(isDevEnvironment()).toBe(false);
  });

  it('treats unknown values as production (fail-safe)', () => {
    process.env['EXPO_PUBLIC_ENVIRONMENT'] = 'staging';
    expect(getAppEnvironment()).toBe('production');
    expect(isDevEnvironment()).toBe(false);
  });
});
