import type {
  DonationHistoryRow,
  DonationReceiptDetail,
  NonprofitPublicPage,
  StandingOrderRow,
  VerifiedNonprofitRow,
} from '@kc/domain';

export interface IPaymentsRepository {
  listVerifiedNonprofits(limit?: number): Promise<VerifiedNonprofitRow[]>;
  getNonprofitPublicPage(orgSlug: string): Promise<NonprofitPublicPage | null>;
  createDonationIntent(
    orgId: string,
    amountIls: number,
    idempotencyKey: string,
    listingId?: string | null,
  ): Promise<{ intentId: string; checkoutUrl: string | null; orgId: string; amountIls: number }>;
  completeSandboxDonation(intentId: string): Promise<{
    paymentId: string;
    receiptId: string | null;
    section46Serial: string | null;
  }>;
  createStandingOrder(
    orgId: string,
    amountIls: number,
    idempotencyKey: string,
  ): Promise<StandingOrderRow>;
  listMyStandingOrders(limit?: number): Promise<StandingOrderRow[]>;
  cancelStandingOrder(orderId: string): Promise<void>;
  pauseStandingOrder(orderId: string): Promise<void>;
  resumeStandingOrder(orderId: string): Promise<void>;
  listDonationHistory(limit?: number): Promise<DonationHistoryRow[]>;
  getDonationReceipt(paymentId: string): Promise<DonationReceiptDetail | null>;
}
