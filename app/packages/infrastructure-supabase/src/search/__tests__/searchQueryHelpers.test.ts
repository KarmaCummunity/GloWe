import { describe, it, expect } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { SearchFilters } from '@kc/domain';
import { searchLinks, searchPosts, searchUsers } from '../searchQueryHelpers';

/* eslint-disable @typescript-eslint/no-explicit-any */

interface Res {
  data?: unknown;
  error?: { message: string } | null;
}
interface FakeOpts extends Res {
  /** Per-table results for `.from(table)`; falls back to `data`/`error`. */
  tables?: Record<string, Res>;
  rpc?: Record<string, Res>;
}
interface Op {
  kind: 'from' | 'rpc' | 'select' | 'eq' | 'in' | 'is' | 'or' | 'gte' | 'order' | 'limit';
  args?: unknown[];
}

function makeFakeClient(opts: FakeOpts = {}): { client: SupabaseClient<any>; ops: Op[] } {
  const ops: Op[] = [];
  const toResult = (r: Res | undefined) => ({ data: r?.data ?? null, error: r?.error ?? null });
  function makeChain(res: Res | undefined): any {
    return new Proxy({}, {
      get(_t, prop: string) {
        if (prop === 'then') {
          return (onFulfilled: any, onRejected: any) =>
            Promise.resolve(toResult(res)).then(onFulfilled, onRejected);
        }
        return (...args: any[]) => {
          ops.push({ kind: prop as Op['kind'], args });
          return makeChain(res);
        };
      },
    });
  }
  const client = {
    from: (table: string) => {
      ops.push({ kind: 'from', args: [table] });
      return makeChain(opts.tables ? opts.tables[table] ?? { data: [] } : opts);
    },
    rpc: async (fn: string, args: unknown) => {
      ops.push({ kind: 'rpc', args: [fn, args] });
      return toResult(opts.rpc?.[fn]);
    },
  } as unknown as SupabaseClient<any>;
  return { client, ops };
}

const postRow = (id: string) => ({
  post_id: id, owner_id: 'u_1', type: 'Give', status: 'open', visibility: 'Public',
  title: 't', description: null, category: 'Other', city: 'IL-001', street: null,
  street_number: null, location_display_level: 'CityOnly', item_condition: 'Good',
  urgency: null, reopen_count: 0, delete_after: null,
  created_at: '2026-05-16T12:00:00.000Z', updated_at: '2026-05-16T12:00:00.000Z',
  owner: { user_id: 'u_1', display_name: 'A', share_handle: 'a', avatar_url: null, privacy_mode: 'Public' },
});

const userRow = (id: string) => ({
  user_id: id, display_name: 'Alice', share_handle: 'alice', avatar_url: null,
  biography: null, city: 'IL-001', city_name: 'Tel Aviv',
  followers_count: 10, items_given_count: 2,
});

const LINK_ROW = {
  id: 'l_1', user_id: 'u_1', display_name: 'Soup Kitchen', url: 'https://example.com',
  description: null, category_slug: 'food', hidden_at: null,
  created_at: '2026-05-16T12:00:00.000Z', updated_at: '2026-05-16T12:00:00.000Z',
};

const rpcArgs = (ops: Op[]) => ops.find((o) => o.kind === 'rpc')?.args;

describe('searchPosts', () => {
  it('calls search_posts_page with filters and limit + 1 (no count)', async () => {
    const { client, ops } = makeFakeClient({ rpc: { search_posts_page: { data: [] } } });
    const filters: SearchFilters = { postType: 'Give', category: 'Electronics', city: 'tel-aviv' };
    const out = await searchPosts(client, 'sofa', filters, 10);
    expect(rpcArgs(ops)).toEqual(['search_posts_page', {
      p_query: 'sofa', p_type: 'Give', p_category: 'Electronics', p_city: 'tel-aviv', p_limit: 11,
    }]);
    expect(out).toEqual({ items: [], total: 0, hasMore: false });
    expect(ops.some((o) => o.kind === 'from')).toBe(false);
  });

  it('omits unset filters', async () => {
    const { client, ops } = makeFakeClient({ rpc: { search_posts_page: { data: [] } } });
    await searchPosts(client, 'q', {}, 5);
    expect(rpcArgs(ops)?.[1]).toEqual({ p_query: 'q', p_type: undefined, p_category: undefined, p_city: undefined, p_limit: 6 });
  });

  it('hydrates ids through posts, keeps RPC order and flags hasMore', async () => {
    const { client, ops } = makeFakeClient({
      rpc: { search_posts_page: { data: [{ post_id: 'p_2' }, { post_id: 'p_1' }, { post_id: 'p_3' }] } },
      tables: { posts: { data: [postRow('p_1'), postRow('p_2')] } },
    });
    const out = await searchPosts(client, 'q', {}, 2);
    expect(ops.find((o) => o.kind === 'in')?.args).toEqual(['post_id', ['p_2', 'p_1']]);
    expect(out.items.map((p) => p.postId)).toEqual(['p_2', 'p_1']);
    expect(out.hasMore).toBe(true);
    expect(out.total).toBe(2);
  });

  it('throws with "searchPosts: <msg>" on RPC or hydrate error', async () => {
    const a = makeFakeClient({ rpc: { search_posts_page: { error: { message: 'rls denied' } } } });
    await expect(searchPosts(a.client, 'q', {}, 10)).rejects.toThrow('searchPosts: rls denied');
    const b = makeFakeClient({
      rpc: { search_posts_page: { data: [{ post_id: 'p_1' }] } },
      tables: { posts: { error: { message: 'boom' } } },
    });
    await expect(searchPosts(b.client, 'q', {}, 10)).rejects.toThrow('searchPosts: boom');
  });
});

