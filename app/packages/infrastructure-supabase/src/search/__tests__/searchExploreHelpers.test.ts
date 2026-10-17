import { describe, it, expect } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { SearchFilters } from '@kc/domain';
import {
  exploreLinks,
  explorePosts,
  exploreUsers,
} from '../searchExploreHelpers';

/* eslint-disable @typescript-eslint/no-explicit-any */

interface FakeOpts {
  data?: unknown;
  error?: { message: string } | null;
}
interface Op {
  kind: 'from' | 'select' | 'eq' | 'in' | 'is' | 'or' | 'gte' | 'order' | 'limit';
  args?: unknown[];
}

function makeFakeClient(opts: FakeOpts = {}): { client: SupabaseClient<any>; ops: Op[] } {
  const ops: Op[] = [];
  const result = () => ({
    data: opts.data ?? null,
    error: opts.error ?? null,
  });
  function makeChain(): any {
    return new Proxy({}, {
      get(_t, prop: string) {
        if (prop === 'then') {
          return (onFulfilled: any, onRejected: any) =>
            Promise.resolve(result()).then(onFulfilled, onRejected);
        }
        return (...args: any[]) => {
          ops.push({ kind: prop as Op['kind'], args });
          return makeChain();
        };
      },
    });
  }
  const client = {
    from: (table: string) => {
      ops.push({ kind: 'from', args: [table] });
      return makeChain();
    },
  } as unknown as SupabaseClient<any>;
  return { client, ops };
}

const POST_ROW = {
  post_id: 'p_1', owner_id: 'u_1', type: 'Give', status: 'open', visibility: 'Public',
  title: 't', description: null, category: 'Other', city: 'IL-001', street: null,
  street_number: null, location_display_level: 'CityOnly', item_condition: 'Good',
  urgency: null, reopen_count: 0, delete_after: null,
  created_at: '2026-05-16T12:00:00.000Z', updated_at: '2026-05-16T12:00:00.000Z',
  owner: { user_id: 'u_1', display_name: 'A', share_handle: 'a', avatar_url: null, privacy_mode: 'Public' },
};

describe('explorePosts', () => {
  it('always filters status=open, then layers type/category/city when set', async () => {
    const { client, ops } = makeFakeClient({ data: [POST_ROW] });
    const filters: SearchFilters = { postType: 'Give', category: 'Electronics', city: 'tel-aviv' };
    await explorePosts(client, filters, 10);
    const eqs = ops.filter((o) => o.kind === 'eq').map((o) => o.args?.[0]);
    expect(eqs).toEqual(['status', 'type', 'category', 'city']);
  });

  it('skips type/category/city when not set; orders by created_at desc + limit', async () => {
    const { client, ops } = makeFakeClient({ data: [] });
    await explorePosts(client, {}, 25);
    expect(ops.filter((o) => o.kind === 'eq').map((o) => o.args?.[0])).toEqual(['status']);
    const order = ops.find((o) => o.kind === 'order');
    expect(order?.args).toEqual(['created_at', { ascending: false }]);
    expect(ops.find((o) => o.kind === 'limit')?.args).toEqual([26]);
  });

  it('throws with "explorePosts: <msg>" on query error', async () => {
    const { client } = makeFakeClient({ error: { message: 'rls denied' } });
    await expect(explorePosts(client, {}, 10)).rejects.toThrow('explorePosts: rls denied');
  });

  it('never requests an exact count (0418)', async () => {
    const { client, ops } = makeFakeClient({ data: [] });
    await explorePosts(client, {}, 10);
    expect(ops.find((o) => o.kind === 'select')?.args?.[1]).toBeUndefined();
  });

  it('returns mapped rows and flags hasMore from the extra row', async () => {
    const { client } = makeFakeClient({ data: [POST_ROW, { ...POST_ROW, post_id: 'p_2' }] });
    const out = await explorePosts(client, {}, 1);
    expect(out.items.map((p) => p.postId)).toEqual(['p_1']);
    expect(out.hasMore).toBe(true);
    expect(out.total).toBe(1);
  });

  it('returns empty bucket when data is null', async () => {
    const { client } = makeFakeClient({ data: null });
    expect(await explorePosts(client, {}, 10)).toEqual({ items: [], total: 0, hasMore: false });
  });
});

describe('exploreUsers', () => {
  it('layers city + minFollowers eq/gte when set; orders by followers_count desc', async () => {
    const { client, ops } = makeFakeClient({ data: [] });
    await exploreUsers(client, { city: 'haifa', minFollowers: 5 }, null, 10);
    const eqs = ops.filter((o) => o.kind === 'eq').map((o) => o.args?.[0]);
    expect(eqs).toContain('city');
    const gte = ops.find((o) => o.kind === 'gte');
    expect(gte?.args).toEqual(['followers_count', 5]);
    const order = ops.find((o) => o.kind === 'order');
    expect(order?.args).toEqual(['followers_count', { ascending: false }]);
  });

  it('skips minFollowers filter when value is 0 or negative (no spurious gte)', async () => {
    const { client, ops } = makeFakeClient({ data: [] });
    await exploreUsers(client, { minFollowers: 0 }, null, 10);
    expect(ops.find((o) => o.kind === 'gte')).toBeUndefined();
  });

  it('throws with "exploreUsers: <msg>" on query error', async () => {
    const { client } = makeFakeClient({ error: { message: 'transport' } });
    await expect(exploreUsers(client, {}, null, 10)).rejects.toThrow('exploreUsers: transport');
  });
});

describe('exploreLinks', () => {
  it('filters hidden_at IS NULL + donationCategory eq when set; orders by created_at desc', async () => {
    const { client, ops } = makeFakeClient({ data: [] });
    await exploreLinks(client, { donationCategory: 'food' }, 10);
    const is = ops.find((o) => o.kind === 'is');
    expect(is?.args).toEqual(['hidden_at', null]);
    const eq = ops.find((o) => o.kind === 'eq');
    expect(eq?.args).toEqual(['category_slug', 'food']);
    const order = ops.find((o) => o.kind === 'order');
    expect(order?.args).toEqual(['created_at', { ascending: false }]);
  });

  it('skips donationCategory filter when not set', async () => {
    const { client, ops } = makeFakeClient({ data: [] });
    await exploreLinks(client, {}, 10);
    expect(ops.find((o) => o.kind === 'eq' && o.args?.[0] === 'category_slug')).toBeUndefined();
  });

  it('throws with "exploreLinks: <msg>" on query error', async () => {
    const { client } = makeFakeClient({ error: { message: 'rls denied' } });
    await expect(exploreLinks(client, {}, 10)).rejects.toThrow('exploreLinks: rls denied');
  });
});
