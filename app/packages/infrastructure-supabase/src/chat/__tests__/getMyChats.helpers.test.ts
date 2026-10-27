import { describe, it, expect } from 'vitest';
import {
  counterpartId,
  dedupeRowsByCounterpart,
  isVisibleInInboxForViewer,
} from '../getMyChats';

/* eslint-disable @typescript-eslint/no-explicit-any */
function chatRow(o: {
  chat_id: string;
  participant_a: string | null;
  participant_b: string | null;
  last_message_at: string;
  inbox_hidden_at_a?: string | null;
  inbox_hidden_at_b?: string | null;
}): any {
  return {
    chat_id: o.chat_id,
    participant_a: o.participant_a,
    participant_b: o.participant_b,
    anchor_post_id: null,
    is_support_thread: false,
    last_message_at: o.last_message_at,
    created_at: o.last_message_at,
    inbox_hidden_at_a: o.inbox_hidden_at_a ?? null,
    inbox_hidden_at_b: o.inbox_hidden_at_b ?? null,
  };
}

describe('isVisibleInInboxForViewer', () => {
  it('returns true when viewer is participant_a and inbox_hidden_at_a is null', () => {
    const r = chatRow({ chat_id: 'c1', participant_a: 'u_me', participant_b: 'u_b', last_message_at: '2026-05-01T00:00:00.000Z' });
    expect(isVisibleInInboxForViewer(r, 'u_me')).toBe(true);
  });

  it('returns false when viewer is participant_a and inbox_hidden_at_a is set', () => {
    const r = chatRow({
      chat_id: 'c1',
      participant_a: 'u_me',
      participant_b: 'u_b',
      last_message_at: '2026-05-01T00:00:00.000Z',
      inbox_hidden_at_a: '2026-05-02T00:00:00.000Z',
    });
    expect(isVisibleInInboxForViewer(r, 'u_me')).toBe(false);
  });

  it('returns true when viewer is participant_b and inbox_hidden_at_b is null', () => {
    const r = chatRow({ chat_id: 'c1', participant_a: 'u_a', participant_b: 'u_me', last_message_at: '2026-05-01T00:00:00.000Z' });
    expect(isVisibleInInboxForViewer(r, 'u_me')).toBe(true);
  });

  it('returns false when viewer is participant_b and inbox_hidden_at_b is set', () => {
    const r = chatRow({
      chat_id: 'c1',
      participant_a: 'u_a',
      participant_b: 'u_me',
      last_message_at: '2026-05-01T00:00:00.000Z',
      inbox_hidden_at_b: '2026-05-02T00:00:00.000Z',
    });
    expect(isVisibleInInboxForViewer(r, 'u_me')).toBe(false);
  });

  it('returns false when viewer is in neither slot (defensive)', () => {
    const r = chatRow({ chat_id: 'c1', participant_a: 'u_a', participant_b: 'u_b', last_message_at: '2026-05-01T00:00:00.000Z' });
    expect(isVisibleInInboxForViewer(r, 'u_me')).toBe(false);
  });
});

describe('counterpartId', () => {
  it('returns participant_b when viewer is participant_a', () => {
    const r = chatRow({ chat_id: 'c1', participant_a: 'u_me', participant_b: 'u_other', last_message_at: '2026-05-01T00:00:00.000Z' });
    expect(counterpartId(r, 'u_me')).toBe('u_other');
  });

  it('returns participant_a when viewer is participant_b', () => {
    const r = chatRow({ chat_id: 'c1', participant_a: 'u_other', participant_b: 'u_me', last_message_at: '2026-05-01T00:00:00.000Z' });
    expect(counterpartId(r, 'u_me')).toBe('u_other');
  });

  it('returns null counterpart when the other side is a deleted account', () => {
    const r = chatRow({ chat_id: 'c1', participant_a: 'u_me', participant_b: null, last_message_at: '2026-05-01T00:00:00.000Z' });
    expect(counterpartId(r, 'u_me')).toBeNull();
  });
});

describe('dedupeRowsByCounterpart', () => {
  it('keeps a single chat per counterpart, picking the one with the highest last_message_at', () => {
    const rows = [
      chatRow({ chat_id: 'c_old', participant_a: 'u_me', participant_b: 'u_other', last_message_at: '2026-05-01T00:00:00.000Z' }),
      chatRow({ chat_id: 'c_new', participant_a: 'u_me', participant_b: 'u_other', last_message_at: '2026-05-10T00:00:00.000Z' }),
    ];
    const out = dedupeRowsByCounterpart('u_me', rows);
    expect(out).toHaveLength(1);
    expect(out[0]?.chat_id).toBe('c_new');
  });

  it('breaks ties on equal last_message_at by larger chat_id', () => {
    const rows = [
      chatRow({ chat_id: 'c_aaa', participant_a: 'u_me', participant_b: 'u_other', last_message_at: '2026-05-10T00:00:00.000Z' }),
      chatRow({ chat_id: 'c_zzz', participant_a: 'u_me', participant_b: 'u_other', last_message_at: '2026-05-10T00:00:00.000Z' }),
    ];
    const out = dedupeRowsByCounterpart('u_me', rows);
    expect(out).toHaveLength(1);
    expect(out[0]?.chat_id).toBe('c_zzz');
  });

  it('keeps distinct chats for different counterparts', () => {
    const rows = [
      chatRow({ chat_id: 'c1', participant_a: 'u_me', participant_b: 'u_a', last_message_at: '2026-05-01T00:00:00.000Z' }),
      chatRow({ chat_id: 'c2', participant_a: 'u_me', participant_b: 'u_b', last_message_at: '2026-05-05T00:00:00.000Z' }),
    ];
    const out = dedupeRowsByCounterpart('u_me', rows);
    expect(out).toHaveLength(2);
    expect(out.map((r) => r.chat_id).sort((a, b) => a.localeCompare(b))).toEqual(['c1', 'c2']);
  });

  it('TD-110 bug 3: keeps each null-counterpart chat as its own row (different deleted users, not one bucket)', () => {
    const rows = [
      chatRow({ chat_id: 'c1', participant_a: 'u_me', participant_b: null, last_message_at: '2026-05-01T00:00:00.000Z' }),
      chatRow({ chat_id: 'c2', participant_a: 'u_me', participant_b: null, last_message_at: '2026-05-10T00:00:00.000Z' }),
    ];
    const out = dedupeRowsByCounterpart('u_me', rows);
    expect(out).toHaveLength(2);
    expect(out.map((r) => r.chat_id).sort((a, b) => a.localeCompare(b))).toEqual(['c1', 'c2']);
  });

  it('returns an empty array for an empty input', () => {
    expect(dedupeRowsByCounterpart('u_me', [])).toEqual([]);
  });
});
