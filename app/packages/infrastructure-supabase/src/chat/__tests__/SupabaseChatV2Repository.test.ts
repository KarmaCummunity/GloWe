import { describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseChatV2Repository } from '../SupabaseChatV2Repository';

/* eslint-disable @typescript-eslint/no-explicit-any */

function makeClient(opts: {
  rpc?: (fn: string, args: unknown) => Promise<{ data: unknown; error: { message: string } | null }>;
  selectData?: unknown;
  selectError?: { message: string } | null;
}): SupabaseClient<any> {
  return {
    rpc: async (fn: string, args: unknown) =>
      opts.rpc?.(fn, args) ?? { data: null, error: null },
    from: () => ({
      select: () => ({
        in: async () => ({ data: opts.selectData ?? [], error: opts.selectError ?? null }),
      }),
    }),
  } as unknown as SupabaseClient<any>;
}

describe('SupabaseChatV2Repository', () => {
  it('setMessageReaction forwards RPC args', async () => {
    const calls: unknown[] = [];
    const repo = new SupabaseChatV2Repository(
      makeClient({
        rpc: async (_fn, args) => {
          calls.push(args);
          return { data: null, error: null };
        },
      }),
    );
    await repo.setMessageReaction('m1', 'like');
    expect(calls[0]).toEqual({ p_message_id: 'm1', p_reaction_type: 'like' });
  });

  it('sendMediaMessage maps row to Message', async () => {
    const repo = new SupabaseChatV2Repository(
      makeClient({
        rpc: async () => ({
          data: {
            message_id: 'm2',
            chat_id: 'c1',
            sender_id: 'u1',
            body: 'hi',
            status: 'sent',
            created_at: '2026-01-01T00:00:00.000Z',
            delivered_at: null,
            read_at: null,
            media_payload: { type: 'image' },
          },
          error: null,
        }),
      }),
    );
    const msg = await repo.sendMediaMessage('c1', { type: 'image' }, 'cap');
    expect(msg.messageId).toBe('m2');
    expect(msg.chatId).toBe('c1');
  });

  it('listMessageReactions returns empty for no ids', async () => {
    const repo = new SupabaseChatV2Repository(makeClient({}));
    await expect(repo.listMessageReactions([])).resolves.toEqual([]);
  });

  it('listMessageReactions maps rows', async () => {
    const repo = new SupabaseChatV2Repository(
      makeClient({
        selectData: [{ message_id: 'm1', user_id: 'u1', reaction_type: 'love' }],
      }),
    );
    const rows = await repo.listMessageReactions(['m1']);
    expect(rows).toEqual([{ messageId: 'm1', userId: 'u1', reactionType: 'love' }]);
  });
});
