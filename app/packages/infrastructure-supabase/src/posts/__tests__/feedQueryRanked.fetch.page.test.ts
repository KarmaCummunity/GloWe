import { describe, it, expect } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { fetchRankedFeedPage } from '../feedQueryRanked';

/* eslint-disable @typescript-eslint/no-explicit-any */

interface FakeOpts {
  rpc?: { data?: unknown; error?: { message: string } | null };
  posts?: { data?: unknown; error?: { message: string } | null };
}

function makeFakeClient(opts: FakeOpts = {}): {
  client: SupabaseClient<any>;
  ops: Array<{ kind: string; args?: unknown[] }>;
} {
  const ops: Array<{ kind: string; args?: unknown[] }> = [];
  function makeChain(result: () => { data: unknown; error: { message: string } | null }): any {
    return new Proxy({}, {
      get(_t, prop: string) {
        if (prop === 'then') {
          return (onFulfilled: any, onRejected: any) =>
            Promise.resolve(result()).then(onFulfilled, onRejected);
        }
        return (...args: any[]) => {
          ops.push({ kind: prop, args });
          return makeChain(result);
        };
      },
    });
  }
  const client = {
    rpc: () => Promise.resolve({
      data: opts.rpc?.data ?? null,
      error: opts.rpc?.error ?? null,
    }),
    from: (table: string) => {
      ops.push({ kind: 'from', args: [table] });
      return makeChain(() => ({
        data: opts.posts?.data ?? null,
        error: opts.posts?.error ?? null,
      }));
    },
  } as unknown as SupabaseClient<any>;
  return { client, ops };
}

function makePostRow(post_id: string, created_at: string): any {
  return {
    post_id, owner_id: 'u_1', type: 'Give', status: 'open', visibility: 'Public',
    title: `t ${post_id}`, description: null, category: 'Other', city: 'IL-001',
    street: null, street_number: null, location_display_level: 'CityOnly',
    item_condition: 'Good', urgency: null, reopen_count: 0, delete_after: null,
    created_at, updated_at: created_at,
    owner: { user_id: 'u_1', display_name: 'A', share_handle: 'a', avatar_url: null, privacy_mode: 'Public' },
  };
}

