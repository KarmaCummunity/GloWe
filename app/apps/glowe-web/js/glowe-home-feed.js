// GloWe unified home discovery feed helpers (FR-GLOWE-016 AC2).
//
// Pure, DOM-free: normalize mixed catalogs → hot score → diversify → page.
// Shared by the browser app (window.GloweHomeFeed) and vitest (module.exports).
(function (root, factory) {
    const api = factory();
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    root.GloweHomeFeed = api;
})(typeof self !== 'undefined' ? self : this, function () {
    const KINDS = {
        post: 'post',
        opportunity: 'opportunity',
        event: 'event',
        wish: 'wish',
        volunteer_offer: 'volunteer_offer',
        forum_group: 'forum_group',
        forum_thread: 'forum_thread'
    };

    const PAGE_SIZE_FIRST = 10;
    const PAGE_SIZE_NEXT = 8;
    const GUEST_PREVIEW_LIMIT = 10;
    const HALF_LIFE_MS = 60 * 60 * 1000 * 60; // ~60h decay
    const DEFAULT_WC = 2;
    const DEFAULT_WS = 1.5;

    function log1p(n) {
        return Math.log(1 + Math.max(0, Number(n) || 0));
    }

    function snippetOf(text) {
        const s = String(text || '');
        return s.length <= 140 ? s : s.slice(0, 140);
    }

    function feedItemKey(item) {
        if (!item) return '';
        return String(item.kind || '') + ':' + String(item.id || '');
    }

    function defaultHref(kind, id, extra) {
        const safeId = encodeURIComponent(String(id || ''));
        const groupId = extra && (extra.groupId || extra.group_id);
        switch (kind) {
            case KINDS.opportunity:
            case KINDS.event:
                return 'pages/opportunity.html?id=' + safeId;
            case KINDS.wish:
            case KINDS.volunteer_offer:
                return 'pages/wishing-well.html?wish=' + safeId;
            case KINDS.forum_group:
                return 'pages/discussion-group.html?group=' + safeId;
            case KINDS.forum_thread:
                return 'pages/discussion-group.html?group=' + encodeURIComponent(String(groupId || ''));
            case KINDS.post:
            default:
                return 'pages/community.html?post=' + safeId;
        }
    }

    function baseItem(partial) {
        return {
            kind: partial.kind || KINDS.post,
            id: partial.id == null ? '' : String(partial.id),
            title: partial.title || '',
            snippet: partial.snippet || '',
            createdAt: partial.createdAt || '',
            authorLabel: partial.authorLabel || '',
            authorId: partial.authorId == null ? '' : String(partial.authorId),
            commentCount: Number(partial.commentCount) || 0,
            saveCount: Number(partial.saveCount) || 0,
            hrefPath: partial.hrefPath || '',
            tagKey: partial.tagKey || 'Post',
            category: partial.category || '',
            groupId: partial.groupId || ''
        };
    }

    function saveCountFor(saveCountsByKey, kind, id) {
        const map = saveCountsByKey || {};
        const key = kind + ':' + String(id);
        return Number(map[key]) || 0;
    }

    function commentCountFor(commentsByPostId, id) {
        const list = (commentsByPostId || {})[id];
        return Array.isArray(list) ? list.length : 0;
    }

    function normalizeFeedSources(sources) {
        const s = sources || {};
        const isEvent = typeof s.isEvent === 'function' ? s.isEvent : function () { return false; };
        const commentsByPostId = s.commentsByPostId || {};
        const saveCountsByKey = s.saveCountsByKey || {};
        const out = [];

        function push(kind, id, fields) {
            if (id == null || id === '') return;
            const sid = String(id);
            const groupId = fields.groupId || '';
            out.push(baseItem({
                kind: kind,
                id: sid,
                title: fields.title || '',
                snippet: snippetOf(fields.snippetSrc || ''),
                createdAt: fields.createdAt || '',
                authorLabel: fields.authorLabel || '',
                authorId: fields.authorId || '',
                commentCount: fields.commentCount != null
                    ? fields.commentCount
                    : commentCountFor(commentsByPostId, sid),
                saveCount: fields.saveCount != null
                    ? fields.saveCount
                    : saveCountFor(saveCountsByKey, kind, sid),
                hrefPath: defaultHref(kind, sid, groupId ? { groupId: groupId } : null),
                tagKey: fields.tagKey || 'Post',
                category: fields.category || '',
                groupId: groupId
            }));
        }

        (s.posts || []).forEach(function (p) {
            if (!p) return;
            push(KINDS.post, p.id, {
                title: p.title,
                snippetSrc: p.text || p.body,
                createdAt: p.createdAt || p.created_at,
                authorLabel: p.authorName || p.author_name,
                authorId: p.authorId || p.user_id || '',
                tagKey: 'Post',
                category: p.category
            });
        });

        (s.opportunities || []).forEach(function (opp) {
            if (!opp) return;
            const event = isEvent(opp);
            const kind = event ? KINDS.event : KINDS.opportunity;
            const id = opp.id;
            push(kind, id, {
                title: opp.title,
                snippetSrc: opp.description,
                createdAt: opp.createdAt || opp.created_at,
                authorLabel: opp.organization || opp.organizationName,
                authorId: opp.ownerId || opp.user_id || '',
                commentCount: 0,
                saveCount: saveCountFor(saveCountsByKey, kind, id)
                    || saveCountFor(saveCountsByKey, 'opportunity', id),
                tagKey: event ? 'Event' : 'Opportunity'
            });
        });

        (s.wishes || []).forEach(function (w) {
            if (!w) return;
            push(KINDS.wish, w.id, {
                title: w.title,
                snippetSrc: w.text || w.description || w.body,
                createdAt: w.createdAt || w.created_at,
                authorLabel: w.authorName || w.author_name,
                authorId: w.authorId || w.user_id || '',
                tagKey: 'Wish'
            });
        });

        (s.offers || []).forEach(function (o) {
            if (!o) return;
            push(KINDS.volunteer_offer, o.id, {
                title: o.title,
                snippetSrc: o.text || o.description || o.body,
                createdAt: o.createdAt || o.created_at,
                authorLabel: o.authorName || o.author_name,
                authorId: o.authorId || o.user_id || '',
                tagKey: 'Volunteer Offer'
            });
        });

        (s.forumGroups || []).forEach(function (g) {
            if (!g) return;
            push(KINDS.forum_group, g.id, {
                title: g.title,
                snippetSrc: g.description,
                createdAt: g.createdAt || g.created_at,
                commentCount: Number(g.posts) || (Array.isArray(g.threads) ? g.threads.length : 0),
                tagKey: 'Forum'
            });
        });

        (s.forumThreads || []).forEach(function (t) {
            if (!t) return;
            push(KINDS.forum_thread, t.id, {
                title: t.title,
                snippetSrc: t.body,
                createdAt: t.createdAt || t.created_at,
                authorLabel: t.authorName || t.author_name,
                authorId: t.authorId || t.user_id || '',
                commentCount: Number(t.replies) || 0,
                tagKey: 'Discussion',
                groupId: t.groupId || t.group_id || ''
            });
        });

        return out;
    }

    function recencyScore(createdAt, nowMs) {
        const t = Date.parse(createdAt || '');
        if (!Number.isFinite(t)) return 0;
        const age = Math.max(0, (Number(nowMs) || Date.now()) - t);
        return Math.exp(-age / HALF_LIFE_MS);
    }

    function hotScore(item, nowMs, weights) {
        const w = weights || {};
        const wC = w.wC == null ? DEFAULT_WC : w.wC;
        const wS = w.wS == null ? DEFAULT_WS : w.wS;
        const it = item || {};
        return recencyScore(it.createdAt, nowMs)
            + wC * log1p(it.commentCount)
            + wS * log1p(it.saveCount);
    }

    function rankFeed(items, nowMs) {
        const list = (items || []).slice();
        list.sort(function (a, b) {
            const diff = hotScore(b, nowMs) - hotScore(a, nowMs);
            if (diff !== 0) return diff;
            return String(a.id || '').localeCompare(String(b.id || ''));
        });
        return list;
    }

    function diversifyFeed(ranked, options) {
        const helper = (typeof module !== 'undefined' && module.exports)
            ? require('./glowe-home-feed-diversify.js')
            : (typeof self !== 'undefined' ? self.GloweHomeFeedDiversify : null);
        if (!helper || typeof helper.diversifyFeed !== 'function') {
            return (ranked || []).slice();
        }
        return helper.diversifyFeed(ranked, options);
    }

    function pageSlice(items, offset, limit) {
        const list = items || [];
        const start = Math.max(0, Number(offset) || 0);
        const size = Math.max(0, Number(limit) || 0);
        const slice = list.slice(start, start + size);
        const nextOffset = start + slice.length;
        return { items: slice, nextOffset: nextOffset, done: nextOffset >= list.length };
    }

    function buildHomeFeed(sources, opts) {
        const nowMs = (opts && opts.nowMs) != null ? opts.nowMs : Date.now();
        return diversifyFeed(rankFeed(normalizeFeedSources(sources), nowMs), opts && opts.diversity);
    }

    return {
        KINDS: KINDS,
        PAGE_SIZE_FIRST: PAGE_SIZE_FIRST,
        PAGE_SIZE_NEXT: PAGE_SIZE_NEXT,
        GUEST_PREVIEW_LIMIT: GUEST_PREVIEW_LIMIT,
        normalizeFeedSources: normalizeFeedSources,
        recencyScore: recencyScore,
        hotScore: hotScore,
        rankFeed: rankFeed,
        diversifyFeed: diversifyFeed,
        pageSlice: pageSlice,
        buildHomeFeed: buildHomeFeed,
        feedItemKey: feedItemKey,
        defaultHref: defaultHref
    };
});
