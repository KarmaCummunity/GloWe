import { describe, it, expect, vi } from 'vitest';
import type { IPaymentProvider } from '../../ports/IPaymentProvider';
import type { IPaymentsRepository } from '../../ports/IPaymentsRepository';
import {
  CancelStandingOrderUseCase,
  ConfirmDonationUseCase,
  CreateStandingOrderUseCase,
  DonateNowUseCase,
  GetDonationReceiptUseCase,
  GetNonprofitPublicPageUseCase,
  ListDonationHistoryUseCase,
  ListMyStandingOrdersUseCase,
  ListVerifiedNonprofitsUseCase,
  PauseStandingOrderUseCase,
  ResumeStandingOrderUseCase,
} from '../paymentUseCases';

function makeRepo() {
  return {
    listVerifiedNonprofits: vi.fn(async () => []),
    getNonprofitPublicPage: vi.fn(async () => null),
    createDonationIntent: vi.fn(),
    completeSandboxDonation: vi.fn(),
    createStandingOrder: vi.fn(async () => ({ orderId: 'o1' })),
    listMyStandingOrders: vi.fn(async () => []),
    cancelStandingOrder: vi.fn(async () => undefined),
    pauseStandingOrder: vi.fn(async () => undefined),
    resumeStandingOrder: vi.fn(async () => undefined),
    listDonationHistory: vi.fn(async () => []),
    getDonationReceipt: vi.fn(async () => null),
  } as unknown as IPaymentsRepository & Record<string, ReturnType<typeof vi.fn>>;
}

describe('payment use cases', () => {
  it('delegate read use cases to the repository', async () => {
    const repo = makeRepo();
    await new ListVerifiedNonprofitsUseCase(repo).execute(5);
    await new GetNonprofitPublicPageUseCase(repo).execute('kc-org');
    await new ListMyStandingOrdersUseCase(repo).execute(3);
    await new ListDonationHistoryUseCase(repo).execute(7);
    await new GetDonationReceiptUseCase(repo).execute('p1');
    expect(repo.listVerifiedNonprofits).toHaveBeenCalledWith(5);
    expect(repo.getNonprofitPublicPage).toHaveBeenCalledWith('kc-org');
    expect(repo.listMyStandingOrders).toHaveBeenCalledWith(3);
    expect(repo.listDonationHistory).toHaveBeenCalledWith(7);
    expect(repo.getDonationReceipt).toHaveBeenCalledWith('p1');
  });

  it('delegate standing order lifecycle to the repository', async () => {
    const repo = makeRepo();
    expect(
      await new CreateStandingOrderUseCase(repo).execute({ orgId: 'org', amountIls: 50, idempotencyKey: 'k' }),
    ).toEqual({ orderId: 'o1' });
    await new CancelStandingOrderUseCase(repo).execute('o1');
    await new PauseStandingOrderUseCase(repo).execute('o1');
    await new ResumeStandingOrderUseCase(repo).execute('o1');
    expect(repo.createStandingOrder).toHaveBeenCalledWith('org', 50, 'k');
    expect(repo.cancelStandingOrder).toHaveBeenCalledWith('o1');
    expect(repo.pauseStandingOrder).toHaveBeenCalledWith('o1');
    expect(repo.resumeStandingOrder).toHaveBeenCalledWith('o1');
  });

  it('delegate checkout to the payment provider', async () => {
    const provider = {
      slug: 'sandbox',
      startDonationCheckout: vi.fn(async () => ({ intentId: 'i1' })),
      finalizeDonation: vi.fn(async () => ({ paymentId: 'p1' })),
    } as unknown as IPaymentProvider;
    const input = { orgId: 'org', amountIls: 18, idempotencyKey: 'k', listingId: null };
    expect(await new DonateNowUseCase(provider).execute(input)).toEqual({ intentId: 'i1' });
    expect(await new ConfirmDonationUseCase(provider).execute('i1')).toEqual({ paymentId: 'p1' });
    expect(provider.startDonationCheckout).toHaveBeenCalledWith(input);
    expect(provider.finalizeDonation).toHaveBeenCalledWith('i1');
  });
});
