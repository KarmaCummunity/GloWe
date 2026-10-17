import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { SearchFilters } from '@kc/domain';

/* eslint-disable @typescript-eslint/no-explicit-any */

// Mock the underlying helpers so we can assert which path the orchestrator
// chose without standing up real Supabase queries. Each mock returns a
// stable, distinguishable buckets so section totals + preview lengths
// double as call-witness assertions.
vi.mock('../searchExploreHelpers', () => ({
  explorePosts: vi.fn(async () => ({ items: [{ kind: 'explore-post' }], total: 10 })),
  exploreUsers: vi.fn(async () => ({ items: [{ kind: 'explore-user' }, { kind: 'explore-user' }], total: 20 })),
  exploreLinks: vi.fn(async () => ({ items: [], total: 0 })),
}));
vi.mock('../searchQueryHelpers', () => ({
  searchPosts: vi.fn(async () => ({ items: [{ kind: 'search-post' }, { kind: 'search-post' }], total: 100 })),
  searchUsers: vi.fn(async () => ({ items: [{ kind: 'search-user' }], total: 15 })),
  searchLinks: vi.fn(async () => ({
    items: [{ kind: 'search-link' }, { kind: 'search-link' }, { kind: 'search-link' }],
    total: 30,
  })),
}));

import { SupabaseSearchRepository } from '../SupabaseSearchRepository';
import { explorePosts, exploreUsers, exploreLinks } from '../searchExploreHelpers';
import { searchPosts, searchUsers, searchLinks } from '../searchQueryHelpers';

const FAKE_CLIENT = {
  rpc: vi.fn(async () => ({ data: [], error: null })),
} as unknown as SupabaseClient<any>;
const LIMITS = { posts: 10, users: 10, links: 10 };

beforeEach(() => {
  vi.clearAllMocks();
});

describe('SupabaseSearchRepository — explore vs search path', () => {
  it('routes empty query to the explore helpers', async () => {
    const repo = new SupabaseSearchRepository(FAKE_CLIENT);

    await repo.search('', {}, null, LIMITS);

    expect(explorePosts).toHaveBeenCalledTimes(1);
    expect(exploreUsers).toHaveBeenCalledTimes(1);
    expect(exploreLinks).toHaveBeenCalledTimes(1);
    expect(searchPosts).not.toHaveBeenCalled();
    expect(searchUsers).not.toHaveBeenCalled();
    expect(searchLinks).not.toHaveBeenCalled();
  });

  it('routes whitespace-only query to the explore helpers (trim check)', async () => {
    const repo = new SupabaseSearchRepository(FAKE_CLIENT);

    await repo.search('   \t  ', {}, null, LIMITS);

    expect(explorePosts).toHaveBeenCalledTimes(1);
    expect(searchPosts).not.toHaveBeenCalled();
  });

  it('routes a non-empty query to the search helpers', async () => {
    const repo = new SupabaseSearchRepository(FAKE_CLIENT);

    await repo.search('car', {}, 'u_viewer', LIMITS);

    expect(searchPosts).toHaveBeenCalledTimes(1);
    expect(searchUsers).toHaveBeenCalledTimes(1);
    expect(searchLinks).toHaveBeenCalledTimes(1);
    expect(explorePosts).not.toHaveBeenCalled();
  });

  it('forwards (client, query, filters, limit, viewerId) to each search helper', async () => {
    const repo = new SupabaseSearchRepository(FAKE_CLIENT);
    const filters: SearchFilters = { category: 'Electronics' };

    await repo.search('car', filters, 'u_viewer', { posts: 5, users: 7, links: 9 });

    expect(searchPosts).toHaveBeenCalledWith(FAKE_CLIENT, 'car', filters, 5, 'u_viewer');
    expect(searchUsers).toHaveBeenCalledWith(FAKE_CLIENT, 'car', filters, 'u_viewer', 7);
    expect(searchLinks).toHaveBeenCalledWith(FAKE_CLIENT, 'car', filters, 9);
  });

  it('forwards (client, filters, limit, viewerId) to each explore helper (no query arg)', async () => {
    const repo = new SupabaseSearchRepository(FAKE_CLIENT);
    const filters: SearchFilters = { city: 'tel-aviv' };

    await repo.search('', filters, 'u_viewer', { posts: 5, users: 7, links: 9 });

    expect(explorePosts).toHaveBeenCalledWith(FAKE_CLIENT, filters, 5, 'u_viewer');
    expect(exploreUsers).toHaveBeenCalledWith(FAKE_CLIENT, filters, 'u_viewer', 7);
    expect(exploreLinks).toHaveBeenCalledWith(FAKE_CLIENT, filters, 9);
  });
});

