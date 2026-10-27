import type { IMarketplaceRepository } from '../ports/IMarketplaceRepository';
import type { GivingHandoffSnapshot, MyGivingHandoffRow } from '@kc/domain';

export class GetListingHandoffUseCase {
  constructor(private readonly repo: IMarketplaceRepository) {}
  execute(listingId: string) {
    return this.repo.getListingHandoff(listingId);
  }
}

export class ListMyGivingHandoffsUseCase {
  constructor(private readonly repo: IMarketplaceRepository) {}
  execute(limit?: number): Promise<MyGivingHandoffRow[]> {
    return this.repo.listMyGivingHandoffs(limit);
  }
}

export class ReserveItemGivingUseCase {
  constructor(private readonly repo: IMarketplaceRepository) {}
  execute(
    listingId: string,
    pickupMode?: 'pickup' | 'delivery',
    pickupWindowStart?: string | null,
    pickupWindowEnd?: string | null,
  ): Promise<GivingHandoffSnapshot> {
    return this.repo.reserveItemGiving(listingId, pickupMode, pickupWindowStart, pickupWindowEnd);
  }
}

export class ConfirmItemHandoffUseCase {
  constructor(private readonly repo: IMarketplaceRepository) {}
  execute(handoffId: string): Promise<GivingHandoffSnapshot> {
    return this.repo.confirmItemHandoff(handoffId);
  }
}

export class ClaimFoodGivingUseCase {
  constructor(private readonly repo: IMarketplaceRepository) {}
  execute(
    listingId: string,
    pickupWindowStart?: string | null,
    pickupWindowEnd?: string | null,
  ): Promise<GivingHandoffSnapshot> {
    return this.repo.claimFoodGiving(listingId, pickupWindowStart, pickupWindowEnd);
  }
}

export class CancelGivingHandoffUseCase {
  constructor(private readonly repo: IMarketplaceRepository) {}
  async execute(handoffId: string): Promise<void> {
    await this.repo.cancelGivingHandoff(handoffId);
  }
}

export class MarkGivingHandedOverUseCase {
  constructor(private readonly repo: IMarketplaceRepository) {}
  execute(handoffId: string): Promise<GivingHandoffSnapshot> {
    return this.repo.markGivingHandedOver(handoffId);
  }
}

export class RateGivingHandoffUseCase {
  constructor(private readonly repo: IMarketplaceRepository) {}
  async execute(handoffId: string, rating: number, comment?: string | null): Promise<void> {
    await this.repo.rateGivingHandoff(handoffId, rating, comment);
  }
}
