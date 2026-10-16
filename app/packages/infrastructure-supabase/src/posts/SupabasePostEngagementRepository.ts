// KC#867 — post reactions/comments/shares via SECURITY INVOKER RPCs.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../database.types';

export type PostReactionType = 'like' | 'support' | 'thanks';

export type PostEngagementStats = {
  postId: string;
  reactionCount: number;
  commentCount: number;
  shareCount: number;
};

export type PostCommentRow = {
  commentId: string;
  postId: string;
  authorId: string;
  parentCommentId: string | null;
  body: string;
  createdAt: string;
};

export class SupabasePostEngagementRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async getStats(postId: string): Promise<PostEngagementStats | null> {
    const { data, error } = await this.client.rpc(
      'rpc_get_post_engagement_stats' as never,
      { p_post_id: postId } as never,
    );
    if (error) throw error;
    const row = data as {
      post_id: string;
      reaction_count: number;
      comment_count: number;
      share_count: number;
    } | null;
    if (!row) return null;
    return {
      postId: row.post_id,
      reactionCount: row.reaction_count,
      commentCount: row.comment_count,
      shareCount: row.share_count,
    };
  }

  async setReaction(postId: string, reactionType: PostReactionType | null): Promise<void> {
    const { error } = await this.client.rpc(
      'rpc_set_post_reaction' as never,
      { p_post_id: postId, p_reaction_type: reactionType } as never,
    );
    if (error) throw error;
  }

  async createComment(
    postId: string,
    body: string,
    parentCommentId?: string | null,
  ): Promise<PostCommentRow> {
    const { data, error } = await this.client.rpc(
      'rpc_create_post_comment' as never,
      {
        p_post_id: postId,
        p_body: body,
        p_parent_comment_id: parentCommentId ?? null,
      } as never,
    );
    if (error) throw error;
    const row = data as {
      comment_id: string;
      post_id: string;
      author_id: string;
      parent_comment_id: string | null;
      body: string;
      created_at: string;
    };
    return {
      commentId: row.comment_id,
      postId: row.post_id,
      authorId: row.author_id,
      parentCommentId: row.parent_comment_id,
      body: row.body,
      createdAt: row.created_at,
    };
  }

  async listComments(postId: string, limit = 40): Promise<PostCommentRow[]> {
    const { data, error } = await this.client
      .from('post_comments' as never)
      .select('comment_id, post_id, author_id, parent_comment_id, body, created_at')
      .eq('post_id', postId)
      .eq('status', 'active')
      .order('created_at', { ascending: true })
      .limit(limit);
    if (error) throw error;
    type CommentRow = {
      comment_id: string;
      post_id: string;
      author_id: string;
      parent_comment_id: string | null;
      body: string;
      created_at: string;
    };
    const rows = (data ?? []) as CommentRow[];
    return rows.map((row) => ({
      commentId: row.comment_id,
      postId: row.post_id,
      authorId: row.author_id,
      parentCommentId: row.parent_comment_id,
      body: row.body,
      createdAt: row.created_at,
    }));
  }
}
