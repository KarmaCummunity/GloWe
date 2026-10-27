import { describe, expect, it, vi } from 'vitest';
import { OrgApplicationError } from '@kc/domain';
import { DecideOrgApplicationUseCase } from '../DecideOrgApplicationUseCase';
import type { IOrgApplicationsRepository } from '../IOrgApplicationsRepository';

function makeRepo(): IOrgApplicationsRepository & {
  approve: ReturnType<typeof vi.fn>;
  reject: ReturnType<typeof vi.fn>;
  list: ReturnType<typeof vi.fn>;
} {
  return {
    approve: vi.fn(async () => undefined),
    reject:  vi.fn(async () => undefined),
    list:    vi.fn(async () => ({ rows: [], totalCount: 0 })),
  };
}

describe('DecideOrgApplicationUseCase', () => {
  it('throws when applicationId is missing', async () => {
    const repo = makeRepo();
    const uc = new DecideOrgApplicationUseCase(repo);
    await expect(uc.execute({ applicationId: '', approve: true })).rejects.toBeInstanceOf(OrgApplicationError);
    expect(repo.approve).not.toHaveBeenCalled();
    expect(repo.reject).not.toHaveBeenCalled();
  });

  it('calls approve with a note when approve=true', async () => {
    const repo = makeRepo();
    const uc = new DecideOrgApplicationUseCase(repo);
    await uc.execute({ applicationId: 'a1', approve: true, note: 'looks good' });
    expect(repo.approve).toHaveBeenCalledWith('a1', 'looks good');
    expect(repo.reject).not.toHaveBeenCalled();
  });

  it('calls approve with null when no note is given', async () => {
    const repo = makeRepo();
    const uc = new DecideOrgApplicationUseCase(repo);
    await uc.execute({ applicationId: 'a1', approve: true });
    expect(repo.approve).toHaveBeenCalledWith('a1', null);
  });

  it('calls reject when approve=false', async () => {
    const repo = makeRepo();
    const uc = new DecideOrgApplicationUseCase(repo);
    await uc.execute({ applicationId: 'a2', approve: false, note: 'no fit' });
    expect(repo.reject).toHaveBeenCalledWith('a2', 'no fit');
    expect(repo.approve).not.toHaveBeenCalled();
  });
});
