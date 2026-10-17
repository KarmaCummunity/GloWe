import { describe, it, expect, vi } from 'vitest';
import type { IMarketplaceRepository } from '../../ports/IMarketplaceRepository';
import {
  CancelGivingHandoffUseCase,
  ClaimFoodGivingUseCase,
  ConfirmItemHandoffUseCase,
  GetListingHandoffUseCase,
  ListMyGivingHandoffsUseCase,
  MarkGivingHandedOverUseCase,
  RateGivingHandoffUseCase,
  ReserveItemGivingUseCase,
} from '../givingHandoffUseCases';

const snap = { handoffId: 'h1' };

function makeRepo() {
  return {
    getListingHandoff: vi.fn(async () => null),
    listMyGivingHandoffs: vi.fn(async () => []),
    reserveItemGiving: vi.fn(async () => snap),
    confirmItemHandoff: vi.fn(async () => snap),
    claimFoodGiving: vi.fn(async () => snap),
    cancelGivingHandoff: vi.fn(async () => undefined),
    markGivingHandedOver: vi.fn(async () => snap),
    rateGivingHandoff: vi.fn(async () => undefined),
  };
}

describe('giving handoff use cases', () => {
  it('delegate to the marketplace repository', async () => {
    const repo = makeRepo();
    const r = repo as unknown as IMarketplaceRepository;
    expect(await new GetListingHandoffUseCase(r).execute('l1')).toBeNull();
    expect(repo.getListingHandoff).toHaveBeenCalledWith('l1');
    expect(await new ListMyGivingHandoffsUseCase(r).execute(5)).toEqual([]);
    expect(repo.listMyGivingHandoffs).toHaveBeenCalledWith(5);
    expect(await new ReserveItemGivingUseCase(r).execute('l1', 'delivery', 'a', 'b')).toBe(snap);
    expect(repo.reserveItemGiving).toHaveBeenCalledWith('l1', 'delivery', 'a', 'b');
    expect(await new ConfirmItemHandoffUseCase(r).execute('h1')).toBe(snap);
    expect(await new ClaimFoodGivingUseCase(r).execute('l1', 'a', null)).toBe(snap);
    expect(repo.claimFoodGiving).toHaveBeenCalledWith('l1', 'a', null);
    await new CancelGivingHandoffUseCase(r).execute('h1');
    expect(repo.cancelGivingHandoff).toHaveBeenCalledWith('h1');
    expect(await new MarkGivingHandedOverUseCase(r).execute('h1')).toBe(snap);
    await new RateGivingHandoffUseCase(r).execute('h1', 5, 'great');
    expect(repo.rateGivingHandoff).toHaveBeenCalledWith('h1', 5, 'great');
  });
});
