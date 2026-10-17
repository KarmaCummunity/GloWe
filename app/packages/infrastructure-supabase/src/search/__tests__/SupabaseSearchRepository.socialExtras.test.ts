import { describe, it, expect, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';

/* eslint-disable @typescript-eslint/no-explicit-any */

vi.mock('../searchExploreHelpers', () => ({
  explorePosts: vi.fn(async () => ({ items: [], total: 0 })),
  exploreUsers: vi.fn(async () => ({ items: [], total: 0 })),
  exploreLinks: vi.fn(async () => ({ items: [], total: 0 })),
}));
vi.mock('../searchQueryHelpers', () => ({
  searchPosts: vi.fn(async () => ({ items: [], total: 0 })),
  searchUsers: vi.fn(async () => ({ items: [], total: 0 })),
  searchLinks: vi.fn(async () => ({ items: [], total: 0 })),
}));

import { SupabaseSearchRepository } from '../SupabaseSearchRepository';

const LIMITS = { posts: 5, users: 5, links: 5 };

function clientWith(impl: (fn: string, args?: unknown) => { data: unknown; error: unknown }) {
  const rpc = vi.fn(async (fn: string, args?: unknown) => impl(fn, args));
  return { client: { rpc } as unknown as SupabaseClient<any>, rpc };
}

describe('SupabaseSearchRepository — social extras', () => {
  it('maps orgs and hashtags from search_all for a query', async () => {
    const { client, rpc } = clientWith(() => ({
      data: { orgs: [{ org_id: 'o1', name: 'Org', slug: 'org' }], hashtags: [{ tag: 'give', use_count: 4 }] },
      error: null,
    }));
    const res = await new SupabaseSearchRepository(client).search(' food ', {}, null, LIMITS);
    expect(rpc).toHaveBeenCalledWith('search_all', { p_query: 'food', p_types: ['orgs', 'hashtags'], p_limit: 20 });
    expect(res.orgs).toEqual([{ orgId: 'o1', name: 'Org', slug: 'org' }]);
    expect(res.hashtags).toEqual([{ tag: 'give', useCount: 4 }]);
    expect(res.orgsTotal).toBe(1);
    expect(res.hashtagsTotal).toBe(1);
    expect(res.suggestedQueries).toEqual([]);
  });

  it('only requests the wanted type and tolerates missing arrays / errors', async () => {
    const { client, rpc } = clientWith(() => ({ data: {}, error: null }));
    const res = await new SupabaseSearchRepository(client).search('x', { resultType: 'org' }, null, LIMITS);
    expect(rpc).toHaveBeenCalledWith('search_all', { p_query: 'x', p_types: ['orgs'], p_limit: 20 });
    expect(res.orgs).toEqual([]);
    const err = clientWith(() => ({ data: null, error: { message: 'e' } }));
    const r2 = await new SupabaseSearchRepository(err.client).search('x', { resultType: 'hashtag' }, null, LIMITS);
    expect(r2.hashtags).toEqual([]);
  });

  it('explore mode returns suggested queries (and empty on error)', async () => {
    const ok = clientWith(() => ({ data: ['bikes', 'books'], error: null }));
    const res = await new SupabaseSearchRepository(ok.client).search('', {}, null, LIMITS);
    expect(ok.rpc).toHaveBeenCalledWith('rpc_search_suggested_queries');
    expect(res.suggestedQueries).toEqual(['bikes', 'books']);
    const bad = clientWith(() => ({ data: null, error: { message: 'e' } }));
    expect((await new SupabaseSearchRepository(bad.client).search('', {}, null, LIMITS)).suggestedQueries).toEqual([]);
  });

  it('non-social result type uses suggested queries path', async () => {
    const ok = clientWith(() => ({ data: null, error: null }));
    const res = await new SupabaseSearchRepository(ok.client).search('', { resultType: 'post' }, null, LIMITS);
    expect(res.suggestedQueries).toEqual([]);
    const bad = clientWith(() => ({ data: null, error: { message: 'e' } }));
    expect((await new SupabaseSearchRepository(bad.client).search('q', { resultType: 'user' }, null, LIMITS)).suggestedQueries).toEqual([]);
    const okq = clientWith(() => ({ data: ['a'], error: null }));
    expect((await new SupabaseSearchRepository(okq.client).search('q', { resultType: 'link' }, null, LIMITS)).suggestedQueries).toEqual(['a']);
  });
});
