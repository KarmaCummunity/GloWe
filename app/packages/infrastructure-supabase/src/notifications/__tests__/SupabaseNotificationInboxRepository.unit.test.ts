import { describe, it, expect, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseNotificationInboxRepository } from '../SupabaseNotificationInboxRepository';

/* eslint-disable @typescript-eslint/no-explicit-any */

function repo(result: { data: unknown; error: unknown }) {
  const rpc = vi.fn(async () => result);
  return { r: new SupabaseNotificationInboxRepository({ rpc } as unknown as SupabaseClient<any>), rpc };
}

const row = {
  inbox_id: 'i1',
  category: 'social',
  world: 'items',
  kind: 'comment',
  title_key: 't',
  body_key: 'b',
  body_args: null,
  data: { a: 1 },
  group_count: 2,
  read_at: null,
  created_at: '2026-01-01T00:00:00Z',
};

describe('SupabaseNotificationInboxRepository', () => {
  it('list uses defaults and maps rows', async () => {
    const { r, rpc } = repo({ data: [row], error: null });
    await expect(r.list()).resolves.toEqual([
      {
        inboxId: 'i1',
        category: 'social',
        world: 'items',
        kind: 'comment',
        titleKey: 't',
        bodyKey: 'b',
        bodyArgs: {},
        data: { a: 1 },
        groupCount: 2,
        readAt: null,
        createdAt: '2026-01-01T00:00:00Z',
      },
    ]);
    expect(rpc).toHaveBeenCalledWith('rpc_notification_inbox_list', {
      p_limit: 30,
      p_cursor_created_at: null,
      p_cursor_inbox_id: null,
      p_category: null,
      p_world: null,
    });
  });

  it('list forwards params, handles null data and errors', async () => {
    const { r, rpc } = repo({ data: null, error: null });
    await expect(
      r.list({ limit: 5, cursorCreatedAt: 'c', cursorInboxId: 'x', category: 'k', world: 'w' }),
    ).resolves.toEqual([]);
    expect(rpc).toHaveBeenCalledWith('rpc_notification_inbox_list', {
      p_limit: 5,
      p_cursor_created_at: 'c',
      p_cursor_inbox_id: 'x',
      p_category: 'k',
      p_world: 'w',
    });
    const err = new Error('e');
    await expect(repo({ data: null, error: err }).r.list()).rejects.toBe(err);
  });

  it('unreadCount coerces to number', async () => {
    await expect(repo({ data: 7, error: null }).r.unreadCount()).resolves.toBe(7);
    await expect(repo({ data: null, error: null }).r.unreadCount()).resolves.toBe(0);
    const err = new Error('e');
    await expect(repo({ data: null, error: err }).r.unreadCount()).rejects.toBe(err);
  });

  it('markRead / markAllRead call rpcs and propagate errors', async () => {
    const { r, rpc } = repo({ data: null, error: null });
    await r.markRead('i1');
    await r.markAllRead();
    expect(rpc).toHaveBeenCalledWith('rpc_notification_inbox_mark_read', { p_inbox_id: 'i1' });
    expect(rpc).toHaveBeenCalledWith('rpc_notification_inbox_mark_all_read');
    const err = new Error('e');
    await expect(repo({ data: null, error: err }).r.markRead('i')).rejects.toBe(err);
    await expect(repo({ data: null, error: err }).r.markAllRead()).rejects.toBe(err);
  });
});
