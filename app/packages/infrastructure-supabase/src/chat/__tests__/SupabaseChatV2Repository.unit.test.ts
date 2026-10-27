import { describe, it, expect, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseChatV2Repository } from '../SupabaseChatV2Repository';

/* eslint-disable @typescript-eslint/no-explicit-any */

const msgRow = {
  message_id: 'm1',
  chat_id: 'c1',
  sender_id: 'u1',
  kind: 'user',
  body: null,
  system_payload: null,
  media_payload: { type: 'image' },
  status: 'sent',
  created_at: '2026-01-01T00:00:00Z',
  delivered_at: null,
  read_at: null,
};

function rpcRepo(result: { data: unknown; error: unknown }) {
  const rpc = vi.fn(async () => result);
  return { repo: new SupabaseChatV2Repository({ rpc } as unknown as SupabaseClient<any>), rpc };
}

function fromRepo(result: { data: unknown; error: unknown }) {
  const chain: any = { select: vi.fn(() => chain), in: vi.fn(async () => result) };
  const from = vi.fn(() => chain);
  return { repo: new SupabaseChatV2Repository({ from } as unknown as SupabaseClient<any>), from, chain };
}

describe('SupabaseChatV2Repository', () => {
  it('setMessageReaction calls rpc and maps errors', async () => {
    const { repo, rpc } = rpcRepo({ data: null, error: null });
    await repo.setMessageReaction('m1', 'love');
    expect(rpc).toHaveBeenCalledWith('rpc_set_message_reaction', { p_message_id: 'm1', p_reaction_type: 'love' });
    await expect(
      rpcRepo({ data: null, error: { code: 'XX000', message: 'boom' } }).repo.setMessageReaction('m1', null),
    ).rejects.toBeTruthy();
  });

  it('sendMediaMessage maps the returned row', async () => {
    const { repo, rpc } = rpcRepo({ data: msgRow, error: null });
    const msg = await repo.sendMediaMessage('c1', { type: 'image' });
    expect(msg.messageId).toBe('m1');
    expect(msg.body).toBe('');
    expect(msg.mediaPayload).toEqual({ type: 'image' });
    expect(rpc).toHaveBeenCalledWith('rpc_send_chat_media_message', {
      p_chat_id: 'c1',
      p_media_payload: { type: 'image' },
      p_body: null,
    });
    await expect(
      rpcRepo({ data: null, error: { code: 'XX000', message: 'boom' } }).repo.sendMediaMessage('c1', {}, 'cap'),
    ).rejects.toBeTruthy();
  });

  it('listMessageReactions short-circuits, maps rows, and maps errors', async () => {
    const empty = fromRepo({ data: [], error: null });
    await expect(empty.repo.listMessageReactions([])).resolves.toEqual([]);
    expect(empty.from).not.toHaveBeenCalled();

    const ok = fromRepo({ data: [{ message_id: 'm1', user_id: 'u1', reaction_type: 'like' }], error: null });
    await expect(ok.repo.listMessageReactions(['m1'])).resolves.toEqual([
      { messageId: 'm1', userId: 'u1', reactionType: 'like' },
    ]);
    expect(ok.chain.in).toHaveBeenCalledWith('message_id', ['m1']);

    await expect(fromRepo({ data: null, error: null }).repo.listMessageReactions(['m1'])).resolves.toEqual([]);
    await expect(
      fromRepo({ data: null, error: { code: 'XX000', message: 'boom' } }).repo.listMessageReactions(['m1']),
    ).rejects.toBeTruthy();
  });
});
