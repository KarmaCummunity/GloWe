import { describe, it, expect } from 'vitest';
import GloweMessages from '../glowe-messages.js';

const ME = 'aaaaaaaa-0000-0000-0000-000000000001';
const OTHER = 'bbbbbbbb-0000-0000-0000-000000000002';

describe('mapChatRow / inboxRows', () => {
  it('resolves the counterpart and per-viewer hide flag', () => {
    const row = {
      chat_id: 'c1', participant_a: ME, participant_b: OTHER,
      last_message_at: '2026-07-01T10:00:00Z', inbox_hidden_at_a: null, inbox_hidden_at_b: '2026-07-01T09:00:00Z'
    };
    const mine = GloweMessages.mapChatRow(row, ME);
    expect(mine.otherId).toBe(OTHER);
    expect(mine.hiddenForMe).toBe(false);
    const theirs = GloweMessages.mapChatRow(row, OTHER);
    expect(theirs.otherId).toBe(ME);
    expect(theirs.hiddenForMe).toBe(true);
  });

  it('filters hidden + support chats and dedupes by counterpart', () => {
    const rows = [
      { chat_id: 'c1', participant_a: ME, participant_b: OTHER, last_message_at: '2026-07-02' },
      { chat_id: 'c2', participant_a: ME, participant_b: OTHER, last_message_at: '2026-07-01' },
      { chat_id: 'c3', participant_a: ME, participant_b: 'cccccccc-0000-0000-0000-000000000003', is_support_thread: true },
      { chat_id: 'c4', participant_a: ME, participant_b: 'dddddddd-0000-0000-0000-000000000004', inbox_hidden_at_a: '2026-07-01' }
    ];
    const inbox = GloweMessages.inboxRows(rows, ME);
    expect(inbox.map(c => c.chatId)).toEqual(['c1']);
  });

  it('handles a deleted counterpart (null participant)', () => {
    const inbox = GloweMessages.inboxRows([{ chat_id: 'c9', participant_a: null, participant_b: ME }], ME);
    expect(inbox).toHaveLength(0);
  });
});

describe('attachPreviews / attachUnread', () => {
  const chats = [{ chatId: 'c1', lastMessageAt: '2026-07-02' }, { chatId: 'c2', lastMessageAt: '2026-07-01' }];

  it('takes the newest message per chat as the preview', () => {
    const messages = [
      { chat_id: 'c1', body: 'newest', created_at: '2026-07-02T10:00' },
      { chat_id: 'c1', body: 'older', created_at: '2026-07-01T10:00' }
    ];
    const out = GloweMessages.attachPreviews(chats, messages);
    expect(out[0].previewText).toBe('newest');
    expect(out[1].previewText).toBe('');
  });

  it('attaches unread counts, defaulting to zero', () => {
    const out = GloweMessages.attachUnread(chats, [{ chat_id: 'c2', unread_count: 3 }]);
    expect(out[0].unread).toBe(0);
    expect(out[1].unread).toBe(3);
  });

  it('sums inbox-visible unreads for the header badge', () => {
    expect(GloweMessages.sumUnread([])).toBe(0);
    expect(GloweMessages.sumUnread(null)).toBe(0);
    expect(GloweMessages.sumUnread([
      { chatId: 'c1', unread: 2 },
      { chatId: 'c2', unread: 0 },
      { chatId: 'c3', unread: 5 }
    ])).toBe(7);
  });
});

describe('buildFirstMessage', () => {
  it('carries the need title before the offer text', () => {
    const msg = GloweMessages.buildFirstMessage('need', 'מחפשים מתנדבים לחלוקת מזון', 'אני יכול לעזור ביום שלישי');
    expect(msg.startsWith('Re: מחפשים מתנדבים לחלוקת מזון')).toBe(true);
    expect(msg).toContain('אני יכול לעזור ביום שלישי');
  });

  it('caps the seeded message at the 2000-char KC body limit', () => {
    const msg = GloweMessages.buildFirstMessage('need', 'כותרת', 'x'.repeat(3000));
    expect(msg.length).toBeLessThanOrEqual(2000);
  });
});

describe('mapMessageRows', () => {
  it('marks mine vs theirs and system messages', () => {
    const rows = [
      { message_id: 'm1', sender_id: ME, kind: 'user', body: 'שלום', created_at: '2026-07-01' },
      { message_id: 'm2', sender_id: OTHER, kind: 'user', body: 'היי', created_at: '2026-07-01' },
      { message_id: 'm3', sender_id: null, kind: 'system', body: null, created_at: '2026-07-01' }
    ];
    const out = GloweMessages.mapMessageRows(rows, ME);
    expect(out[0].mine).toBe(true);
    expect(out[1].mine).toBe(false);
    expect(out[2].isSystem).toBe(true);
    expect(out[2].text).toBe('');
  });
});

describe('validateMessageDraft', () => {
  it('requires non-blank text within 2000 chars', () => {
    expect(GloweMessages.validateMessageDraft('שלום').valid).toBe(true);
    expect(GloweMessages.validateMessageDraft('   ').valid).toBe(false);
    expect(GloweMessages.validateMessageDraft('x'.repeat(2001)).valid).toBe(false);
  });
});

describe('formatChatTime', () => {
  it('is empty for missing or invalid values', () => {
    expect(GloweMessages.formatChatTime('')).toBe('');
    expect(GloweMessages.formatChatTime('not-a-date')).toBe('');
  });

  it('shows a date for non-today values', () => {
    const now = Date.parse('2026-07-04T12:00:00Z');
    const label = GloweMessages.formatChatTime('2026-06-01T10:00:00Z', now);
    expect(label).toBeTruthy();
  });
});

describe('pickDmChatRow / isSupportPairConflict', () => {
  it('prefers a visible non-support DM over a support thread', () => {
    const rows = [
      { chat_id: 'support', is_support_thread: true, inbox_hidden_at_a: null, inbox_hidden_at_b: null },
      { chat_id: 'dm', is_support_thread: false, inbox_hidden_at_a: null, inbox_hidden_at_b: null }
    ];
    expect(GloweMessages.pickDmChatRow(rows, true).chat_id).toBe('dm');
  });

  it('reuses a support thread when no visible DM exists', () => {
    const rows = [
      { chat_id: 'hidden', is_support_thread: false, inbox_hidden_at_a: '2026-07-01', inbox_hidden_at_b: null },
      { chat_id: 'support', is_support_thread: true, inbox_hidden_at_a: null, inbox_hidden_at_b: null }
    ];
    expect(GloweMessages.pickDmChatRow(rows, true).chat_id).toBe('support');
  });

  it('detects the support-pair unique-index conflict', () => {
    expect(GloweMessages.isSupportPairConflict({ code: '23505', message: 'chats_unique_support_pair' })).toBe(true);
    expect(GloweMessages.isSupportPairConflict({ code: '23505', message: 'other' })).toBe(false);
  });
});
