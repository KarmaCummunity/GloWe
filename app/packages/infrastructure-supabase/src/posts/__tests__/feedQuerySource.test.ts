import { describe, it, expect } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { runSimpleFeedQuery, shouldFallbackToPosts } from '../feedQuery';

/* eslint-disable @typescript-eslint/no-explicit-any */

type Result = { data: unknown; error: { code?: string; message: string } | null };

function fakeClient(results: Record<string, Result>) {
  const from: string[] = [];
  const client = {
    from: (table: string) => {
      from.push(table);
      const res = results[table] ?? { data: [], error: null };
      const chain: any = new Proxy(
        {},
        {
          get(_t, prop: string) {
            if (prop === 'then') return (ok: (v: Result) => unknown) => Promise.resolve(res).then(ok);
            return () => chain;
          },
        },
      );
      return chain;
    },
  } as unknown as SupabaseClient<any>;
  return { client, from };
}

describe('runSimpleFeedQuery (0417 hides/mutes)', () => {
  it('signed-in viewers read feed_visible_posts', async () => {
    const f = fakeClient({ feed_visible_posts: { data: [{ post_id: 'p1' }], error: null } });
    const res = await runSimpleFeedQuery(f.client, 'me', {}, undefined, 20);
    expect(f.from).toEqual(['feed_visible_posts']);
    expect(res.data).toEqual([{ post_id: 'p1' }]);
  });

  it('guests read posts directly', async () => {
    const f = fakeClient({});
    await runSimpleFeedQuery(f.client, null, {}, undefined, 20);
    expect(f.from).toEqual(['posts']);
  });

  it('falls back to posts when the view is unusable', async () => {
    const f = fakeClient({
      feed_visible_posts: { data: null, error: { code: 'PGRST200', message: 'no relationship' } },
      posts: { data: [{ post_id: 'p2' }], error: null },
    });
    const res = await runSimpleFeedQuery(f.client, 'me', {}, undefined, 20);
    expect(f.from).toEqual(['feed_visible_posts', 'posts']);
    expect(res.data).toEqual([{ post_id: 'p2' }]);
  });

  it('surfaces other errors without a fallback', async () => {
    const f = fakeClient({ feed_visible_posts: { data: null, error: { code: '57014', message: 'timeout' } } });
    const res = await runSimpleFeedQuery(f.client, 'me', {}, undefined, 20);
    expect(f.from).toEqual(['feed_visible_posts']);
    expect(res.error?.message).toBe('timeout');
  });
});

describe('shouldFallbackToPosts', () => {
  it('matches only view-unavailable codes', () => {
    expect(shouldFallbackToPosts({ code: '42P01' })).toBe(true);
    expect(shouldFallbackToPosts({ code: 'PGRST205' })).toBe(true);
    expect(shouldFallbackToPosts({ code: '57014' })).toBe(false);
    expect(shouldFallbackToPosts({ code: null })).toBe(false);
    expect(shouldFallbackToPosts(null)).toBe(false);
  });
});
