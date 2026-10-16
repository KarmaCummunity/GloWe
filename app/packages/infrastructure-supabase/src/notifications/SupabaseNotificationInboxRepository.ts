// KC#869 — in-app notification inbox RPCs.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../database.types';

export type InboxNotification = {
  inboxId: string;
  category: string;
  world: string;
  kind: string;
  titleKey: string;
  bodyKey: string;
  bodyArgs: Record<string, unknown>;
  data: Record<string, unknown>;
  groupCount: number;
  readAt: string | null;
  createdAt: string;
};

type InboxRow = {
  inbox_id: string;
  category: string;
  world: string;
  kind: string;
  title_key: string;
  body_key: string;
  body_args: unknown;
  data: unknown;
  group_count: number;
  read_at: string | null;
  created_at: string;
};

function mapRow(row: InboxRow): InboxNotification {
  return {
    inboxId: row.inbox_id,
    category: row.category,
    world: row.world,
    kind: row.kind,
    titleKey: row.title_key,
    bodyKey: row.body_key,
    bodyArgs: (row.body_args ?? {}) as Record<string, unknown>,
    data: (row.data ?? {}) as Record<string, unknown>,
    groupCount: row.group_count,
    readAt: row.read_at,
    createdAt: row.created_at,
  };
}

export class SupabaseNotificationInboxRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async list(params?: {
    limit?: number;
    cursorCreatedAt?: string | null;
    cursorInboxId?: string | null;
    category?: string | null;
    world?: string | null;
  }): Promise<InboxNotification[]> {
    const { data, error } = await this.client.rpc(
      'rpc_notification_inbox_list' as never,
      {
        p_limit: params?.limit ?? 30,
        p_cursor_created_at: params?.cursorCreatedAt ?? null,
        p_cursor_inbox_id: params?.cursorInboxId ?? null,
        p_category: params?.category ?? null,
        p_world: params?.world ?? null,
      } as never,
    );
    if (error) throw error;
    const rows = (data ?? []) as InboxRow[];
    return rows.map((row) => mapRow(row));
  }

  async unreadCount(): Promise<number> {
    const { data, error } = await this.client.rpc('rpc_notification_inbox_unread_count' as never);
    if (error) throw error;
    return Number(data ?? 0);
  }

  async markRead(inboxId: string): Promise<void> {
    const { error } = await this.client.rpc(
      'rpc_notification_inbox_mark_read' as never,
      { p_inbox_id: inboxId } as never,
    );
    if (error) throw error;
  }

  async markAllRead(): Promise<void> {
    const { error } = await this.client.rpc('rpc_notification_inbox_mark_all_read' as never);
    if (error) throw error;
  }
}
