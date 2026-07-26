import { describe, expect, it } from 'vitest';

// Import after stubbing document so the module's auto-apply is a no-op.
globalThis.document = undefined;
await import('../glowe-auth-paint.js');

const { GloweAuthPaint } = globalThis;

function makeDom() {
    const attrs = {};
    const classList = new Set();
    return {
        documentElement: {
            setAttribute: (k, v) => { attrs[k] = v; },
            getAttribute: (k) => (Object.prototype.hasOwnProperty.call(attrs, k) ? attrs[k] : null),
            classList: {
                add: (c) => classList.add(c),
                remove: (c) => classList.delete(c),
                contains: (c) => classList.has(c)
            }
        }
    };
}

function makeStorage(initial = {}) {
    const map = { ...initial };
    return {
        getItem: (k) => (Object.prototype.hasOwnProperty.call(map, k) ? map[k] : null),
        setItem: (k, v) => { map[k] = String(v); },
        removeItem: (k) => { delete map[k]; }
    };
}

describe('GloweAuthPaint / GloweBootPaint', () => {
    it('adds glowe-expect-member when gloweUser is cached', () => {
        const doc = makeDom();
        const storage = makeStorage({ gloweUser: '{"id":"u1"}' });
        expect(GloweAuthPaint.applyExpectMemberPaint(doc, storage)).toBe(true);
        expect(doc.documentElement.classList.contains(GloweAuthPaint.CLASS)).toBe(true);
    });

    it('treats a persisted Supabase session as signed-in even without gloweUser', () => {
        const doc = makeDom();
        const storage = makeStorage({
            'glowe-auth-v1': JSON.stringify({ access_token: 'tok', user: { id: 'u1' } })
        });
        expect(GloweAuthPaint.hasCachedMember(storage)).toBe(true);
        expect(GloweAuthPaint.applyExpectMemberPaint(doc, storage)).toBe(true);
    });

    it('does not add the class when no cached member', () => {
        const doc = makeDom();
        const storage = makeStorage();
        expect(GloweAuthPaint.applyExpectMemberPaint(doc, storage)).toBe(false);
        expect(doc.documentElement.classList.contains(GloweAuthPaint.CLASS)).toBe(false);
    });

    it('clears a previously applied expect-member class', () => {
        const doc = makeDom();
        const storage = makeStorage({ gloweUser: '{"id":"u1"}' });
        GloweAuthPaint.applyExpectMemberPaint(doc, storage);
        GloweAuthPaint.clearExpectMemberPaint(doc);
        expect(doc.documentElement.classList.contains(GloweAuthPaint.CLASS)).toBe(false);
    });

    it('hasCachedMember tolerates storage throws', () => {
        const storage = {
            getItem: () => { throw new Error('blocked'); }
        };
        expect(GloweAuthPaint.hasCachedMember(storage)).toBe(false);
    });

    it('sets rtl dir and i18n-pending for Hebrew before paint', () => {
        const doc = makeDom();
        const storage = makeStorage({ gloweLang: 'he' });
        expect(GloweAuthPaint.applyLanguagePaint(doc, storage)).toBe('he');
        expect(doc.documentElement.getAttribute('lang')).toBe('he');
        expect(doc.documentElement.getAttribute('dir')).toBe('rtl');
        expect(doc.documentElement.classList.contains(GloweAuthPaint.I18N_PENDING_CLASS)).toBe(true);
    });

    it('does not pending-hide English (source language)', () => {
        const doc = makeDom();
        const storage = makeStorage({ gloweLang: 'en' });
        GloweAuthPaint.applyLanguagePaint(doc, storage);
        expect(doc.documentElement.getAttribute('dir')).toBe('ltr');
        expect(doc.documentElement.classList.contains(GloweAuthPaint.I18N_PENDING_CLASS)).toBe(false);
    });

    it('clears i18n pending after translation', () => {
        const doc = makeDom();
        const storage = makeStorage({ gloweLang: 'he' });
        GloweAuthPaint.applyLanguagePaint(doc, storage);
        GloweAuthPaint.clearI18nPendingPaint(doc);
        expect(doc.documentElement.classList.contains(GloweAuthPaint.I18N_PENDING_CLASS)).toBe(false);
    });
});
