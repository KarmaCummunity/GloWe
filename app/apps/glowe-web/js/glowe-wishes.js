// GloWe Wishing Well helpers (FR-GLOWE-006).
//
// Pure, DOM-free logic for the live needs board: a wish is a glowe_posts row
// with post_type='wish' (migration 0215). These helpers are shared by the
// browser app (window.GloweWishes) and unit-tested via vitest (module.exports),
// so they must stay free of DOM / Supabase / globals.
(function (root, factory) {
    const api = factory();
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    root.GloweWishes = api;
})(typeof self !== 'undefined' ? self : this, function () {
    function field(row, snake, camel) {
        if (!row) return undefined;
        return row[snake] !== undefined ? row[snake] : row[camel];
    }

    // A post is a live wish when it is typed 'wish' and still open.
    function isOpenWish(row) {
        return Boolean(row)
            && field(row, 'post_type', 'postType') === 'wish'
            && field(row, 'status', 'status') === 'open';
    }

    function formatWishTime(value) {
        if (!value) return '';
        const ms = value instanceof Date ? value.getTime() : Date.parse(value);
        if (Number.isNaN(ms)) return '';
        try {
            return new Date(ms).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
        } catch (_e) {
            return new Date(ms).toISOString().slice(0, 10);
        }
    }

    // Map a glowe_posts row to the wish view model the board renders. glowe_posts
    // has no location column (0215), so location is best-effort from raw fields.
    // Author English is kept alongside primary; render localizes via FR-GLOWE-024.
    function mapWishRow(row) {
        const area = field(row, 'impact_area', 'impactArea');
        const createdAt = field(row, 'created_at', 'createdAt') || '';
        return {
            id: field(row, 'id', 'id'),
            type: field(row, 'wish_type', 'wishType') || 'Open Call',
            title: field(row, 'title', 'title') || '',
            description: field(row, 'text', 'text') || '',
            author: field(row, 'author_name', 'authorName') || 'GloWe Member',
            authorEn: field(row, 'author_name_en', 'authorNameEn') || '',
            authorId: field(row, 'user_id', 'userId') || field(row, 'author_id', 'authorId') || '',
            location: row && (row.location || '') || '',
            areas: area ? [area] : [],
            createdAt: createdAt,
            time: formatWishTime(createdAt)
        };
    }

    // Filter mapped wishes by the board's controls.
    //   filters.type     — 'all' | <wish_type>
    //   filters.area     — 'all' | <impact_area>
    //   filters.location — substring match on location (case-insensitive)
    //   filters.query    — substring match on title, body, author, location
    function filterWishes(list, filters) {
        const f = filters || {};
        const query = (f.query || f.location || '').trim().toLowerCase();
        return (list || []).filter(function (wish) {
            if (f.type && f.type !== 'all' && wish.type !== f.type) return false;
            if (f.area && f.area !== 'all' && (wish.areas || []).indexOf(f.area) === -1) return false;
            if (!query) return true;
            const haystack = [
                wish.title,
                wish.description,
                wish.author,
                wish.location,
                (wish.areas || []).join(' ')
            ].join(' ').toLowerCase();
            return haystack.indexOf(query) !== -1;
        });
    }

    // Sort mapped wishes for the board toolbar.
    //   sort — 'newest' (default) | 'oldest' | 'title'
    function sortWishes(list, sort) {
        const mode = sort || 'newest';
        const copy = (list || []).slice();
        copy.sort(function (a, b) {
            const aMs = Date.parse(a.createdAt || '') || 0;
            const bMs = Date.parse(b.createdAt || '') || 0;
            if (mode === 'oldest') return aMs - bMs;
            if (mode === 'title') return String(a.title || '').localeCompare(String(b.title || ''));
            return bMs - aMs;
        });
        return copy;
    }

    // Hero stats computed from the live wish list.
    function wishStats(list) {
        const wishes = list || [];
        const areas = {};
        wishes.forEach(function (w) {
            (w.areas || []).forEach(function (a) { if (a) areas[a] = true; });
        });
        return { openWishes: wishes.length, impactAreas: Object.keys(areas).length };
    }

    // Validate a "Post a Need" draft. Required: title, wish_type, impact_area.
    function validateWishDraft(draft) {
        const d = draft || {};
        if (!d.title || !String(d.title).trim()) return { valid: false, error: 'Please describe what you need.' };
        if (!d.wish_type) return { valid: false, error: 'Please choose a wish type.' };
        if (!d.impact_area) return { valid: false, error: 'Please choose an impact area.' };
        return { valid: true, error: '' };
    }

    // Fold the optional context fields of a draft into the post body.
    function buildWishText(draft) {
        const d = draft || {};
        const parts = [];
        if (d.details) parts.push(String(d.details).trim());
        if (d.success) parts.push('Success looks like: ' + String(d.success).trim());
        if (d.location) parts.push('Location: ' + String(d.location).trim());
        return parts.filter(Boolean).join('\n\n');
    }

    // True when `userId` published this wish (owner-only "mark as fulfilled").
    function isWishOwner(wish, userId) {
        return Boolean(wish && userId && wish.authorId === userId);
    }

    // Validate an "Offer Support" draft. Required: offer_text + availability.
    function validateOfferDraft(draft) {
        const d = draft || {};
        if (!d.offer_text || !String(d.offer_text).trim()) return { valid: false, error: 'Please describe what you can offer.' };
        if (!d.availability) return { valid: false, error: 'Please choose your availability.' };
        return { valid: true, error: '' };
    }

    // Compose the offer body from the support type + free-text message.
    function buildOfferText(draft) {
        const d = draft || {};
        const parts = [];
        if (d.support_type) parts.push('Offering: ' + String(d.support_type).trim());
        if (d.message) parts.push(String(d.message).trim());
        return parts.filter(Boolean).join('\n\n');
    }

    return {
        isOpenWish: isOpenWish,
        mapWishRow: mapWishRow,
        filterWishes: filterWishes,
        sortWishes: sortWishes,
        wishStats: wishStats,
        formatWishTime: formatWishTime,
        validateWishDraft: validateWishDraft,
        buildWishText: buildWishText,
        isWishOwner: isWishOwner,
        validateOfferDraft: validateOfferDraft,
        buildOfferText: buildOfferText
    };
});
