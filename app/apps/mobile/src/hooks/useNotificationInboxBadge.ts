// KC#869 — unread badge via RPC + Realtime Broadcast user:<id>:notifications.

import { useCallback, useEffect, useState } from 'react';
import { container, supabase } from '../lib/container';

export function useNotificationInboxBadge(userId: string | null | undefined): number {
  const [unread, setUnread] = useState(0);

  const refresh = useCallback(async () => {
    if (!userId) {
      setUnread(0);
      return;
    }
    try {
      const n = await container.notificationInbox.unreadCount();
      setUnread(n);
    } catch {
      /* offline / schema not migrated yet */
    }
  }, [userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!userId) return;
    const topic = `user:${userId}:notifications`;
    const channel = supabase
      .channel(topic, { config: { private: true } })
      .on('broadcast', { event: 'badge' }, (payload) => {
        const count = (payload.payload as { unread_count?: number })?.unread_count;
        if (typeof count === 'number') setUnread(count);
        else void refresh();
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, refresh]);

  return unread;
}
