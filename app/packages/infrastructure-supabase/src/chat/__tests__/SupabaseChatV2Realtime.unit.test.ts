import { describe, it, expect, vi, afterEach } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseChatV2Realtime } from '../SupabaseChatV2Realtime';

/* eslint-disable @typescript-eslint/no-explicit-any */

function fakeClient() {
  const state: { handler?: (p: any) => void; status?: (s: string) => unknown } = {};
  const channel: any = {
    on: vi.fn((_t: string, _f: unknown, h: (p: any) => void) => {
      state.handler = h;
      return channel;
    }),
    subscribe: vi.fn((cb: (s: string) => unknown) => {
      state.status = cb;
      return channel;
    }),
    send: vi.fn(async () => 'ok'),
    track: vi.fn(async () => 'ok'),
    untrack: vi.fn(async () => 'ok'),
  };
  const client = {
    channel: vi.fn(() => channel),
    removeChannel: vi.fn(async () => 'ok'),
  };
  return { client: client as unknown as SupabaseClient<any>, raw: client, channel, state };
}

afterEach(() => vi.useRealTimers());

describe('SupabaseChatV2Realtime.subscribeTyping', () => {
  it('forwards peer typing, ignores self/invalid payloads', () => {
    const f = fakeClient();
    const onPeerTyping = vi.fn();
    new SupabaseChatV2Realtime(f.client).subscribeTyping('c1', 'me', { onPeerTyping });
    expect(f.raw.channel).toHaveBeenCalledWith('chat:c1:typing', expect.anything());
    f.state.handler!({ payload: { userId: 'me', typing: true } });
    f.state.handler!({ payload: {} });
    f.state.handler!({ payload: { userId: 'peer', typing: 1 } });
    expect(onPeerTyping).toHaveBeenCalledTimes(1);
    expect(onPeerTyping).toHaveBeenCalledWith({ userId: 'peer', typing: true });
  });

  it('reports channel errors', () => {
    const f = fakeClient();
    const onError = vi.fn();
    new SupabaseChatV2Realtime(f.client).subscribeTyping('c1', 'me', { onError });
    f.state.status!('SUBSCRIBED');
    f.state.status!('CHANNEL_ERROR');
    f.state.status!('TIMED_OUT');
    expect(onError).toHaveBeenCalledTimes(2);
    expect((onError.mock.calls[1]?.[0] as Error | undefined)?.message).toBe('typing channel timed_out');
  });

  it('throttles typing=true, always sends false, unsubscribes', () => {
    vi.useFakeTimers();
    vi.setSystemTime(10_000);
    const f = fakeClient();
    const sub = new SupabaseChatV2Realtime(f.client).subscribeTyping('c1', 'me', {});
    sub.sendTyping(true);
    sub.sendTyping(true);
    expect(f.channel.send).toHaveBeenCalledTimes(1);
    vi.setSystemTime(11_000);
    sub.sendTyping(true);
    expect(f.channel.send).toHaveBeenCalledTimes(2);
    sub.unsubscribe();
    expect(f.channel.send).toHaveBeenLastCalledWith({
      type: 'broadcast',
      event: 'typing',
      payload: { userId: 'me', typing: false },
    });
    expect(f.raw.removeChannel).toHaveBeenCalledTimes(1);
    // channel recreated lazily after unsubscribe
    sub.sendTyping(false);
    expect(f.raw.channel).toHaveBeenCalledTimes(2);
  });
});

describe('SupabaseChatV2Realtime.subscribePresence', () => {
  it('tracks on SUBSCRIBED and cleans up', async () => {
    const f = fakeClient();
    const off = new SupabaseChatV2Realtime(f.client).subscribePresence('c1', 'me', 'Me');
    await f.state.status!('CLOSED');
    expect(f.channel.track).not.toHaveBeenCalled();
    await f.state.status!('SUBSCRIBED');
    expect(f.channel.track).toHaveBeenCalledWith(expect.objectContaining({ userId: 'me', displayName: 'Me' }));
    off();
    expect(f.channel.untrack).toHaveBeenCalled();
    expect(f.raw.removeChannel).toHaveBeenCalled();
  });
});
