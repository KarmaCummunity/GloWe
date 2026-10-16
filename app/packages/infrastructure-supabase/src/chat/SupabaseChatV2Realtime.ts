// KC#873 — typing (broadcast) + optional presence on private chat channels.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { Database } from '../database.types';

export type TypingCallbacks = {
  onPeerTyping?: (payload: { userId: string; typing: boolean }) => void;
  onError?: (err: Error) => void;
};

export type TypingSubscription = {
  sendTyping: (typing: boolean) => void;
  unsubscribe: () => void;
};

const TYPING_THROTTLE_MS = 800;

export class SupabaseChatV2Realtime {
  constructor(private readonly client: SupabaseClient<Database>) {}

  subscribeTyping(chatId: string, userId: string, cb: TypingCallbacks): TypingSubscription {
    const topic = `chat:${chatId}:typing`;
    let lastSent = 0;
    let channel: RealtimeChannel | null = null;

    const ensureChannel = () => {
      if (channel) return channel;
      channel = this.client
        .channel(topic, { config: { private: true, broadcast: { self: false } } })
        .on('broadcast', { event: 'typing' }, (payload) => {
          const p = payload.payload as { userId?: string; typing?: boolean };
          if (!p?.userId || p.userId === userId) return;
          cb.onPeerTyping?.({ userId: p.userId, typing: !!p.typing });
        })
        .subscribe((status) => {
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            cb.onError?.(new Error(`typing channel ${status.toLowerCase()}`));
          }
        });
      return channel;
    };

    ensureChannel();

    const sendTyping = (typing: boolean) => {
      const now = Date.now();
      if (typing && now - lastSent < TYPING_THROTTLE_MS) return;
      lastSent = now;
      void ensureChannel().send({
        type: 'broadcast',
        event: 'typing',
        payload: { userId, typing },
      });
    };

    return {
      sendTyping,
      unsubscribe: () => {
        sendTyping(false);
        if (channel) void this.client.removeChannel(channel);
        channel = null;
      },
    };
  }

  subscribePresence(chatId: string, userId: string, displayName: string): () => void {
    const topic = `chat:${chatId}:presence`;
    const channel = this.client
      .channel(topic, { config: { private: true, presence: { key: userId } } })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ userId, displayName, at: new Date().toISOString() });
        }
      });

    return () => {
      void channel.untrack();
      void this.client.removeChannel(channel);
    };
  }
}