describe('searchUsers', () => {
  it('calls search_users_page with sort/minFollowers and limit + 1', async () => {
    const { client, ops } = makeFakeClient({ rpc: { search_users_page: { data: [] } } });
    await searchUsers(client, 'al', { city: 'IL-001', minFollowers: 5 }, null, 10);
    expect(rpcArgs(ops)).toEqual(['search_users_page', {
      p_query: 'al', p_city: 'IL-001', p_min_followers: 5, p_sort: 'followers', p_limit: 11,
    }]);
  });

  it('uses newest sort and drops non-positive minFollowers', async () => {
    const { client, ops } = makeFakeClient({ rpc: { search_users_page: { data: [] } } });
    await searchUsers(client, 'al', { sortBy: 'newest', minFollowers: 0 }, null, 3);
    const args = rpcArgs(ops)?.[1] as Record<string, unknown>;
    expect(args.p_sort).toBe('newest');
    expect(args.p_min_followers).toBeUndefined();
  });

  it('hydrates users in RPC order with hasMore', async () => {
    const { client } = makeFakeClient({
      rpc: { search_users_page: { data: [{ user_id: 'u_2' }, { user_id: 'u_1' }] } },
      tables: { users: { data: [userRow('u_1'), userRow('u_2')] } },
    });
    const out = await searchUsers(client, 'al', {}, null, 1);
    expect(out.items.map((u) => u.userId)).toEqual(['u_2']);
    expect(out.hasMore).toBe(true);
  });

  it('throws with "searchUsers: <msg>" on query error', async () => {
    const { client } = makeFakeClient({ rpc: { search_users_page: { error: { message: 'nope' } } } });
    await expect(searchUsers(client, 'q', {}, null, 10)).rejects.toThrow('searchUsers: nope');
  });
});

describe('searchLinks', () => {
  it('filters hidden_at IS NULL and ors over display_name/description/url when no slug match and no donationCategory', async () => {
    const { client, ops } = makeFakeClient({ data: [] });
    await searchLinks(client, 'help', {}, 10);
    const is = ops.find((o) => o.kind === 'is');
    expect(is?.args).toEqual(['hidden_at', null]);
    const or = ops.find((o) => o.kind === 'or');
    expect(or?.args?.[0]).toBe('display_name.ilike."%help%",description.ilike."%help%",url.ilike."%help%"');
  });

  it('appends category_slug.eq.<slug> to or() when the query contains a Hebrew category label and donationCategory is not set', async () => {
    const { client, ops } = makeFakeClient({ data: [] });
    await searchLinks(client, 'אוכל', {}, 10);
    const or = ops.find((o) => o.kind === 'or');
    expect(or?.args?.[0]).toBe(
      'display_name.ilike."%אוכל%",description.ilike."%אוכל%",url.ilike."%אוכל%",category_slug.eq.food',
    );
  });

  it('does not append category_slug.eq when donationCategory filter is set (the eq takes over)', async () => {
    const { client, ops } = makeFakeClient({ data: [] });
    await searchLinks(client, 'אוכל', { donationCategory: 'medical' }, 10);
    const or = ops.find((o) => o.kind === 'or');
    expect(or?.args?.[0]).toBe('display_name.ilike."%אוכל%",description.ilike."%אוכל%",url.ilike."%אוכל%"');
    const eq = ops.find((o) => o.kind === 'eq');
    expect(eq?.args).toEqual(['category_slug', 'medical']);
  });

  it('orders by created_at desc + applies limit', async () => {
    const { client, ops } = makeFakeClient({ data: [] });
    await searchLinks(client, 'q', {}, 7);
    expect(ops.find((o) => o.kind === 'order')?.args).toEqual(['created_at', { ascending: false }]);
    expect(ops.find((o) => o.kind === 'limit')?.args).toEqual([8]);
  });

  it('throws with "searchLinks: <msg>" on query error', async () => {
    const { client } = makeFakeClient({ error: { message: 'rls denied' } });
    await expect(searchLinks(client, 'q', {}, 10)).rejects.toThrow('searchLinks: rls denied');
  });

  it('returns mapped DonationLinkSearchResult rows on success', async () => {
    const { client } = makeFakeClient({ data: [LINK_ROW, { ...LINK_ROW, id: 'l_2' }] });
    const out = await searchLinks(client, 'q', {}, 1);
    expect(out.items.map((l) => l.id)).toEqual(['l_1']);
    expect(out.hasMore).toBe(true);
  });
});
