import { describe, it, expect } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SupabasePaymentsRepository } from '../SupabasePaymentsRepository';
import { SandboxPaymentProvider } from '../SandboxPaymentProvider';

type Result = { data: unknown; error: unknown };

function makeRepo(results: Record<string, Result>) {
  const calls: Array<{ fn: string; args: unknown }> = [];
  const client = {
    rpc: async (fn: string, args: unknown) => {
      calls.push({ fn, args });
      return results[fn] ?? { data: null, error: null };
    },
  } as unknown as SupabaseClient;
  return { repo: new SupabasePaymentsRepository(client as never), calls };
}

const ok = (data: unknown): Result => ({ data, error: null });
const fail: Result = { data: null, error: { message: 'boom' } };

const standing = {
  order_id: 'o1',
  org_id: 'org',
  amount_ils: '50.00',
  cadence: 'monthly',
  status: 'active',
  next_charge_at: null,
  created_at: '2026-10-17T00:00:00Z',
};

describe('SupabasePaymentsRepository — reads', () => {
  it('listVerifiedNonprofits maps rows and returns [] on error', async () => {
    const { repo } = makeRepo({
      list_verified_nonprofits: ok([
        { org_id: 'org', slug: 'kc', name: 'KC', tagline_he: null, tagline_en: 'Give', is_verified_nonprofit: true },
      ]),
    });
    expect(await repo.listVerifiedNonprofits()).toEqual([
      { orgId: 'org', slug: 'kc', name: 'KC', taglineHe: null, taglineEn: 'Give', isVerifiedNonprofit: true },
    ]);
    expect(await makeRepo({ list_verified_nonprofits: fail }).repo.listVerifiedNonprofits(3)).toEqual([]);
  });

  it('getNonprofitPublicPage maps campaigns and skips junk rows', async () => {
    const { repo } = makeRepo({
      get_nonprofit_public_page: ok({
        org_id: 'org',
        slug: 'kc',
        name: 'KC',
        tagline_he: 't',
        tagline_en: null,
        about_he: null,
        about_en: 'About',
        is_verified_nonprofit: true,
        total_raised_ils: '120.5',
        campaigns: [
          null,
          { listing_id: 'l1', title: 'Fund', summary: null, status: 'open', published_at: null, goal_ils: 1000 },
          { listing_id: 'l2', title: 'Two', summary: 's', status: 'open', published_at: 'p', raised_ils: 5 },
        ],
      }),
    });
    const page = await repo.getNonprofitPublicPage('kc');
    expect(page).toMatchObject({ orgId: 'org', taglineHe: 't', aboutEn: 'About', totalRaisedIls: 120.5 });
    expect(page?.campaigns).toEqual([
      { listingId: 'l1', title: 'Fund', summary: null, status: 'open', publishedAt: null, goalIls: 1000, raisedIls: 0 },
      { listingId: 'l2', title: 'Two', summary: 's', status: 'open', publishedAt: 'p', goalIls: 0, raisedIls: 5 },
    ]);
  });

  it('getNonprofitPublicPage returns null on error or non-object', async () => {
    expect(await makeRepo({ get_nonprofit_public_page: fail }).repo.getNonprofitPublicPage('x')).toBeNull();
    expect(await makeRepo({ get_nonprofit_public_page: ok('nope') }).repo.getNonprofitPublicPage('x')).toBeNull();
    const { repo } = makeRepo({ get_nonprofit_public_page: ok({ org_id: 'o', slug: 's', name: 'n' }) });
    expect((await repo.getNonprofitPublicPage('s'))?.campaigns).toEqual([]);
  });

  it('listMyStandingOrders and listDonationHistory map rows', async () => {
    const { repo } = makeRepo({
      list_my_standing_orders: ok([standing]),
      list_my_donation_history: ok([
        {
          payment_id: 'p1',
          org_id: 'org',
          org_name: 'KC',
          amount_ils: '18',
          paid_at: '2026-10-17T00:00:00Z',
          receipt_id: null,
          section46_serial: null,
        },
      ]),
    });
    expect((await repo.listMyStandingOrders())[0]).toMatchObject({ orderId: 'o1', amountIls: 50 });
    expect((await repo.listDonationHistory())[0]).toMatchObject({ paymentId: 'p1', amountIls: 18 });
    const { repo: bad } = makeRepo({ list_my_standing_orders: fail, list_my_donation_history: fail });
    expect(await bad.listMyStandingOrders(1)).toEqual([]);
    expect(await bad.listDonationHistory(1)).toEqual([]);
  });

  it('getDonationReceipt maps the receipt and handles errors', async () => {
    const { repo } = makeRepo({
      get_donation_receipt: ok({
        receipt_id: 'r1',
        section46_serial: 'S-1',
        issued_at: '2026-10-17T00:00:00Z',
        payment_id: 'p1',
        amount_ils: 18,
        paid_at: '2026-10-17T00:00:00Z',
        org_id: 'org',
        org_name: 'KC',
        org_slug: 'kc',
        sandbox: true,
      }),
    });
    expect(await repo.getDonationReceipt('p1')).toMatchObject({ receiptId: 'r1', section46Serial: 'S-1', sandbox: true });
    const { repo: partial } = makeRepo({ get_donation_receipt: ok({ payment_id: 'p2', amount_ils: 1 }) });
    expect(await partial.getDonationReceipt('p2')).toMatchObject({ receiptId: null, issuedAt: null });
    expect(await makeRepo({ get_donation_receipt: fail }).repo.getDonationReceipt('p1')).toBeNull();
  });
});

