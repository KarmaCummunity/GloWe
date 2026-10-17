import { describe, it, expect, vi } from 'vitest';
import { isChannelFailure, openExactTopicChannel } from '../exactTopicChannel';
import { flush, makeFakeRealtime } from './fakeRealtime';

describe('openExactTopicChannel', () => {
  it('authorizes, binds and subscribes on the exact topic', async () => {
    const f = makeFakeRealtime();
    const bind = vi.fn();
    const onStatus = vi.fn();
    const m = openExactTopicChannel(f.client, 'feed:public', { private: true }, bind, onStatus);
    const ch = await m.ready;
    expect(f.setAuth).toHaveBeenCalledTimes(1);
    expect(f.channel).toHaveBeenCalledWith('feed:public', { config: { private: true } });
    expect(bind).toHaveBeenCalledWith(ch);
    f.created[0]!.statusCb!('SUBSCRIBED');
    expect(onStatus).toHaveBeenCalledWith('SUBSCRIBED', ch);
  });

  it('skips setAuth for public channels and survives setAuth failures', async () => {
    const f = makeFakeRealtime();
    await openExactTopicChannel(f.client, 'a', {}, () => {}).ready;
    expect(f.setAuth).not.toHaveBeenCalled();
    f.setAuth.mockRejectedValueOnce(new Error('no session'));
    const ch = await openExactTopicChannel(f.client, 'b', { private: true }, () => {}).ready;
    expect(ch).not.toBeNull();
  });

  it('tears down a stale cached channel with the same topic before re-creating', async () => {
    const f = makeFakeRealtime();
    const first = openExactTopicChannel(f.client, 'chat:c1:typing', { private: true }, () => {});
    await first.ready;
    // Simulate a remount before the previous removal finished: open again.
    const second = openExactTopicChannel(f.client, 'chat:c1:typing', { private: true }, () => {});
    await second.ready;
    expect(f.created).toHaveLength(2);
    expect(f.created[0]!.removed).toBe(true);
    expect(f.created[1]!.removed).toBe(false);
    expect(f.live).toHaveLength(1);
  });

  it('close() before open never creates a channel (no leak)', async () => {
    const f = makeFakeRealtime();
    const m = openExactTopicChannel(f.client, 'feed:public', { private: true }, () => {});
    m.close();
    expect(await m.ready).toBeNull();
    await flush();
    expect(f.created).toHaveLength(0);
  });

  it('close() after open removes the channel exactly once', async () => {
    const f = makeFakeRealtime();
    const m = openExactTopicChannel(f.client, 'feed:public', { private: true }, () => {});
    await m.ready;
    m.close();
    m.close();
    expect(f.removeChannel).toHaveBeenCalledTimes(1);
    expect(f.live).toHaveLength(0);
  });

  it('classifies failure statuses', () => {
    expect(isChannelFailure('CHANNEL_ERROR')).toBe(true);
    expect(isChannelFailure('TIMED_OUT')).toBe(true);
    expect(isChannelFailure('SUBSCRIBED')).toBe(false);
    expect(isChannelFailure('CLOSED')).toBe(false);
  });
});

describe('uniqueTopicSuffix', () => {
  it('never repeats within a process', async () => {
    const { uniqueTopicSuffix } = await import('../exactTopicChannel');
    const seen = new Set(Array.from({ length: 50 }, () => uniqueTopicSuffix()));
    expect(seen.size).toBe(50);
  });
});
