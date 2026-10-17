import { describe, it, expect, vi, afterEach } from 'vitest';
import { SupabaseChatV2Realtime, TYPING_THROTTLE_MS } from '../SupabaseChatV2Realtime';
import { flush, makeFakeRealtime } from '../../realtime/__tests__/fakeRealtime';

afterEach(() => vi.useRealTimers());

async function sub(cb: Parameters<SupabaseChatV2Realtime['subscribeTyping']>[2] = {}) {
  const f = makeFakeRealtime();
  const s = new SupabaseChatV2Realtime(f.client).subscribeTyping('c1', 'me', cb);
  await flush();
  return { f, s, ch: f.created[0]! };
}

describe('SupabaseChatV2Realtime.subscribeTyping', () => {
  it('opens the private chat:<id>:typing topic without self-echo', async () => {
    const { ch } = await sub();
    expect(ch.name).toBe('chat:c1:typing');
    expect(ch.config).toEqual({ private: true, broadcast: { self: false } });
  });

  it('forwards peer typing, ignores self/invalid payloads', async () => {
    const onPeerTyping = vi.fn();
    const { ch } = await sub({ onPeerTyping });
    ch.emit('broadcast', 'typing', { payload: { userId: 'me', typing: true } });
    ch.emit('broadcast', 'typing', { payload: {} });
    ch.emit('broadcast', 'typing', {});
    ch.emit('broadcast', 'typing', { payload: { userId: 'peer', typing: 1 } });
    expect(onPeerTyping).toHaveBeenCalledTimes(1);
    expect(onPeerTyping).toHaveBeenCalledWith({ userId: 'peer', typing: true });
  });

  it('reports channel errors', async () => {
    const onError = vi.fn();
    const { ch } = await sub({ onError });
    ch.statusCb!('SUBSCRIBED');
    ch.statusCb!('CHANNEL_ERROR');
    ch.statusCb!('TIMED_OUT');
    expect(onError).toHaveBeenCalledTimes(2);
    expect((onError.mock.calls[1]?.[0] as Error).message).toBe('typing channel timed_out');
  });

  it('throttles typing=true, sends false only after true, then cleans up', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(10_000);
    const { f, s, ch } = await sub();
    s.sendTyping(false); // nothing to stop yet
    expect(ch.send).not.toHaveBeenCalled();
    s.sendTyping(true);
    s.sendTyping(true);
    expect(ch.send).toHaveBeenCalledTimes(1);
    vi.setSystemTime(10_000 + TYPING_THROTTLE_MS + 1);
    s.sendTyping(true);
    expect(ch.send).toHaveBeenCalledTimes(2);
    s.unsubscribe();
    expect(ch.send).toHaveBeenLastCalledWith({ type: 'broadcast', event: 'typing', payload: { userId: 'me', typing: false } });
    expect(f.live).toHaveLength(0);
  });

  it('is inert after unsubscribe (no channel re-created = no leak)', async () => {
    const { f, s, ch } = await sub();
    s.unsubscribe();
    s.unsubscribe();
    s.sendTyping(true);
    expect(ch.send).not.toHaveBeenCalled();
    expect(f.created).toHaveLength(1);
    expect(f.removeChannel).toHaveBeenCalledTimes(1);
  });

  it('drops sends before the channel is open', () => {
    const f = makeFakeRealtime();
    const s = new SupabaseChatV2Realtime(f.client).subscribeTyping('c1', 'me', {});
    s.sendTyping(true);
    s.unsubscribe();
    expect(f.created).toHaveLength(0);
  });
});
