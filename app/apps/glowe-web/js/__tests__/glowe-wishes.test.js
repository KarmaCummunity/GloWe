import { describe, it, expect } from 'vitest';
import GloweWishes from '../glowe-wishes.js';

function wishRow(overrides = {}) {
    return {
        id: 'post-1', post_type: 'wish', status: 'open', title: 'Need volunteers',
        text: 'Help us run a workshop', wish_type: 'Volunteers Needed', impact_area: 'Education',
        author_name: 'Org A', user_id: 'u1', created_at: '2026-07-01T09:00:00Z', ...overrides
    };
}

describe('isOpenWish', () => {
    it('is true only for open wish posts', () => {
        expect(GloweWishes.isOpenWish(wishRow())).toBe(true);
        expect(GloweWishes.isOpenWish(wishRow({ status: 'fulfilled' }))).toBe(false);
        expect(GloweWishes.isOpenWish(wishRow({ post_type: 'community' }))).toBe(false);
        expect(GloweWishes.isOpenWish(null)).toBe(false);
    });

    it('reads camelCase fields too', () => {
        expect(GloweWishes.isOpenWish({ postType: 'wish', status: 'open' })).toBe(true);
    });
});

describe('mapWishRow', () => {
    it('maps a row to the board view model', () => {
        const w = GloweWishes.mapWishRow(wishRow());
        expect(w).toMatchObject({
            id: 'post-1', type: 'Volunteers Needed', title: 'Need volunteers',
            description: 'Help us run a workshop', author: 'Org A', authorId: 'u1', areas: ['Education']
        });
        expect(w.time).toBeTruthy();
    });

    it('falls back for missing fields', () => {
        const w = GloweWishes.mapWishRow({ id: 'post-2', post_type: 'wish', status: 'open', title: 'X' });
        expect(w.type).toBe('Open Call');
        expect(w.author).toBe('GloWe Member');
        expect(w.areas).toEqual([]);
    });
});

describe('filterWishes', () => {
    const list = [
        GloweWishes.mapWishRow(wishRow({ id: 'a', wish_type: 'Volunteers Needed', impact_area: 'Education', title: 'Workshop help' })),
        GloweWishes.mapWishRow(wishRow({ id: 'b', wish_type: 'Funding Support', impact_area: 'Health' })),
        GloweWishes.mapWishRow(wishRow({ id: 'c', wish_type: 'Volunteers Needed', impact_area: 'Environment' }))
    ];

    it('returns all when filters are "all"', () => {
        expect(GloweWishes.filterWishes(list, { type: 'all', area: 'all' })).toHaveLength(3);
    });

    it('filters by wish type', () => {
        const ids = GloweWishes.filterWishes(list, { type: 'Volunteers Needed' }).map(w => w.id);
        expect(ids).toEqual(['a', 'c']);
    });

    it('filters by impact area', () => {
        const ids = GloweWishes.filterWishes(list, { area: 'Health' }).map(w => w.id);
        expect(ids).toEqual(['b']);
    });

    it('filters by free-text query across title and body', () => {
        const ids = GloweWishes.filterWishes(list, { query: 'workshop help' }).map(w => w.id);
        expect(ids).toEqual(['a']);
    });
});

describe('sortWishes', () => {
    const list = [
        GloweWishes.mapWishRow(wishRow({ id: 'old', created_at: '2026-06-01T09:00:00Z', title: 'Beta' })),
        GloweWishes.mapWishRow(wishRow({ id: 'new', created_at: '2026-07-01T09:00:00Z', title: 'Alpha' }))
    ];

    it('sorts newest first by default', () => {
        expect(GloweWishes.sortWishes(list, 'newest').map(w => w.id)).toEqual(['new', 'old']);
    });

    it('sorts oldest first when requested', () => {
        expect(GloweWishes.sortWishes(list, 'oldest').map(w => w.id)).toEqual(['old', 'new']);
    });

    it('sorts by title alphabetically', () => {
        expect(GloweWishes.sortWishes(list, 'title').map(w => w.id)).toEqual(['new', 'old']);
    });
});

