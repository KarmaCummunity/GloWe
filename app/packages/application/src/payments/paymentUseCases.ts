import type { IPaymentProvider } from '../ports/IPaymentProvider';
import type { IPaymentsRepository } from '../ports/IPaymentsRepository';
import type {
  CompletedDonation,
  DonationCheckoutResult,
  DonationHistoryRow,
  DonationReceiptDetail,
  NonprofitPublicPage,
  StandingOrderRow,
  VerifiedNonprofitRow,
} from '@kc/domain';

export class ListVerifiedNonprofitsUseCase {
  constructor(private readonly repo: IPaymentsRepository) {}
  execute(limit?: number): Promise<VerifiedNonprofitRow[]> {
    return this.repo.listVerifiedNonprofits(limit);
  }
}

export class GetNonprofitPublicPageUseCase {
  constructor(private readonly repo: IPaymentsRepository) {}
  execute(orgSlug: string): Promise<NonprofitPublicPage | null> {
    return this.repo.getNonprofitPublicPage(orgSlug);
  }
}

export class DonateNowUseCase {
  constructor(private readonly provider: IPaymentProvider) {}
  execute(input: {
    orgId: string;
    amountIls: number;
    idempotencyKey: string;
    listingId?: string | null;
  }): Promise<DonationCheckoutResult> {
    return this.provider.startDonationCheckout(input);
  }
}

export class ConfirmDonationUseCase {
  constructor(private readonly provider: IPaymentProvider) {}
  execute(intentId: string): Promise<CompletedDonation> {
    return this.provider.finalizeDonation(intentId);
  }
}

export class CreateStandingOrderUseCase {
  constructor(private readonly repo: IPaymentsRepository) {}
  execute(input: { orgId: string; amountIls: number; idempotencyKey: string }): Promise<StandingOrderRow> {
    return this.repo.createStandingOrder(input.orgId, input.amountIls, input.idempotencyKey);
  }
}

export class ListMyStandingOrdersUseCase {
  constructor(private readonly repo: IPaymentsRepository) {}
  execute(limit?: number): Promise<StandingOrderRow[]> {
    return this.repo.listMyStandingOrders(limit);
  }
}

export class CancelStandingOrderUseCase {
  constructor(private readonly repo: IPaymentsRepository) {}
  async execute(orderId: string): Promise<void> {
    await this.repo.cancelStandingOrder(orderId);
  }
}

export class PauseStandingOrderUseCase {
  constructor(private readonly repo: IPaymentsRepository) {}
  async execute(orderId: string): Promise<void> {
    await this.repo.pauseStandingOrder(orderId);
  }
}

export class ResumeStandingOrderUseCase {
  constructor(private readonly repo: IPaymentsRepository) {}
  async execute(orderId: string): Promise<void> {
    await this.repo.resumeStandingOrder(orderId);
  }
}

export class ListDonationHistoryUseCase {
  constructor(private readonly repo: IPaymentsRepository) {}
  execute(limit?: number): Promise<DonationHistoryRow[]> {
    return this.repo.listDonationHistory(limit);
  }
}

export class GetDonationReceiptUseCase {
  constructor(private readonly repo: IPaymentsRepository) {}
  execute(paymentId: string): Promise<DonationReceiptDetail | null> {
    return this.repo.getDonationReceipt(paymentId);
  }
}
