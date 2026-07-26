import { describe, it, expect } from 'vitest';
import GlowePosts from '../glowe-posts.js';

describe('isCommunityPost', () => {
    it('accepts community rows and legacy rows without a post_type', () => {
        expect(GlowePosts.isCommunityPost({ post_type: 'community' })).toBe(true);
        expect(GlowePosts.isCommunityPost({})).toBe(true);
        expect(GlowePosts.isCommunityPost({ post_type: null })).toBe(true);
        expect(GlowePosts.isCommunityPost({ post_type: '' })).toBe(true);
    });

    it('rejects wishes and empty input', () => {
        expect(GlowePosts.isCommunityPost({ post_type: 'wish' })).toBe(false);
        expect(GlowePosts.isCommunityPost(null)).toBe(false);
    });
});

describe('mapPostRow', () => {
    it('maps a server row to the feed shape with author attribution', () => {
        expect(GlowePosts.mapPostRow({
            id: 'p1', title: 'Hello', category: 'Knowledge', text: 'Body',
            tags: ['a', 'b'], user_id: 'u1', author_name: 'Dana', created_at: '2026-01-01'
        })).toEqual({
            id: 'p1', title: 'Hello', category: 'Knowledge', text: 'Body',
            tags: ['a', 'b'], authorId: 'u1', authorName: 'Dana', authorNameEn: '',
            createdAt: '2026-01-01'
        });
    });

    it('applies friendly defaults for missing fields', () => {
        const mapped = GlowePosts.mapPostRow({ id: 'p2' });
        expect(mapped).toMatchObject({ title: '', category: '', text: '', tags: [], authorId: '', authorName: 'Community Member', createdAt: '' });
    });
});

describe('mapCommunityRows', () => {
    it('drops wishes and maps only community posts', () => {
        const rows = [
            { id: 'p1', post_type: 'community', title: 'A' },
            { id: 'w1', post_type: 'wish', title: 'W' },
            { id: 'p2', title: 'Legacy' }
        ];
        expect(GlowePosts.mapCommunityRows(rows).map(p => p.id)).toEqual(['p1', 'p2']);
    });

    it('handles empty and null input', () => {
        expect(GlowePosts.mapCommunityRows([])).toEqual([]);
        expect(GlowePosts.mapCommunityRows(null)).toEqual([]);
    });
});

describe('commaList', () => {
    it('splits comma strings, passes arrays, handles empty', () => {
        expect(GlowePosts.commaList('Education, Climate , Health')).toEqual(['Education', 'Climate', 'Health']);
        expect(GlowePosts.commaList([' a ', 'b'])).toEqual(['a', 'b']);
        expect(GlowePosts.commaList('')).toEqual([]);
        expect(GlowePosts.commaList(null)).toEqual([]);
    });
});

describe('validatePostDraft', () => {
    it('requires title and body/text', () => {
        expect(GlowePosts.validatePostDraft({ title: 'T', text: 'Body' }).valid).toBe(true);
        expect(GlowePosts.validatePostDraft({ title: 'T', body: 'Body' }).valid).toBe(true);
        expect(GlowePosts.validatePostDraft({ title: '  ', text: 'Body' }).valid).toBe(false);
        expect(GlowePosts.validatePostDraft({ title: 'T', text: '  ' }).valid).toBe(false);
        expect(GlowePosts.validatePostDraft(null).valid).toBe(false);
    });

    it('returns a helpful error for the first missing field', () => {
        expect(GlowePosts.validatePostDraft({}).error).toMatch(/title/i);
        expect(GlowePosts.validatePostDraft({ title: 'T' }).error).toMatch(/share/i);
    });
});

describe('isPostOwner', () => {
    it('matches the author and rejects strangers, guests, and blank ids', () => {
        expect(GlowePosts.isPostOwner({ authorId: 'u1' }, 'u1')).toBe(true);
        expect(GlowePosts.isPostOwner({ authorId: 'u1' }, 'u2')).toBe(false);
        expect(GlowePosts.isPostOwner({ authorId: 'u1' }, '')).toBe(false);
        expect(GlowePosts.isPostOwner({ authorId: 'u1' }, null)).toBe(false);
        expect(GlowePosts.isPostOwner({ authorId: 'u1' }, undefined)).toBe(false);
        expect(GlowePosts.isPostOwner(null, 'u1')).toBe(false);
    });

    it('compares ids as strings', () => {
        expect(GlowePosts.isPostOwner({ authorId: 7 }, '7')).toBe(true);
    });
});

describe('postCanonicalUrl', () => {
    it('builds a canonical community post URL under the given origin', () => {
        expect(GlowePosts.postCanonicalUrl('p1', 'https://glowe.app'))
            .toBe('https://glowe.app/glowe/pages/community.html?post=p1');
    });

    it('trims a trailing slash from the origin', () => {
        expect(GlowePosts.postCanonicalUrl('p1', 'https://glowe.app/'))
            .toBe('https://glowe.app/glowe/pages/community.html?post=p1');
    });

    it('encodes the post id and tolerates blank origin/id', () => {
        expect(GlowePosts.postCanonicalUrl('a b&c', 'https://x.io'))
            .toBe('https://x.io/glowe/pages/community.html?post=a%20b%26c');
        expect(GlowePosts.postCanonicalUrl('', '')).toBe('/glowe/pages/community.html?post=');
        expect(GlowePosts.postCanonicalUrl(null, null)).toBe('/glowe/pages/community.html?post=');
    });
});

