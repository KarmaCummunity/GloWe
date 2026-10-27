import type { CompletedDonation, DonationCheckoutResult } from '@kc/domain';

export interface StartDonationCheckoutInput {
  readonly orgId: string;
  readonly amountIls: number;
  readonly idempotencyKey: string;
  readonly listingId?: string | null;
}

/** Provider-agnostic checkout (hosted fields, redirect, etc.). */
export interface IPaymentProvider {
  readonly slug: string;
  startDonationCheckout(input: StartDonationCheckoutInput): Promise<DonationCheckoutResult>;
  finalizeDonation(intentId: string): Promise<CompletedDonation>;
}
