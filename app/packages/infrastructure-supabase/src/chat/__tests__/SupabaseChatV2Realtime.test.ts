import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseChatV2Realtime } from '../SupabaseChatV2Realtime';

/* eslint-disable @typescript-eslint/no-explicit-any */

describe('SupabaseChatV2Realtime', () => {
  it('subscribeTyping forwards peer events and throttles sends', () => {
    vi.useFakeTimers();
    const handlers: Array<(payload: { payload: unknown }) => void> = [];
    const send = vi.fn();
    const channel = {
      on: (_ev: string, _filter: unknown, cb: (payload: { payload: unknown }) => void) => {
        handlers.push(cb);
        return channel;
      },
      subscribe: (cb: (status: string) => void) => {
        cb('SUBSCRIBED');
        return channel;
      },
      send,
    };
    const client = {
      channel: () => channel,
      removeChannel: vi.fn(),
    } as unknown as SupabaseClient<any>;

    const rt = new SupabaseChatV2Realtime(client);
    const peer = vi.fn();
    const sub = rt.subscribeTyping('c1', 'me', { onPeerTyping: peer });

    handlers[0]?.({ payload: { userId: 'other', typing: true } });
    expect(peer).toHaveBeenCalledWith({ userId: 'other', typing: true });

    sub.sendTyping(true);
    sub.sendTyping(true);
    expect(send).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(900);
    sub.sendTyping(true);
    expect(send).toHaveBeenCalledTimes(2);

    sub.unsubscribe();
    expect(client.removeChannel).toHaveBeenCalled();
    vi.useRealTimers();
  });
});