describe('fetchRankedFeedPage — page assembly (reorder, distance, nextCursor)', () => {
  it('fetches posts by IN(<ranked ids>) and reorders the result to match the RPC ranking', async () => {
    const ranked = [
      { post_id: 'p_a', distance_km: 1.0 },
      { post_id: 'p_b', distance_km: 2.0 },
      { post_id: 'p_c', distance_km: 3.0 },
    ];
    // posts arrive in arbitrary order from PostgREST
    const postsData = [
      makePostRow('p_c', '2026-05-16T11:00:00.000Z'),
      makePostRow('p_a', '2026-05-16T13:00:00.000Z'),
      makePostRow('p_b', '2026-05-16T12:00:00.000Z'),
    ];
    const { client, ops } = makeFakeClient({ rpc: { data: ranked }, posts: { data: postsData } });
    const out = await fetchRankedFeedPage(client, 'v', {}, undefined, 10);

    expect(ops.find((o) => o.kind === 'from')?.args).toEqual(['posts']);
    expect(ops.find((o) => o.kind === 'in')?.args).toEqual(['post_id', ['p_a', 'p_b', 'p_c']]);
    expect(out.posts.map((p) => p.postId)).toEqual(['p_a', 'p_b', 'p_c']);
    expect(out.nextCursor).toBeNull();
  });

  it('attaches distance_km from the RPC result to each post in the page', async () => {
    const ranked = [
      { post_id: 'p_a', distance_km: 1.25 },
      { post_id: 'p_b', distance_km: null },
    ];
    const postsData = [
      makePostRow('p_a', '2026-05-16T13:00:00.000Z'),
      makePostRow('p_b', '2026-05-16T12:00:00.000Z'),
    ];
    const { client } = makeFakeClient({ rpc: { data: ranked }, posts: { data: postsData } });
    const out = await fetchRankedFeedPage(client, 'v', {}, undefined, 10);
    expect(out.posts[0]?.distanceKm).toBe(1.25);
    expect(out.posts[1]?.distanceKm).toBeNull();
  });

  it('trims the page to pageLimit + emits a nextCursor when ranked.length > pageLimit', async () => {
    const ranked = [
      { post_id: 'p_a', distance_km: 1.0 },
      { post_id: 'p_b', distance_km: 2.0 },
      { post_id: 'p_c', distance_km: 3.0 },
    ];
    const postsData = [
      makePostRow('p_a', '2026-05-16T13:00:00.000Z'),
      makePostRow('p_b', '2026-05-16T12:00:00.000Z'),
      makePostRow('p_c', '2026-05-16T11:00:00.000Z'),
    ];
    const { client } = makeFakeClient({ rpc: { data: ranked }, posts: { data: postsData } });
    const out = await fetchRankedFeedPage(client, 'v', {}, undefined, 2);

    expect(out.posts.map((p) => p.postId)).toEqual(['p_a', 'p_b']);
    expect(out.nextCursor).not.toBeNull();
    const decoded = JSON.parse(decodeURIComponent(out.nextCursor!));
    expect(decoded).toEqual({
      distanceKm: 2.0,
      createdAt: '2026-05-16T12:00:00.000Z',
      postId: 'p_b',
      rankScore: null,
    });
  });

  it('returns nextCursor=null when ranked.length === pageLimit (no overflow)', async () => {
    const ranked = [
      { post_id: 'p_a', distance_km: 1.0 },
      { post_id: 'p_b', distance_km: 2.0 },
    ];
    const postsData = [
      makePostRow('p_a', '2026-05-16T13:00:00.000Z'),
      makePostRow('p_b', '2026-05-16T12:00:00.000Z'),
    ];
    const { client } = makeFakeClient({ rpc: { data: ranked }, posts: { data: postsData } });
    const out = await fetchRankedFeedPage(client, 'v', {}, undefined, 2);
    expect(out.nextCursor).toBeNull();
  });

  it('silently skips IDs the RPC returned but the IN query did not (RLS race between calls)', async () => {
    const ranked = [
      { post_id: 'p_a', distance_km: 1.0 },
      { post_id: 'p_b', distance_km: 2.0 },
      { post_id: 'p_c', distance_km: 3.0 },
    ];
    // p_b dropped between calls by RLS
    const postsData = [
      makePostRow('p_a', '2026-05-16T13:00:00.000Z'),
      makePostRow('p_c', '2026-05-16T11:00:00.000Z'),
    ];
    const { client } = makeFakeClient({ rpc: { data: ranked }, posts: { data: postsData } });
    const out = await fetchRankedFeedPage(client, 'v', {}, undefined, 10);
    expect(out.posts.map((p) => p.postId)).toEqual(['p_a', 'p_c']);
  });

  it('throws "fetchRankedFeedPage.posts: <msg>" when the IN(...) query errors', async () => {
    const ranked = [{ post_id: 'p_a', distance_km: 1.0 }];
    const { client } = makeFakeClient({
      rpc: { data: ranked },
      posts: { error: { message: 'timeout' } },
    });
    await expect(fetchRankedFeedPage(client, 'v', {}, undefined, 10))
      .rejects.toThrow('fetchRankedFeedPage.posts: timeout');
  });

  it('emits nextCursor with createdAt from the mapped post row (not the RPC payload)', async () => {
    const ranked = [
      { post_id: 'p_a', distance_km: 1.0 },
      { post_id: 'p_b', distance_km: 2.0 },
    ];
    const postsData = [
      makePostRow('p_a', '2026-05-16T13:00:00.000Z'),
      makePostRow('p_b', '2026-05-16T09:00:00.000Z'),
    ];
    const { client } = makeFakeClient({ rpc: { data: ranked }, posts: { data: postsData } });
    const out = await fetchRankedFeedPage(client, 'v', {}, undefined, 1);
    const decoded = JSON.parse(decodeURIComponent(out.nextCursor!));
    expect(decoded.postId).toBe('p_a');
    expect(decoded.createdAt).toBe('2026-05-16T13:00:00.000Z');
  });
});
