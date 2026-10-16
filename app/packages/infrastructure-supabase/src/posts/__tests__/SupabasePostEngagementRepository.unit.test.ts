import { describe, it, expect, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SupabasePostEngagementRepository } from '../SupabasePostEngagementRepository';

/* eslint-disable @typescript-eslint/no-explicit-any */

function rpcClient(result: { data: unknown; error: unknown }) {
  const rpc = vi.fn(async () => result);
  return { client: { rpc } as unknown as SupabaseClient<any>, rpc };
}

const commentRow = {
  comment_id: 'c1',
  post_id: 'p1',
  author_id: 'u1',
  parent_comment_id: null,
  body: 'hi',
  created_at: '2026-01-01T00:00:00Z',
};
const mapped = {
  commentId: 'c1',
  postId: 'p1',
  authorId: 'u1',
  parentCommentId: null,
  body: 'hi',
  createdAt: '2026-01-01T00:00:00Z',
};

describe('SupabasePostEngagementRepository', () => {
  it('getStats maps the row', async () => {
    const { client, rpc } = rpcClient({
      data: { post_id: 'p1', reaction_count: 2, comment_count: 3, share_count: 4 },
      error: null,
    });
    await expect(new SupabasePostEngagementRepository(client).getStats('p1')).resolves.toEqual({
      postId: 'p1',
      reactionCount: 2,
      commentCount: 3,
      shareCount: 4,
    });
    expect(rpc).toHaveBeenCalledWith('rpc_get_post_engagement_stats', { p_post_id: 'p1' });
  });

  it('getStats returns null for no row and throws on error', async () => {
    await expect(
      new SupabasePostEngagementRepository(rpcClient({ data: null, error: null }).client).getStats('p'),
    ).resolves.toBeNull();
    const err = new Error('boom');
    await expect(
      new SupabasePostEngagementRepository(rpcClient({ data: null, error: err }).client).getStats('p'),
    ).rejects.toBe(err);
  });

  it('setReaction calls the rpc and propagates errors', async () => {
    const { client, rpc } = rpcClient({ data: null, error: null });
    await new SupabasePostEngagementRepository(client).setReaction('p1', 'like');
    expect(rpc).toHaveBeenCalledWith('rpc_set_post_reaction', { p_post_id: 'p1', p_reaction_type: 'like' });
    const err = new Error('x');
    await expect(
      new SupabasePostEngagementRepository(rpcClient({ data: null, error: err }).client).setReaction('p1', null),
    ).rejects.toBe(err);
  });

  it('createComment maps the row and defaults parent to null', async () => {
    const { client, rpc } = rpcClient({ data: commentRow, error: null });
    await expect(new SupabasePostEngagementRepository(client).createComment('p1', 'hi')).resolves.toEqual(mapped);
    expect(rpc).toHaveBeenCalledWith('rpc_create_post_comment', {
      p_post_id: 'p1',
      p_body: 'hi',
      p_parent_comment_id: null,
    });
    const err = new Error('x');
    await expect(
      new SupabasePostEngagementRepository(rpcClient({ data: null, error: err }).client).createComment('p', 'b', 'c0'),
    ).rejects.toBe(err);
  });

  function fromClient(result: { data: unknown; error: unknown }) {
    const chain: any = {};
    for (const m of ['select', 'eq', 'order']) chain[m] = vi.fn(() => chain);
    chain.limit = vi.fn(async () => result);
    return { client: { from: vi.fn(() => chain) } as unknown as SupabaseClient<any>, chain };
  }

  it('listComments maps rows, handles null and errors', async () => {
    const { client, chain } = fromClient({ data: [commentRow], error: null });
    await expect(new SupabasePostEngagementRepository(client).listComments('p1')).resolves.toEqual([mapped]);
    expect(chain.limit).toHaveBeenCalledWith(40);
    await expect(
      new SupabasePostEngagementRepository(fromClient({ data: null, error: null }).client).listComments('p1', 5),
    ).resolves.toEqual([]);
    const err = new Error('x');
    await expect(
      new SupabasePostEngagementRepository(fromClient({ data: null, error: err }).client).listComments('p1'),
    ).rejects.toBe(err);
  });
});
