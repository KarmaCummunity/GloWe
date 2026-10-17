import { describe, it, expect } from 'vitest';
import { SupabaseMarketplaceRepository } from '../SupabaseMarketplaceRepository';

type Result = { data: unknown; error: unknown };

function makeRepo(results: Record<string, Result>) {
  const calls: Array<{ fn: string; args: unknown }> = [];
  const client = {
    rpc: async (fn: string, args: unknown) => {
      calls.push({ fn, args });
      return results[fn] ?? { data: null, error: null };
    },
  };
  return { repo: new SupabaseMarketplaceRepository(client as never), calls };
}

const ok = (data: unknown): Result => ({ data, error: null });
const boom = { message: 'boom' };
const fail: Result = { data: null, error: boom };

const row = {
  handoff_id: 'h1',
  listing_id: 'l1',
  owner_id: 'u1',
  recipient_id: 'u2',
  world_slug: 'items',
  status: 'reserved',
  pickup_mode: 'pickup',
  pickup_window_start: null,
  pickup_window_end: null,
  confirm_by: '2026-10-18T00:00:00Z',
  reserved_at: '2026-10-17T00:00:00Z',
  confirmed_at: null,
};
const snap = {
  handoffId: 'h1',
  listingId: 'l1',
  ownerId: 'u1',
  recipientId: 'u2',
  worldSlug: 'items',
  status: 'reserved',
  pickupMode: 'pickup',
  pickupWindowStart: null,
  pickupWindowEnd: null,
  confirmBy: '2026-10-18T00:00:00Z',
  reservedAt: '2026-10-17T00:00:00Z',
  confirmedAt: null,
};

describe('SupabaseMarketplaceRepository — giving handoffs', () => {
  it('getListingHandoff parses json, null on error or empty', async () => {
    expect(await makeRepo({ get_listing_handoff: ok(row) }).repo.getListingHandoff('l1')).toEqual(snap);
    expect(await makeRepo({ get_listing_handoff: fail }).repo.getListingHandoff('l1')).toBeNull();
    expect(await makeRepo({}).repo.getListingHandoff('l1')).toBeNull();
  });

  it('listMyGivingHandoffs maps rows, [] on error', async () => {
    const { repo, calls } = makeRepo({
      list_my_giving_handoffs: ok([
        {
          handoff_id: 'h1',
          listing_id: 'l1',
          title: 'Chair',
          world_slug: 'items',
          status: 'reserved',
          role: 'owner',
          pickup_window_start: null,
          pickup_window_end: null,
          reserved_at: 'x',
        },
      ]),
    });
    expect(await repo.listMyGivingHandoffs()).toEqual([
      {
        handoffId: 'h1',
        listingId: 'l1',
        title: 'Chair',
        worldSlug: 'items',
        status: 'reserved',
        role: 'owner',
        pickupWindowStart: null,
        pickupWindowEnd: null,
        reservedAt: 'x',
      },
    ]);
    expect(calls[0]?.args).toEqual({ p_limit: 50 });
    expect(await makeRepo({ list_my_giving_handoffs: fail }).repo.listMyGivingHandoffs(3)).toEqual([]);
  });

  it('row-returning writes map the handoff and throw on failure', async () => {
    const { repo, calls } = makeRepo({
      reserve_item_giving: ok(row),
      confirm_item_handoff: ok(row),
      claim_food_giving: ok(row),
      mark_giving_handed_over: ok(row),
    });
    expect(await repo.reserveItemGiving('l1')).toEqual(snap);
    expect(calls[0]?.args).toEqual({
      p_listing_id: 'l1',
      p_pickup_mode: 'pickup',
      p_pickup_window_start: undefined,
      p_pickup_window_end: undefined,
    });
    expect(await repo.confirmItemHandoff('h1')).toEqual(snap);
    expect(await repo.claimFoodGiving('l1', 'a', 'b')).toEqual(snap);
    expect(calls[2]?.args).toEqual({ p_listing_id: 'l1', p_pickup_window_start: 'a', p_pickup_window_end: 'b' });
    expect(await repo.markGivingHandedOver('h1')).toEqual(snap);

    const bad = makeRepo({ reserve_item_giving: fail, confirm_item_handoff: fail }).repo;
    await expect(bad.reserveItemGiving('l1', 'delivery', 'a', 'b')).rejects.toBe(boom);
    await expect(bad.confirmItemHandoff('h1')).rejects.toBe(boom);
    await expect(bad.claimFoodGiving('l1')).rejects.toThrow('claim_food_giving failed');
    await expect(bad.markGivingHandedOver('h1')).rejects.toThrow('mark_giving_handed_over failed');
  });

  it('void writes resolve or throw', async () => {
    const { repo, calls } = makeRepo({});
    await expect(repo.cancelGivingHandoff('h1')).resolves.toBeUndefined();
    await expect(repo.rateGivingHandoff('h1', 5)).resolves.toBeUndefined();
    expect(calls[1]?.args).toEqual({ p_handoff_id: 'h1', p_rating: 5, p_comment: undefined });
    const bad = makeRepo({ cancel_giving_handoff: fail, rate_giving_handoff: fail }).repo;
    await expect(bad.cancelGivingHandoff('h1')).rejects.toBe(boom);
    await expect(bad.rateGivingHandoff('h1', 1, 'meh')).rejects.toBe(boom);
  });
});
