import { describe, it, expect } from 'vitest';
import GloweCreate from '../glowe-create.js';

// This table is the browser half of the publishing capability matrix. It must
// stay identical to Part 1 of supabase/tests/0236_glowe_publish_guards.sql,
// which pins public.glowe_can_create() — the database is what actually enforces
// these rules, this mirror only decides which buttons get rendered.
describe('canCreate — mirrors public.glowe_can_create (migration 0236)', () => {
  const MATRIX = [
    ['individual', 'not_required', 'community', true],
    ['individual', 'not_required', 'wish', true],
    ['individual', 'not_required', 'outreach', true],
    ['individual', 'not_required', 'offer', true],
    ['individual', 'not_required', 'opportunity', false],
    ['individual', 'not_required', 'event', false],
    [null, 'not_required', 'community', true],
    [null, 'not_required', 'offer', true],
    [null, 'not_required', 'event', false],
    ['organization', 'approved', 'community', true],
    ['organization', 'approved', 'wish', true],
    ['organization', 'approved', 'opportunity', true],
    ['organization', 'approved', 'event', true],
    ['organization', 'approved', 'offer', false],
    ['organization', 'pending', 'community', false],
    ['organization', 'pending', 'opportunity', false],
    ['organization', 'pending', 'event', false],
    ['organization', 'rejected', 'community', false],
    ['organization', 'rejected', 'event', false]
  ];

  it.each(MATRIX)('%s / %s may create %s → %s', (accountType, approval, kind, expected) => {
    expect(GloweCreate.canCreate(accountType, approval, kind)).toBe(expected);
  });

  it('every registry entry declares a kind the matrix understands', () => {
    const kinds = ['community', 'wish', 'outreach', 'offer', 'opportunity', 'event'];
    GloweCreate.GLOWE_CREATE_TYPES.forEach((t) => {
      expect(kinds).toContain(t.kind);
    });
  });
});

describe('createMenuState', () => {
  it('anon viewers get the sign-in state and no types', () => {
    const state = GloweCreate.createMenuState(false, null);
    expect(state.state).toBe('anon');
    expect(state.types).toHaveLength(0);
  });

  it('unapproved organizations are view-only', () => {
    const pending = GloweCreate.createMenuState(true, { accountType: 'organization', approvalStatus: 'pending' });
    expect(pending.state).toBe('unverified');
    const rejected = GloweCreate.createMenuState(true, { accountType: 'organization', approvalStatus: 'rejected' });
    expect(rejected.state).toBe('unverified');
  });

  it('approved organizations create post / event / opportunity / need', () => {
    const state = GloweCreate.createMenuState(true, { accountType: 'organization', approvalStatus: 'approved' });
    expect(state.state).toBe('ok');
    expect(state.types.map(t => t.id)).toEqual(['post', 'event', 'opportunity', 'need']);
  });

  it('individuals create post / need / offer', () => {
    const state = GloweCreate.createMenuState(true, { accountType: 'individual', approvalStatus: 'not_required' });
    expect(state.types.map(t => t.id)).toEqual(['post', 'need', 'offer']);
  });

  it('members without an account type yet get the individual set', () => {
    const state = GloweCreate.createMenuState(true, {});
    expect(state.state).toBe('ok');
    expect(state.types.map(t => t.id)).toEqual(['post', 'need', 'offer']);
  });
});

describe('validateEventDraft', () => {
  const base = { title: 'ניקיון חוף', start_at: '2026-08-01T10:00' };

  it('accepts a titled, dated draft', () => {
    expect(GloweCreate.validateEventDraft(base).valid).toBe(true);
  });

  it('requires title and start date', () => {
    expect(GloweCreate.validateEventDraft({ start_at: base.start_at }).valid).toBe(false);
    expect(GloweCreate.validateEventDraft({ title: 'x' }).valid).toBe(false);
    expect(GloweCreate.validateEventDraft({ ...base, start_at: 'not-a-date' }).valid).toBe(false);
  });

  it('rejects an end before the start and non-positive capacity', () => {
    expect(GloweCreate.validateEventDraft({ ...base, end_at: '2026-07-01T10:00' }).valid).toBe(false);
    expect(GloweCreate.validateEventDraft({ ...base, capacity: '0' }).valid).toBe(false);
    expect(GloweCreate.validateEventDraft({ ...base, capacity: '25' }).valid).toBe(true);
  });
});

describe('normalizeEventDraft', () => {
  it('builds the glowe_opportunities event shape', () => {
    const row = GloweCreate.normalizeEventDraft({
      title: ' ערב התנדבות ', organization: 'לב פתוח', start_at: '2026-08-01T10:00',
      event_type: 'digital', capacity: '12', registration_mode: 'open', location: 'Online'
    });
    expect(row.title).toBe('ערב התנדבות');
    expect(row.commitment).toBe('Event');
    expect(row.event_type).toBe('digital');
    expect(row.capacity).toBe(12);
    expect(row.registration_mode).toBe('open');
    expect(typeof row.start_at).toBe('string');
    expect(row.end_at).toBe(null);
  });

  it('defaults to physical + gated with unlimited capacity', () => {
    const row = GloweCreate.normalizeEventDraft({ title: 'x', start_at: '2026-08-01T10:00' });
    expect(row.event_type).toBe('physical');
    expect(row.registration_mode).toBe('gated');
    expect(row.capacity).toBe(null);
  });
});

describe('volunteer offer drafts', () => {
  it('validates headline + description', () => {
    expect(GloweCreate.validateOfferPostDraft({ title: 'מעצב גרפי', text: '3 שעות בשבוע' }).valid).toBe(true);
    expect(GloweCreate.validateOfferPostDraft({ title: 'x' }).valid).toBe(false);
    expect(GloweCreate.validateOfferPostDraft({ text: 'y' }).valid).toBe(false);
  });

  it('normalizes to an open offer post', () => {
    const row = GloweCreate.normalizeOfferPostDraft({ title: ' עזרה בעיצוב ', text: 'בשמחה', impact_area: 'Education' });
    expect(row.post_type).toBe('offer');
    expect(row.status).toBe('open');
    expect(row.title).toBe('עזרה בעיצוב');
    expect(row.impact_area).toBe('Education');
  });

  it('isOpenOffer matches only open offer rows', () => {
    expect(GloweCreate.isOpenOffer({ post_type: 'offer', status: 'open' })).toBe(true);
    expect(GloweCreate.isOpenOffer({ post_type: 'offer', status: 'removed' })).toBe(false);
    expect(GloweCreate.isOpenOffer({ post_type: 'wish', status: 'open' })).toBe(false);
    expect(GloweCreate.isOpenOffer(null)).toBe(false);
  });
});