describe('SupabaseSearchRepository — resultType gating', () => {
  it('runs only posts when resultType === "post"', async () => {
    const repo = new SupabaseSearchRepository(FAKE_CLIENT);

    const out = await repo.search('car', { resultType: 'post' }, null, LIMITS);

    expect(searchPosts).toHaveBeenCalledTimes(1);
    expect(searchUsers).not.toHaveBeenCalled();
    expect(searchLinks).not.toHaveBeenCalled();
    expect(out.users).toEqual([]);
    expect(out.links).toEqual([]);
  });

  it('runs only users when resultType === "user"', async () => {
    const repo = new SupabaseSearchRepository(FAKE_CLIENT);

    const out = await repo.search('car', { resultType: 'user' }, null, LIMITS);

    expect(searchUsers).toHaveBeenCalledTimes(1);
    expect(searchPosts).not.toHaveBeenCalled();
    expect(searchLinks).not.toHaveBeenCalled();
    expect(out.posts).toEqual([]);
    expect(out.links).toEqual([]);
  });

  it('runs only links when resultType === "link"', async () => {
    const repo = new SupabaseSearchRepository(FAKE_CLIENT);

    const out = await repo.search('car', { resultType: 'link' }, null, LIMITS);

    expect(searchLinks).toHaveBeenCalledTimes(1);
    expect(searchPosts).not.toHaveBeenCalled();
    expect(searchUsers).not.toHaveBeenCalled();
    expect(out.posts).toEqual([]);
    expect(out.users).toEqual([]);
  });

  it('runs all three when resultType is null', async () => {
    const repo = new SupabaseSearchRepository(FAKE_CLIENT);

    await repo.search('car', { resultType: null }, null, LIMITS);

    expect(searchPosts).toHaveBeenCalledTimes(1);
    expect(searchUsers).toHaveBeenCalledTimes(1);
    expect(searchLinks).toHaveBeenCalledTimes(1);
  });

  it('runs all three when resultType is absent (treats undefined === null === all)', async () => {
    const repo = new SupabaseSearchRepository(FAKE_CLIENT);

    await repo.search('car', {}, null, LIMITS);

    expect(searchPosts).toHaveBeenCalledTimes(1);
    expect(searchUsers).toHaveBeenCalledTimes(1);
    expect(searchLinks).toHaveBeenCalledTimes(1);
  });
});

describe('SupabaseSearchRepository — section totals', () => {
  it('exposes bucket totals separately from preview item lengths', async () => {
    const repo = new SupabaseSearchRepository(FAKE_CLIENT);

    const out = await repo.search('car', {}, null, LIMITS);

    expect(out.postsTotal).toBe(100);
    expect(out.usersTotal).toBe(15);
    expect(out.linksTotal).toBe(30);
    expect(out.posts).toHaveLength(2);
    expect(out.users).toHaveLength(1);
    expect(out.links).toHaveLength(3);
  });

  it('zeros disabled buckets when resultType narrows the search', async () => {
    const repo = new SupabaseSearchRepository(FAKE_CLIENT);

    const out = await repo.search('car', { resultType: 'user' }, null, LIMITS);

    expect(out.usersTotal).toBe(15);
    expect(out.postsTotal).toBe(0);
    expect(out.linksTotal).toBe(0);
    expect(out.users).toHaveLength(1);
  });
});
