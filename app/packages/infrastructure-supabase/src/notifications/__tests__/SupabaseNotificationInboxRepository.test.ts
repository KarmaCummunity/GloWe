import { describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseNotificationInboxRepository } from '../SupabaseNotificationInboxRepository';

/* eslint-disable @typescript-eslint/no-explicit-any */

function makeClient(
  rpcImpl: (fn: string, args?: unknown) => Promise<{ data: unknown; error: Error | null }>,
): SupabaseClient<any> {
  return { rpc: rpcImpl } as unknown as SupabaseClient<any>;
}

describe('SupabaseNotificationInboxRepository', () => {
  it('list maps inbox rows', async () => {
    const repo = new SupabaseNotificationInboxRepository(
      makeClient(async () => ({
        data: [
          {
            inbox_id: 'i1',
            category: 'social',
            world: 'kc',
            kind: 'follow',
            title_key: 't',
            body_key: 'b',
            body_args: { n: 1 },
            data: { x: 1 },
            group_count: 2,
            read_at: null,
            created_at: '2026-01-01T00:00:00.000Z',
          },
        ],
        error: null,
      })),
    );
    const rows = await repo.list({ limit: 10 });
    expect(rows[0]?.inboxId).toBe('i1');
    expect(rows[0]?.bodyArgs).toEqual({ n: 1 });
  });

  it('unreadCount coerces number', async () => {
    const repo = new SupabaseNotificationInboxRepository(
      makeClient(async () => ({ data: 7, error: null })),
    );
    await expect(repo.unreadCount()).resolves.toBe(7);
  });

  it('markRead and markAllRead call RPCs', async () => {
    const fns: string[] = [];
    const repo = new SupabaseNotificationInboxRepository(
      makeClient(async (fn) => {
        fns.push(fn);
        return { data: null, error: null };
      }),
    );
    await repo.markRead('i1');
    await repo.markAllRead();
    expect(fns).toEqual(['rpc_notification_inbox_mark_read', 'rpc_notification_inbox_mark_all_read']);
  });
});
