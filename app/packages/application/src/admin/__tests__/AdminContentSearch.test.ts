import { describe, expect, it, vi } from 'vitest';
import type {
  AdminSearchPage, AdminUserSearchResult,
} from '@kc/domain';
import { AdminSearchUsersUseCase } from '../AdminSearchUsersUseCase';
import { AdminSearchPostsUseCase } from '../AdminSearchPostsUseCase';
import { AdminSearchAuditUseCase } from '../AdminSearchAuditUseCase';
import type { IAdminContentRepository } from '../IAdminContentRepository';

function fakeRepo(overrides: Partial<IAdminContentRepository> = {}): IAdminContentRepository {
  return {
    searchUsers: vi.fn(async () => ({ rows: [], totalCount: 0 })),
    searchPosts: vi.fn(async () => ({ rows: [], totalCount: 0 })),
    searchAudit: vi.fn(async () => ({ rows: [], totalCount: 0 })),
    ...overrides,
  };
}

describe('AdminSearchUsersUseCase', () => {
  it('forwards filters and returns the repo page', async () => {
    const repo = fakeRepo();
    const uc = new AdminSearchUsersUseCase(repo);
    await uc.execute({ query: 'אל', status: 'banned', limit: 10, offset: 20 });
    expect(repo.searchUsers).toHaveBeenCalledWith({
      query: 'אל', status: 'banned', limit: 10, offset: 20,
    });
  });

  it('returns the repo result verbatim', async () => {
    const page: AdminSearchPage<AdminUserSearchResult> = {
      rows: [{
        userId: 'u1', displayName: 'A', shareHandle: null, accountStatus: 'active',
        cityName: null, createdAt: new Date(), lastSeenAt: null,
      }],
      totalCount: 1,
    };
    const repo = fakeRepo({ searchUsers: vi.fn(async () => page) });
    const uc = new AdminSearchUsersUseCase(repo);
    expect(await uc.execute({})).toBe(page);
  });
});

describe('AdminSearchPostsUseCase', () => {
  it('passes filters straight through', async () => {
    const repo = fakeRepo();
    const uc = new AdminSearchPostsUseCase(repo);
    await uc.execute({ query: 'help', status: 'open' });
    expect(repo.searchPosts).toHaveBeenCalledWith({ query: 'help', status: 'open' });
  });
});

describe('AdminSearchAuditUseCase', () => {
  it('passes filters straight through', async () => {
    const repo = fakeRepo();
    const uc = new AdminSearchAuditUseCase(repo);
    await uc.execute({ targetUserId: 'u1', action: 'ban_user' });
    expect(repo.searchAudit).toHaveBeenCalledWith({ targetUserId: 'u1', action: 'ban_user' });
  });

  it('handles empty filter object', async () => {
    const repo = fakeRepo();
    const uc = new AdminSearchAuditUseCase(repo);
    const r = await uc.execute({});
    expect(repo.searchAudit).toHaveBeenCalledWith({});
    expect(r.rows).toEqual([]);
    expect(r.totalCount).toBe(0);
  });
});
