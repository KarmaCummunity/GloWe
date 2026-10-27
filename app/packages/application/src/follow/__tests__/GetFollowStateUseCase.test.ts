import { describe, it, expect } from 'vitest';
import { GetFollowStateUseCase } from '../GetFollowStateUseCase';
import { FollowFakeUserRepository } from './followFakeUserRepository';

const baseRaw = {
  target: { userId: 'u_target', privacyMode: 'Public' as const, accountStatus: 'active' as const },
  followingExists: false,
  pendingRequestExists: false,
  cooldownUntil: null,
};

describe('GetFollowStateUseCase', () => {
  it('returns "self" when viewer === target', async () => {
    const repo = new FollowFakeUserRepository();
    const uc = new GetFollowStateUseCase(repo);
    const out = await uc.execute({ viewerId: 'u_a', targetUserId: 'u_a' });
    expect(out.state).toBe('self');
  });

  it('returns "not_following_public" for a public target with no edge', async () => {
    const repo = new FollowFakeUserRepository();
    repo.followStateRaw = { ...baseRaw };
    const uc = new GetFollowStateUseCase(repo);
    const out = await uc.execute({ viewerId: 'u_a', targetUserId: 'u_b' });
    expect(out.state).toBe('not_following_public');
  });

  it('returns "following" when edge exists (regardless of privacy mode)', async () => {
    const repo = new FollowFakeUserRepository();
    repo.followStateRaw = { ...baseRaw, followingExists: true };
    const uc = new GetFollowStateUseCase(repo);
    const out = await uc.execute({ viewerId: 'u_a', targetUserId: 'u_b' });
    expect(out.state).toBe('following');
  });

  it('returns "not_following_private_no_request" for private target with no edge / pending / cooldown', async () => {
    const repo = new FollowFakeUserRepository();
    repo.followStateRaw = {
      ...baseRaw,
      target: { ...baseRaw.target, privacyMode: 'Private' as const },
    };
    const uc = new GetFollowStateUseCase(repo);
    const out = await uc.execute({ viewerId: 'u_a', targetUserId: 'u_b' });
    expect(out.state).toBe('not_following_private_no_request');
  });

  it('returns "request_pending" when a pending request exists', async () => {
    const repo = new FollowFakeUserRepository();
    repo.followStateRaw = {
      ...baseRaw,
      target: { ...baseRaw.target, privacyMode: 'Private' as const },
      pendingRequestExists: true,
    };
    const uc = new GetFollowStateUseCase(repo);
    const out = await uc.execute({ viewerId: 'u_a', targetUserId: 'u_b' });
    expect(out.state).toBe('request_pending');
  });

  it('returns "cooldown_after_reject" with cooldownUntil when active', async () => {
    const repo = new FollowFakeUserRepository();
    repo.followStateRaw = {
      ...baseRaw,
      target: { ...baseRaw.target, privacyMode: 'Private' as const },
      cooldownUntil: '2026-06-01T00:00:00Z',
    };
    const uc = new GetFollowStateUseCase(repo);
    const out = await uc.execute({ viewerId: 'u_a', targetUserId: 'u_b' });
    expect(out.state).toBe('cooldown_after_reject');
    expect(out.cooldownUntil).toBe('2026-06-01T00:00:00Z');
  });

  it('throws user_not_found when target is null', async () => {
    const repo = new FollowFakeUserRepository();
    repo.followStateRaw = { ...baseRaw, target: null };
    const uc = new GetFollowStateUseCase(repo);
    await expect(
      uc.execute({ viewerId: 'u_a', targetUserId: 'u_b' }),
    ).rejects.toMatchObject({ code: 'user_not_found' });
  });

  it('returns following when edge exists even if account is not active', async () => {
    const repo = new FollowFakeUserRepository();
    repo.followStateRaw = {
      ...baseRaw,
      target: { ...baseRaw.target, accountStatus: 'suspended_admin' },
      followingExists: true,
    };
    const uc = new GetFollowStateUseCase(repo);
    const out = await uc.execute({ viewerId: 'u_a', targetUserId: 'u_b' });
    expect(out.state).toBe('following');
    expect(out.followInteractionDisabled).toBeUndefined();
  });

  it('returns request_pending without followInteractionDisabled when private inactive has pending', async () => {
    const repo = new FollowFakeUserRepository();
    repo.followStateRaw = {
      ...baseRaw,
      target: { ...baseRaw.target, privacyMode: 'Private', accountStatus: 'pending_verification' },
      pendingRequestExists: true,
    };
    const uc = new GetFollowStateUseCase(repo);
    const out = await uc.execute({ viewerId: 'u_a', targetUserId: 'u_b' });
    expect(out.state).toBe('request_pending');
    expect(out.followInteractionDisabled).toBeUndefined();
  });

  it('returns not_following_public with followInteractionDisabled when target is not active', async () => {
    const repo = new FollowFakeUserRepository();
    repo.followStateRaw = {
      ...baseRaw,
      target: { ...baseRaw.target, accountStatus: 'suspended_admin' },
    };
    const uc = new GetFollowStateUseCase(repo);
    const out = await uc.execute({ viewerId: 'u_a', targetUserId: 'u_b' });
    expect(out.state).toBe('not_following_public');
    expect(out.followInteractionDisabled).toBe(true);
  });

  it('returns not_following_private_no_request with followInteractionDisabled when private and not active', async () => {
    const repo = new FollowFakeUserRepository();
    repo.followStateRaw = {
      ...baseRaw,
      target: { ...baseRaw.target, privacyMode: 'Private', accountStatus: 'pending_verification' },
    };
    const uc = new GetFollowStateUseCase(repo);
    const out = await uc.execute({ viewerId: 'u_a', targetUserId: 'u_b' });
    expect(out.state).toBe('not_following_private_no_request');
    expect(out.followInteractionDisabled).toBe(true);
  });
});