describe('wishStats', () => {
    it('counts open wishes and distinct impact areas', () => {
        const list = [
            GloweWishes.mapWishRow(wishRow({ id: 'a', impact_area: 'Education' })),
            GloweWishes.mapWishRow(wishRow({ id: 'b', impact_area: 'Education' })),
            GloweWishes.mapWishRow(wishRow({ id: 'c', impact_area: 'Health' }))
        ];
        expect(GloweWishes.wishStats(list)).toEqual({ openWishes: 3, impactAreas: 2 });
        expect(GloweWishes.wishStats([])).toEqual({ openWishes: 0, impactAreas: 0 });
    });
});

describe('validateWishDraft', () => {
    it('requires title, wish_type, and impact_area', () => {
        expect(GloweWishes.validateWishDraft({ title: 'T', wish_type: 'Funding Support', impact_area: 'Health' }).valid).toBe(true);
        expect(GloweWishes.validateWishDraft({ title: '  ', wish_type: 'X', impact_area: 'Y' }).valid).toBe(false);
        expect(GloweWishes.validateWishDraft({ title: 'T', wish_type: '', impact_area: 'Y' }).valid).toBe(false);
        expect(GloweWishes.validateWishDraft({ title: 'T', wish_type: 'X', impact_area: '' }).valid).toBe(false);
        expect(GloweWishes.validateWishDraft(null).valid).toBe(false);
    });

    it('returns a helpful error message for the first missing field', () => {
        expect(GloweWishes.validateWishDraft({}).error).toMatch(/describe what you need/i);
        expect(GloweWishes.validateWishDraft({ title: 'T' }).error).toMatch(/wish type/i);
        expect(GloweWishes.validateWishDraft({ title: 'T', wish_type: 'X' }).error).toMatch(/impact area/i);
    });
});

describe('buildWishText', () => {
    it('folds details, success and location into a body', () => {
        const text = GloweWishes.buildWishText({ details: 'Need help', success: '3 mentors', location: 'Haifa' });
        expect(text).toContain('Need help');
        expect(text).toContain('Success looks like: 3 mentors');
        expect(text).toContain('Location: Haifa');
    });

    it('omits empty optional parts', () => {
        expect(GloweWishes.buildWishText({ details: 'Only this' })).toBe('Only this');
        expect(GloweWishes.buildWishText({})).toBe('');
    });
});

describe('isWishOwner', () => {
    it('is true only when the viewer published the wish', () => {
        const wish = GloweWishes.mapWishRow(wishRow({ user_id: 'u1' }));
        expect(GloweWishes.isWishOwner(wish, 'u1')).toBe(true);
        expect(GloweWishes.isWishOwner(wish, 'u2')).toBe(false);
    });

    it('is false for guests or missing data', () => {
        const wish = GloweWishes.mapWishRow(wishRow({ user_id: 'u1' }));
        expect(GloweWishes.isWishOwner(wish, '')).toBe(false);
        expect(GloweWishes.isWishOwner(wish, null)).toBe(false);
        expect(GloweWishes.isWishOwner(null, 'u1')).toBe(false);
    });
});

describe('validateOfferDraft', () => {
    it('requires offer_text and availability', () => {
        expect(GloweWishes.validateOfferDraft({ offer_text: 'I can mentor', availability: 'Weekends' }).valid).toBe(true);
        expect(GloweWishes.validateOfferDraft({ offer_text: '  ', availability: 'Weekends' }).valid).toBe(false);
        expect(GloweWishes.validateOfferDraft({ offer_text: 'X', availability: '' }).valid).toBe(false);
        expect(GloweWishes.validateOfferDraft(null).valid).toBe(false);
    });

    it('returns a helpful error for the first missing field', () => {
        expect(GloweWishes.validateOfferDraft({}).error).toMatch(/what you can offer/i);
        expect(GloweWishes.validateOfferDraft({ offer_text: 'X' }).error).toMatch(/availability/i);
    });
});

describe('buildOfferText', () => {
    it('composes support type and message into a body', () => {
        const text = GloweWishes.buildOfferText({ support_type: 'Mentoring', message: 'Available evenings' });
        expect(text).toContain('Offering: Mentoring');
        expect(text).toContain('Available evenings');
    });

    it('omits empty optional parts', () => {
        expect(GloweWishes.buildOfferText({ message: 'Only this' })).toBe('Only this');
        expect(GloweWishes.buildOfferText({})).toBe('');
    });
});