describe('mapCommentRow', () => {
    it('maps a glowe_comments row to the card shape', () => {
        expect(GlowePosts.mapCommentRow({
            id: 'c1', post_id: 'p1', text: 'Nice', author_name: 'Dana',
            author_name_en: 'Dana', user_id: 'u1', created_at: '2026-01-02'
        })).toEqual({
            id: 'c1', postId: 'p1', authorId: 'u1', author: 'Dana',
            authorEn: 'Dana', text: 'Nice', createdAt: '2026-01-02'
        });
    });

    it('applies friendly defaults for missing fields', () => {
        expect(GlowePosts.mapCommentRow({ id: 'c2', post_id: 'p2' }))
            .toEqual({
                id: 'c2', postId: 'p2', authorId: '', author: 'Community Member',
                authorEn: '', text: '', createdAt: ''
            });
    });
});

describe('groupCommentsByPost', () => {
    it('groups rows by post_id preserving order', () => {
        const rows = [
            { id: 'c1', post_id: 'p1', text: 'A', author_name: 'Ann' },
            { id: 'c2', post_id: 'p2', text: 'B', author_name: 'Ben' },
            { id: 'c3', post_id: 'p1', text: 'C', author_name: 'Cid' }
        ];
        const grouped = GlowePosts.groupCommentsByPost(rows);
        expect(grouped.p1.map(c => c.text)).toEqual(['A', 'C']);
        expect(grouped.p2.map(c => c.text)).toEqual(['B']);
    });

    it('handles empty and null input', () => {
        expect(GlowePosts.groupCommentsByPost([])).toEqual({});
        expect(GlowePosts.groupCommentsByPost(null)).toEqual({});
    });
});

describe('mergeCommentLists', () => {
    it('prepends local-only comments and drops backend duplicates', () => {
        const backend = [{ author: 'Ann', text: 'A' }, { author: 'Ben', text: 'B' }];
        const local = [{ author: 'Cid', text: 'C' }, { author: 'Ann', text: 'A' }];
        expect(GlowePosts.mergeCommentLists(backend, local).map(c => c.text))
            .toEqual(['C', 'A', 'B']);
    });

    it('tolerates empty or non-array input', () => {
        expect(GlowePosts.mergeCommentLists(null, null)).toEqual([]);
        expect(GlowePosts.mergeCommentLists([{ author: 'x', text: 'y' }], null).map(c => c.text)).toEqual(['y']);
    });
});

describe('commentsForCardDisplay', () => {
    const comments = [
        { id: 'c1', text: 'Lead' },
        { id: 'c2', text: 'Two' },
        { id: 'c3', text: 'Three' }
    ];

    it('returns only the leading comment when collapsed', () => {
        expect(GlowePosts.commentsForCardDisplay(comments, false).map(c => c.id)).toEqual(['c1']);
    });

    it('returns the full list when expanded', () => {
        expect(GlowePosts.commentsForCardDisplay(comments, true).map(c => c.id))
            .toEqual(['c1', 'c2', 'c3']);
    });

    it('handles empty input', () => {
        expect(GlowePosts.commentsForCardDisplay([], false)).toEqual([]);
        expect(GlowePosts.commentsForCardDisplay(null, true)).toEqual([]);
    });
});

describe('truncateCommentPreview', () => {
    it('leaves short text unchanged', () => {
        expect(GlowePosts.truncateCommentPreview('Hello world', 120)).toBe('Hello world');
    });

    it('truncates long text on a word boundary with an ellipsis', () => {
        const long = 'Alpha bravo charlie delta echo foxtrot golf hotel india juliet kilo';
        const out = GlowePosts.truncateCommentPreview(long, 40);
        expect(out.endsWith('…')).toBe(true);
        expect(out.length).toBeLessThanOrEqual(41);
        expect(out).not.toMatch(/\s…$/);
    });

    it('tolerates blank input', () => {
        expect(GlowePosts.truncateCommentPreview('', 40)).toBe('');
        expect(GlowePosts.truncateCommentPreview(null, 40)).toBe('');
    });
});

describe('normalizePostDraft', () => {
    it('builds a community insert payload with array tags and trimmed fields', () => {
        expect(GlowePosts.normalizePostDraft({
            title: '  Hello  ', category: ' Knowledge ', body: ' Body ',
            tags: 'Education, Climate', audience: ' Everyone ', language: ' English ',
            link: ' https://x.io ', authorName: ' Dana '
        })).toEqual({
            post_type: 'community', title: 'Hello', category: 'Knowledge', text: 'Body',
            tags: ['Education', 'Climate'], audience: 'Everyone', language: 'English',
            link: 'https://x.io', author_name: 'Dana', author_name_en: null
        });
    });

    it('collapses blank optional fields and prefers text over body', () => {
        const payload = GlowePosts.normalizePostDraft({ title: 'T', text: 'Real', body: 'Ignored' });
        expect(payload).toMatchObject({ post_type: 'community', title: 'T', text: 'Real', tags: [], category: '', audience: '', language: '', link: '', author_name: '', author_name_en: null });
    });
});
