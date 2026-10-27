import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const execute = vi.fn();
vi.mock('../authComposition', () => ({ getSignInUseCase: () => ({ execute }) }));

import { isDevAutoSignInEnabled, tryDevAutoSignIn } from '../devAutoSignIn';

const g = globalThis as unknown as { __DEV__: boolean };
const ENV_KEYS = [
  'EXPO_PUBLIC_DEV_AUTO_SIGN_IN',
  'EXPO_PUBLIC_DEV_TEST_EMAIL',
  ['EXPO_PUBLIC_DEV_TEST', 'PASSWORD'].join('_'),
];

function setEnv(values: [string, string, string]) {
  ENV_KEYS.forEach((k, i) => {
    process.env[k] = values[i];
  });
}

describe('devAutoSignIn', () => {
  beforeEach(() => {
    execute.mockReset();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    ENV_KEYS.forEach((k) => delete process.env[k]);
    vi.restoreAllMocks();
  });

  it('is disabled in production builds even when every env var is set', async () => {
    g.__DEV__ = false;
    setEnv(['1', 'dev@example.test', 'x']);
    expect(isDevAutoSignInEnabled()).toBe(false);
    expect(await tryDevAutoSignIn(null)).toBeNull();
    expect(execute).not.toHaveBeenCalled();
  });

  it('requires the explicit opt-in flag in dev', async () => {
    g.__DEV__ = true;
    setEnv(['0', 'dev@example.test', 'x']);
    expect(await tryDevAutoSignIn(null)).toBeNull();
    expect(execute).not.toHaveBeenCalled();
  });

  it('skips when credentials env is missing', async () => {
    g.__DEV__ = true;
    process.env.EXPO_PUBLIC_DEV_AUTO_SIGN_IN = '1';
    expect(await tryDevAutoSignIn(null)).toBeNull();
    expect(execute).not.toHaveBeenCalled();
  });

  it('signs in with env-provided credentials only in dev + opt-in', async () => {
    g.__DEV__ = true;
    setEnv(['1', 'dev@example.test', 'x']);
    execute.mockResolvedValue({ session: { userId: 'u1' } });
    expect(await tryDevAutoSignIn(null)).toEqual({ userId: 'u1' });
    expect(execute).toHaveBeenCalledWith({ email: 'dev@example.test', password: 'x' });
  });

  it('never throws on sign-in failure', async () => {
    g.__DEV__ = true;
    setEnv(['1', 'dev@example.test', 'x']);
    execute.mockRejectedValue(new Error('nope'));
    expect(await tryDevAutoSignIn(null)).toBeNull();
  });
});
