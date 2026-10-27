import { describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SupabasePostEngagementRepository } from '../SupabasePostEngagementRepository';

/* eslint-disable @typescript-eslint/no-explicit-any */

function makeClient(
  rpcImpl: (fn: string, args?: unknown) => Promise<{ data: unknown; error: Error | null }>,
): SupabaseClient<any> {
  return { rpc: rpcImpl } as unknown as SupabaseClient<any>;
}

describe('SupabasePostEngagementRepository', () => {
  it('getStats maps row', async () => {
    const repo = new SupabasePostEngagementRepository(
      makeClient(async () => ({
        data: {
          post_id: 'p1',
          reaction_count: 3,
          comment_count: 2,
          share_count: 1,
        },
        error: null,
      })),
    );
    await expect(repo.getStats('p1')).resolves.toEqual({
      postId: 'p1',
      reactionCount: 3,
      commentCount: 2,
      shareCount: 1,
    });
  });

  it('setReaction forwards args', async () => {
    const args: unknown[] = [];
    const repo = new SupabasePostEngagementRepository(
      makeClient(async (_fn, a) => {
        args.push(a);
        return { data: null, error: null };
      }),
    );
    await repo.setReaction('p1', 'thanks');
    expect(args[0]).toEqual({ p_post_id: 'p1', p_reaction_type: 'thanks' });
  });

  it('createComment maps comment row', async () => {
    const repo = new SupabasePostEngagementRepository(
      makeClient(async () => ({
        data: {
          comment_id: 'c1',
          post_id: 'p1',
          author_id: 'u1',
          parent_comment_id: null,
          body: 'nice',
          created_at: '2026-01-01T00:00:00.000Z',
        },
        error: null,
      })),
    );
    const row = await repo.createComment('p1', 'nice');
    expect(row.commentId).toBe('c1');
  });
});
