import { describe, it, expect } from 'vitest';
import GloweHomeFeed from '../glowe-home-feed.js';

const NOW = Date.parse('2026-07-27T12:00:00Z');

function item(partial) {
    return {
        kind: 'post',
        id: '1',
        title: 'T',
        snippet: 'S',
        createdAt: '2026-07-27T11:00:00Z',
        authorLabel: 'A',
        commentCount: 0,
        saveCount: 0,
        hrefPath: 'pages/community.html',
        tagKey: 'Post',
        category: '',
        ...partial
    };
}

describe('hotScore', () => {
    it('ranks newer higher when engagement equal', () => {
        const newer = item({ id: 'n', createdAt: '2026-07-27T11:00:00Z' });
        const older = item({ id: 'o', createdAt: '2026-07-20T11:00:00Z' });
        expect(GloweHomeFeed.hotScore(newer, NOW)).toBeGreaterThan(GloweHomeFeed.hotScore(older, NOW));
    });

    it('boosts comments and saves', () => {
        const plain = item({ id: 'a' });
        const hot = item({ id: 'b', commentCount: 10, saveCount: 5 });
        expect(GloweHomeFeed.hotScore(hot, NOW)).toBeGreaterThan(GloweHomeFeed.hotScore(plain, NOW));
    });
});

describe('diversifyFeed', () => {
    it('breaks runs of the same kind when alternatives exist', () => {
        const ranked = [
            item({ id: 'p1', kind: 'post' }),
            item({ id: 'p2', kind: 'post' }),
            item({ id: 'p3', kind: 'post' }),
            item({ id: 'o1', kind: 'opportunity' })
        ];
        const out = GloweHomeFeed.diversifyFeed(ranked, { maxRun: 2 });
        expect(out.slice(0, 3).map((x) => x.kind)).toEqual(['post', 'post', 'opportunity']);
    });

    it('caps forum_group density', () => {
        const ranked = [
            item({ id: 'g1', kind: 'forum_group' }),
            item({ id: 'g2', kind: 'forum_group' }),
            item({ id: 'p1', kind: 'post' })
        ];
        const out = GloweHomeFeed.diversifyFeed(ranked, { maxForumGroupPerWindow: 1, window: 10 });
        expect(out.filter((x) => x.kind === 'forum_group').length).toBe(1);
        expect(out.some((x) => x.id === 'p1')).toBe(true);
    });
});

describe('pageSlice', () => {
    it('pages 10 then 8', () => {
        const items = Array.from({ length: 25 }, (_, i) => item({ id: String(i) }));
        const first = GloweHomeFeed.pageSlice(items, 0, GloweHomeFeed.PAGE_SIZE_FIRST);
        expect(first.items).toHaveLength(10);
        expect(first.nextOffset).toBe(10);
        expect(first.done).toBe(false);
        const second = GloweHomeFeed.pageSlice(items, first.nextOffset, GloweHomeFeed.PAGE_SIZE_NEXT);
        expect(second.items).toHaveLength(8);
        expect(second.nextOffset).toBe(18);
    });
});

describe('defaultHref', () => {
    it('links wishes and offers to the wishing well detail query', () => {
        expect(GloweHomeFeed.defaultHref('wish', 'w1')).toBe('pages/wishing-well.html?wish=w1');
        expect(GloweHomeFeed.defaultHref('volunteer_offer', 'o1')).toBe('pages/wishing-well.html?wish=o1');
    });

    it('links community posts to the community post query', () => {
        expect(GloweHomeFeed.defaultHref('post', 'p1')).toBe('pages/community.html?post=p1');
    });
});
describe('normalizeFeedSources', () => {
    it('splits opportunities into opportunity vs event via isEvent', () => {
        const out = GloweHomeFeed.normalizeFeedSources({
            posts: [],
            opportunities: [
                { id: 'e1', title: 'Meetup', description: 'd', startAt: '2026-08-01', organization: 'Org', createdAt: '2026-07-26' },
                { id: 'o1', title: 'Mentor', description: 'd', organization: 'Org', createdAt: '2026-07-26' }
            ],
            wishes: [],
            offers: [],
            forumGroups: [],
            forumThreads: [],
            commentsByPostId: {},
            saveCountsByKey: {},
            isEvent: (opp) => Boolean(opp && (opp.startAt || opp.start_at))
        });
        expect(out.map((x) => x.kind).sort()).toEqual(['event', 'opportunity']);
    });

    it('attaches comment counts for posts', () => {
        const out = GloweHomeFeed.normalizeFeedSources({
            posts: [{ id: 'p1', title: 'Hi', text: 'body', authorName: 'Sam', createdAt: '2026-07-26', category: 'Knowledge Share' }],
            opportunities: [],
            wishes: [],
            offers: [],
            forumGroups: [],
            forumThreads: [],
            commentsByPostId: { p1: [{}, {}, {}] },
            saveCountsByKey: { 'post:p1': 2 },
            isEvent: () => false
        });
        expect(out[0].commentCount).toBe(3);
        expect(out[0].saveCount).toBe(2);
        expect(out[0].kind).toBe('post');
    });
});
