import { describe, it, expect, vi } from 'vitest';
import { SupabaseChatRealtime, broadcastRecord } from '../SupabaseChatRealtime';
import { flush, makeFakeRealtime } from '../../realtime/__tests__/fakeRealtime';

const MSG_ROW = {
  message_id: 'm_1',
  chat_id: 'c_1',
  sender_id: 'u_1',
  kind: 'user',
  body: 'hi',
  system_payload: null,
  status: 'delivered',
  created_at: '2026-05-16T12:00:00.000Z',
  delivered_at: '2026-05-16T12:00:01.000Z',
  read_at: null,
};

const CHAT_ROW = {
  chat_id: 'c_1',
  participant_a: 'u_1',
  participant_b: 'u_2',
  anchor_post_id: null,
  is_support_thread: false,
  last_message_at: '2026-05-16T12:00:00.000Z',
  created_at: '2026-05-16T11:00:00.000Z',
};

// realtime.broadcast_changes envelope (0259 trigger).
const envelope = (op: string, record: unknown) => ({
  type: 'broadcast',
  event: op,
  payload: { operation: op, schema: 'public', table: 'messages', record, old_record: null },
});

async function sub(extra: Record<string, unknown> = {}) {
  const f = makeFakeRealtime();
  const cb = { onMessage: vi.fn(), onMessageStatusChanged: vi.fn(), onError: vi.fn(), ...extra };
  const unsub = new SupabaseChatRealtime(f.client).subscribeToChat('c_1', cb);
  await flush();
  const messages = f.created.find((c) => c.name === 'chat:c_1:messages')!;
  const chatRow = f.created.find((c) => c.name.startsWith('chat-row:c_1:'));
  return { f, cb, unsub, messages, chatRow };
}

describe('SupabaseChatRealtime — subscribeToChat', () => {
  it('listens on the private chat:<id>:messages Broadcast topic (0259)', async () => {
    const { messages } = await sub();
    expect(messages.config).toEqual({ private: true });
    expect(messages.bindings.map((b) => [b.type, b.filter.event])).toEqual([
      ['broadcast', 'INSERT'],
      ['broadcast', 'UPDATE'],
    ]);
  });

  it('INSERT broadcast → onMessage with the mapped row', async () => {
    const { messages, cb } = await sub();
    messages.emit('broadcast', 'INSERT', envelope('INSERT', MSG_ROW));
    expect(cb.onMessage).toHaveBeenCalledTimes(1);
    expect(cb.onMessage.mock.calls[0]?.[0]).toMatchObject({ messageId: 'm_1', chatId: 'c_1' });
  });

  it('UPDATE broadcast → onMessageStatusChanged (read receipt)', async () => {
    const { messages, cb } = await sub();
    messages.emit('broadcast', 'UPDATE', envelope('UPDATE', { ...MSG_ROW, status: 'read', read_at: '2026-05-16T12:00:05.000Z' }));
    expect(cb.onMessageStatusChanged).toHaveBeenCalledWith({
      messageId: 'm_1',
      status: 'read',
      deliveredAt: '2026-05-16T12:00:01.000Z',
      readAt: '2026-05-16T12:00:05.000Z',
    });
  });

  it('ignores broadcasts without a record (e.g. reaction pings)', async () => {
    const { messages, cb } = await sub();
    messages.emit('broadcast', 'INSERT', { payload: { message_id: 'm_1', op: 'INSERT' } });
    messages.emit('broadcast', 'UPDATE', { payload: null });
    expect(cb.onMessage).not.toHaveBeenCalled();
    expect(cb.onMessageStatusChanged).not.toHaveBeenCalled();
  });

  it('routes chats UPDATE (postgres_changes, unique topic) → onChatChanged', async () => {
    const onChatChanged = vi.fn();
    const { chatRow } = await sub({ onChatChanged });
    expect(chatRow!.bindings[0]!.filter).toEqual({ event: 'UPDATE', schema: 'public', table: 'chats', filter: 'chat_id=eq.c_1' });
    chatRow!.bindings[0]!.handler({ new: CHAT_ROW });
    expect(onChatChanged).toHaveBeenCalledWith(expect.objectContaining({ chatId: 'c_1' }));
  });

  it('opens no chat-row channel when onChatChanged is omitted', async () => {
    const { chatRow } = await sub();
    expect(chatRow).toBeUndefined();
  });

  it('routes CHANNEL_ERROR / TIMED_OUT to onError, not SUBSCRIBED', async () => {
    const { messages, cb } = await sub();
    messages.statusCb!('SUBSCRIBED');
    messages.statusCb!('CHANNEL_ERROR');
    messages.statusCb!('TIMED_OUT');
    expect(cb.onError).toHaveBeenCalledTimes(2);
    expect(cb.onError.mock.calls[0]?.[0]?.message).toBe('chat channel channel_error');
    expect(cb.onError.mock.calls[1]?.[0]?.message).toBe('chat channel timed_out');
  });

  it('unsubscribe removes every channel it opened', async () => {
    const { f, unsub } = await sub({ onChatChanged: vi.fn() });
    expect(f.live).toHaveLength(2);
    unsub();
    expect(f.live).toHaveLength(0);
  });

  it('unsubscribe before the channel opens leaks nothing', async () => {
    const f = makeFakeRealtime();
    const unsub = new SupabaseChatRealtime(f.client).subscribeToChat('c_1', {
      onMessage: vi.fn(), onMessageStatusChanged: vi.fn(), onError: vi.fn(),
    });
    unsub();
    await flush();
    expect(f.live).toHaveLength(0);
  });
});

describe('broadcastRecord', () => {
  it('extracts the record or returns null', () => {
    expect(broadcastRecord({ payload: { record: { a: 1 } } })).toEqual({ a: 1 });
    expect(broadcastRecord({ payload: { record: null } })).toBeNull();
    expect(broadcastRecord({})).toBeNull();
  });
});
