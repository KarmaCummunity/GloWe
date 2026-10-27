import { describe, it, expect } from 'vitest';
import { AdminRemoveListingUseCase } from '../AdminRemoveListingUseCase';
import { FakeModerationAdminRepository } from './fakeModerationAdminRepository';

describe('AdminRemoveListingUseCase', () => {
  it('forwards listingId to repo.removeListing', async () => {
    const repo = new FakeModerationAdminRepository();
    await new AdminRemoveListingUseCase(repo).execute({ listingId: 'l_1' });
    expect(repo.removeListingCalls).toEqual(['l_1']);
  });
});
