import { describe, it, expect } from 'vitest';
import { ResendVerificationEmailUseCase } from '../ResendVerificationEmail';
import { AuthError } from '../errors';
import { FakeAuthService } from './fakeAuthService';

describe('ResendVerificationEmailUseCase', () => {
  it('calls auth.resendVerificationEmail with normalized email and the redirect URL', async () => {
    const auth = new FakeAuthService();
    const uc = new ResendVerificationEmailUseCase(auth);

    await uc.execute({ email: '  A@B.CO  ', emailRedirectTo: 'https://x/auth/verify' });

    expect(auth.resendCalls).toEqual([
      { email: 'a@b.co', emailRedirectTo: 'https://x/auth/verify' },
    ]);
  });

  it('rejects malformed email before hitting the adapter', async () => {
    const auth = new FakeAuthService();
    const uc = new ResendVerificationEmailUseCase(auth);

    await expect(uc.execute({ email: 'no-at' })).rejects.toMatchObject({
      code: 'invalid_email',
    } satisfies Partial<AuthError>);
    expect(auth.resendCalls).toHaveLength(0);
  });

  it('rejects over-long input before running validation', async () => {
    const auth = new FakeAuthService();
    const uc = new ResendVerificationEmailUseCase(auth);
    const email = `${'a'.repeat(250)}@b.co`;

    await expect(uc.execute({ email })).rejects.toMatchObject({ code: 'invalid_email' });
    expect(auth.resendCalls).toHaveLength(0);
  });

  it.each(['a@b', '@b.co', 'a@@b.co', 'a@b.', 'a b@c.co', 'a@.co'])('rejects %s', async (email) => {
    const auth = new FakeAuthService();
    await expect(new ResendVerificationEmailUseCase(auth).execute({ email })).rejects.toMatchObject({
      code: 'invalid_email',
    });
  });
});
