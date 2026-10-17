// Exact-topic realtime channels (private Broadcast / Presence).
//
// Private channels must use the exact topic the DB policies match on
// (`feed:public`, `chat:<id>:messages`, …), so the random-suffix trick used for
// postgres_changes channels is not available. The realtime client caches
// channels by topic and `removeChannel` is async, so a quick remount could get
// back a half-torn-down cached channel. `openExactTopicChannel` first removes
// any stale channel on the topic, then creates, binds and subscribes a fresh one.
// `close()` is idempotent and safe before the channel is open (no leak).

import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';

export type ChannelConfig = {
  private?: boolean;
  broadcast?: { self?: boolean; ack?: boolean };
  presence?: { key?: string };
};

export type ChannelStatusHandler = (status: string, channel: RealtimeChannel) => void;

export interface ManagedChannel {
  /** Resolves with the live channel, or null when closed before it opened. */
  readonly ready: Promise<RealtimeChannel | null>;
  close(): void;
}

// The subset of SupabaseClient used here (keeps tests light).
export type RealtimeHost = Pick<SupabaseClient, 'channel' | 'removeChannel' | 'getChannels'> & {
  realtime?: { setAuth?: (token?: string | null) => Promise<void> | void };
};

export function openExactTopicChannel(
  client: RealtimeHost,
  topic: string,
  config: ChannelConfig,
  bind: (channel: RealtimeChannel) => void,
  onStatus?: ChannelStatusHandler,
): ManagedChannel {
  let closed = false;
  let channel: RealtimeChannel | null = null;

  const ready = (async () => {
    try {
      // Private channels authorize with the current access token.
      if (config.private) await client.realtime?.setAuth?.();
    } catch {
      // The socket retries auth on join; fall through.
    }
    const stale = client.getChannels().filter((c) => c.topic === `realtime:${topic}`);
    await Promise.all(stale.map((s) => client.removeChannel(s)));
    if (closed) return null;
    const ch = client.channel(topic, { config });
    channel = ch;
    bind(ch);
    ch.subscribe((status) => onStatus?.(status, ch));
    return ch;
  })();

  return {
    ready,
    close: () => {
      if (closed) return;
      closed = true;
      if (channel) void client.removeChannel(channel);
      channel = null;
    },
  };
}

export function isChannelFailure(status: string): boolean {
  return status === 'CHANNEL_ERROR' || status === 'TIMED_OUT';
}

let topicSeq = 0;

/**
 * Per-process unique suffix for public postgres_changes topics (avoids reusing
 * a cached, already-joined channel). Not security-sensitive; no randomness needed.
 */
export function uniqueTopicSuffix(): string {
  topicSeq += 1;
  return `${Date.now().toString(36)}${topicSeq.toString(36)}`;
}
