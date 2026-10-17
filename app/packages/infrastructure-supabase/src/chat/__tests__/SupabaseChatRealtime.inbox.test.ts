import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseChatRealtime } from '../SupabaseChatRealtime';

/* eslint-disable @typescript-eslint/no-explicit-any */

interface OnCall {
  event: string;
  config: any;
  handler: (payload: { new: unknown }) => void;
}
interface FakeChannel {
  topic: string;
  onCalls: OnCall[];
  statusCb?: (status: string) => void;
}

function makeFakeClient(rpcImpl?: () => Promise<{ data: unknown; error: unknown }>): {
  client: SupabaseClient<any>;
  channels: FakeChannel[];
  removed: FakeChannel[];
  rpcCalls: string[];
} {
  const channels: FakeChannel[] = [];
  const removed: FakeChannel[] = [];
  const rpcCalls: string[] = [];
  const builderToFc = new WeakMap<object, FakeChannel>();

  const client = {
    channel: (topic: string) => {
      const fc: FakeChannel = { topic, onCalls: [] };
      channels.push(fc);
      const builder: any = {
        on: (event: string, config: any, handler: (payload: { new: unknown }) => void) => {
          fc.onCalls.push({ event, config, handler });
          return builder;
        },
        subscribe: (statusCb?: (status: string) => void) => {
          fc.statusCb = statusCb;
          return builder;
        },
      };
      builderToFc.set(builder, fc);
      return builder;
    },
    removeChannel: (ch: object) => {
      const fc = builderToFc.get(ch);
      if (fc) removed.push(fc);
      return Promise.resolve();
    },
    rpc: async (fn: string) => {
      rpcCalls.push(fn);
      return rpcImpl ? rpcImpl() : { data: 0, error: null };
    },
  } as unknown as SupabaseClient<any>;

  return { client, channels, removed, rpcCalls };
}

const CHAT_ROW = {
  chat_id: 'c_1',
  participant_a: 'u_1',
  participant_b: 'u_2',
  anchor_post_id: null,
  is_support_thread: false,
  last_message_at: '2026-05-16T12:00:00.000Z',
  created_at: '2026-05-16T11:00:00.000Z',
};

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

function sub(
  client: SupabaseClient<any>,
  extra: Record<string, any> = {},
  options?: { getSnapshotEpoch?: () => number },
) {
  const repo = new SupabaseChatRealtime(client);
  const cb = { onChatChanged: vi.fn(), onUnreadTotalChanged: vi.fn(), ...extra };
  const unsub = repo.subscribeToInbox('u_me', cb, options);
  return { cb, unsub };
}

describe('SupabaseChatRealtime — subscribeToInbox', () => {
  it('opens inbox:<userId>:<rand> with a single chats UPDATE listener (messages is Broadcast-only since 0349)', () => {
    const { client, channels } = makeFakeClient();
    sub(client);
    expect(channels[0]?.topic).toMatch(/^inbox:u_me:[a-z0-9]+$/);
    expect(channels[0]?.onCalls.map((c) => c.config)).toEqual([
      { event: 'UPDATE', schema: 'public', table: 'chats' },
    ]);
  });

  it('routes UPDATE chats through rowToChat → onChatChanged', () => {
    const { client, channels } = makeFakeClient();
    const { cb } = sub(client);
    channels[0]?.onCalls[0]?.handler({ new: CHAT_ROW });
    expect(cb.onChatChanged).toHaveBeenCalledWith(expect.objectContaining({ chatId: 'c_1' }));
  });

  it('debounces unread RPC: rapid chat bumps collapse into one rpc_chat_unread_total call after 200ms', async () => {
    const { client, channels, rpcCalls } = makeFakeClient(async () => ({ data: 5, error: null }));
    const { cb } = sub(client);
    channels[0]?.onCalls[0]?.handler({ new: CHAT_ROW });
    channels[0]?.onCalls[0]?.handler({ new: CHAT_ROW });
    channels[0]?.onCalls[0]?.handler({ new: CHAT_ROW });
    expect(rpcCalls).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(200);
    expect(rpcCalls).toEqual(['rpc_chat_unread_total']);
    expect(cb.onUnreadTotalChanged).toHaveBeenCalledWith(5);
  });

  it('does not call onUnreadTotalChanged when the RPC errors', async () => {
    const { client, channels } = makeFakeClient(async () => ({ data: null, error: { message: 'boom' } }));
    const { cb } = sub(client);
    channels[0]?.onCalls[0]?.handler({ new: CHAT_ROW });
    await vi.advanceTimersByTimeAsync(200);
    expect(cb.onUnreadTotalChanged).not.toHaveBeenCalled();
  });

  it('drops a stale RPC result when getSnapshotEpoch changes between timer-fire and RPC-resolve', async () => {
    // The epoch is captured INSIDE the timer body (after debounce). Race:
    // inbox snapshot rebuilt while the RPC was in flight — result is stale.
    let epoch = 1;
    let resolveRpc!: (v: { data: unknown; error: unknown }) => void;
    const rpcPromise = new Promise<{ data: unknown; error: unknown }>((r) => { resolveRpc = r; });
    const { client, channels } = makeFakeClient(() => rpcPromise);
    const { cb } = sub(client, {}, { getSnapshotEpoch: () => epoch });

    channels[0]?.onCalls[0]?.handler({ new: CHAT_ROW });
    await vi.advanceTimersByTimeAsync(200); // timer body runs; e0 captured = 1; awaits rpc.
    epoch = 2;                              // snapshot rebuilt mid-flight.
    resolveRpc({ data: 9, error: null });
    await Promise.resolve();
    await Promise.resolve();

    expect(cb.onUnreadTotalChanged).not.toHaveBeenCalled();
  });

  it('unsubscribe removes the channel and clears any pending debounce timer', () => {
    const { client, channels, removed } = makeFakeClient();
    const { unsub } = sub(client);
    channels[0]?.onCalls[0]?.handler({ new: CHAT_ROW }); // arm timer
    unsub();
    expect(removed[0]).toBe(channels[0]);
    expect(() => vi.advanceTimersByTime(500)).not.toThrow();
  });
});

