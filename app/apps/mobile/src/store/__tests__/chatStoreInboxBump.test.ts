import { describe, expect, it } from 'vitest';
import type { ChatWithPreview } from '@kc/application';
import type { Message } from '@kc/domain';
import { reduceBumpInboxForIncomingInsert } from '../chatStoreInboxBump';

const baseRow = (over: Partial<ChatWithPreview> = {}): ChatWithPreview => ({
  chatId: 'c1',
  participantIds: ['u1', 'u2'],
  anchorPostId: null,
  anchorRideId: null,
  isSupportThread: false,
  lastMessageAt: '2026-01-01T00:00:00.000Z',
  createdAt: '2025-12-01T00:00:00.000Z',
  otherParticipant: {
    userId: 'u2',
    displayName: 'B',
    avatarUrl: null,
    shareHandle: 'b',
    isDeleted: false,
  },
  lastMessage: null,
  unreadCount: 1,
  ...over,
});

const msg = (over: Partial<Message> = {}): Message => ({
  messageId: 'm-new',
  chatId: 'c1',
  senderId: 'u2',
  kind: 'user',
  body: 'hi',
  systemPayload: null,
  mediaPayload: null,
  status: 'delivered',
  createdAt: '2026-01-02T00:00:00.000Z',
  deliveredAt: null,
  readAt: null,
  ...over,
});

describe('reduceBumpInboxForIncomingInsert', () => {
  it('returns null when inbox not loaded', () => {
    expect(reduceBumpInboxForIncomingInsert({ inbox: null, unreadTotal: 0 }, 'u1', msg())).toBeNull();
  });

  it('returns null when chat row missing', () => {
    expect(
      reduceBumpInboxForIncomingInsert({ inbox: [baseRow({ chatId: 'other' })], unreadTotal: 0 }, 'u1', msg()),
    ).toBeNull();
  });

  it('skips duplicate messageId', () => {
    const m = msg();
    const row = baseRow({ lastMessage: m });
    expect(reduceBumpInboxForIncomingInsert({ inbox: [row], unreadTotal: 1 }, 'u1', m)).toBeNull();
  });

  it('does not increment unread for own message', () => {
    const m = msg({ senderId: 'u1' });
    const row = baseRow({ unreadCount: 2 });
    const out = reduceBumpInboxForIncomingInsert({ inbox: [row], unreadTotal: 5 }, 'u1', m);
    expect(out?.unreadTotal).toBe(5);
    expect(out?.inbox?.[0]?.unreadCount).toBe(2);
    expect(out?.inbox?.[0]?.lastMessage?.messageId).toBe('m-new');
  });

  it('increments unread for peer message', () => {
    const m = msg({ senderId: 'u2' });
    const row = baseRow({ unreadCount: 1 });
    const out = reduceBumpInboxForIncomingInsert({ inbox: [row], unreadTotal: 3 }, 'u1', m);
    expect(out?.unreadTotal).toBe(4);
    expect(out?.inbox?.[0]?.unreadCount).toBe(2);
  });

  it('TD-110: skips unread bump when viewer is actively reading this chat', () => {
    const m = msg({ senderId: 'u2' });
    const row = baseRow({ unreadCount: 1 });
    const out = reduceBumpInboxForIncomingInsert(
      { inbox: [row], unreadTotal: 3 },
      'u1',
      m,
      true /* isActiveChat */,
    );
    // Counters stay; lastMessage preview still updates so the row reflects the new content.
    expect(out?.unreadTotal).toBe(3);
    expect(out?.inbox?.[0]?.unreadCount).toBe(1);
    expect(out?.inbox?.[0]?.lastMessage?.messageId).toBe('m-new');
  });

  it('TD-110: peer message in OTHER chat still bumps when viewer is reading a different one', () => {
    // Reducer doesn't itself know which chat is active — the caller computes
    // that from activeRoute. When peer message arrives in chat the viewer
    // is NOT currently reading, `isActiveChat` is false and the bump happens.
    const m = msg({ senderId: 'u2', chatId: 'c1' });
    const row = baseRow({ chatId: 'c1', unreadCount: 1 });
    const out = reduceBumpInboxForIncomingInsert(
      { inbox: [row], unreadTotal: 3 },
      'u1',
      m,
      false /* isActiveChat */,
    );
    expect(out?.unreadTotal).toBe(4);
    expect(out?.inbox?.[0]?.unreadCount).toBe(2);
  });
});