describe('SupabasePaymentsRepository — writes', () => {
  it('createDonationIntent and completeSandboxDonation map results', async () => {
    const { repo, calls } = makeRepo({
      create_donation_intent: ok({ intent_id: 'i1', checkout_url: null, org_id: 'org', amount_ils: '18' }),
      complete_sandbox_donation: ok({ payment_id: 'p1', receipt_id: null, section46_serial: 'S' }),
    });
    expect(await repo.createDonationIntent('org', 18, 'k')).toEqual({
      intentId: 'i1',
      checkoutUrl: null,
      orgId: 'org',
      amountIls: 18,
    });
    expect(await repo.completeSandboxDonation('i1')).toEqual({ paymentId: 'p1', receiptId: null, section46Serial: 'S' });
    expect(calls[0]?.args).toMatchObject({ p_org_id: 'org', p_amount_ils: 18, p_idempotency_key: 'k' });
  });

  it('write RPCs throw on error', async () => {
    const { repo } = makeRepo({
      create_donation_intent: fail,
      complete_sandbox_donation: ok(null),
      create_standing_order: fail,
      cancel_standing_order: fail,
      pause_standing_order: fail,
      resume_standing_order: fail,
    });
    await expect(repo.createDonationIntent('org', 1, 'k', 'l1')).rejects.toMatchObject({ message: 'boom' });
    await expect(repo.completeSandboxDonation('i1')).rejects.toThrow('complete_sandbox_donation failed');
    await expect(repo.createStandingOrder('org', 1, 'k')).rejects.toMatchObject({ message: 'boom' });
    await expect(repo.cancelStandingOrder('o1')).rejects.toMatchObject({ message: 'boom' });
    await expect(repo.pauseStandingOrder('o1')).rejects.toMatchObject({ message: 'boom' });
    await expect(repo.resumeStandingOrder('o1')).rejects.toMatchObject({ message: 'boom' });
  });

  it('standing order lifecycle RPCs succeed', async () => {
    const { repo, calls } = makeRepo({ create_standing_order: ok(standing) });
    expect(await repo.createStandingOrder('org', 50, 'k')).toMatchObject({ orderId: 'o1', cadence: 'monthly' });
    await repo.cancelStandingOrder('o1');
    await repo.pauseStandingOrder('o1');
    await repo.resumeStandingOrder('o1');
    expect(calls.map((c) => c.fn)).toEqual([
      'create_standing_order',
      'cancel_standing_order',
      'pause_standing_order',
      'resume_standing_order',
    ]);
  });
});

describe('SandboxPaymentProvider', () => {
  it('starts checkout and finalizes via the repository', async () => {
    const { repo } = makeRepo({
      create_donation_intent: ok({ intent_id: 'i1', checkout_url: 'https://pay', org_id: 'org', amount_ils: 18 }),
      complete_sandbox_donation: ok({ payment_id: 'p1', receipt_id: 'r1', section46_serial: null }),
    });
    const provider = new SandboxPaymentProvider(repo);
    expect(await provider.startDonationCheckout({ orgId: 'org', amountIls: 18, idempotencyKey: 'k' })).toEqual({
      intentId: 'i1',
      checkoutUrl: 'https://pay',
      amountIls: 18,
      orgId: 'org',
      providerSlug: 'sandbox',
    });
    expect(await provider.finalizeDonation('i1')).toEqual({
      paymentId: 'p1',
      receiptId: 'r1',
      section46Serial: null,
      status: 'paid',
    });
  });
});
