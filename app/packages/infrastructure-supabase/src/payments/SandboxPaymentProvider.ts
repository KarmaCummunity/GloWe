import type { IPaymentProvider, IPaymentsRepository, StartDonationCheckoutInput } from '@kc/application';
import type { CompletedDonation, DonationCheckoutResult } from '@kc/domain';

/** Mock provider — maps to DB sandbox slug (#850); no real network I/O. */
export class SandboxPaymentProvider implements IPaymentProvider {
  readonly slug = 'sandbox';

  constructor(private readonly repo: IPaymentsRepository) {}

  async startDonationCheckout(input: StartDonationCheckoutInput): Promise<DonationCheckoutResult> {
    const row = await this.repo.createDonationIntent(
      input.orgId,
      input.amountIls,
      input.idempotencyKey,
      input.listingId,
    );
    return {
      intentId: row.intentId,
      checkoutUrl: row.checkoutUrl,
      amountIls: row.amountIls,
      orgId: row.orgId,
      providerSlug: this.slug,
    };
  }

  async finalizeDonation(intentId: string): Promise<CompletedDonation> {
    const done = await this.repo.completeSandboxDonation(intentId);
    return {
      paymentId: done.paymentId,
      receiptId: done.receiptId,
      section46Serial: done.section46Serial,
      status: 'paid',
    };
  }
}
