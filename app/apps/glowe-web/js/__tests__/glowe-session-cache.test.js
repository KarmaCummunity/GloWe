import { describe, it, expect } from 'vitest';
import GloweSessionCache from '../glowe-session-cache.js';

function fakeStorage() {
    const m = new Map();
    return {
        getItem: (k) => (m.has(k) ? m.get(k) : null),
        setItem: (k, v) => { m.set(k, String(v)); },
        removeItem: (k) => { m.delete(k); },
    };
}

describe('GloweSessionCache.key', () => {
    it('builds a stable composite key', () => {
        expect(GloweSessionCache.key('glowe_post', 'post-1', 'title', 'en'))
            .toBe('glowe_post|post-1|title|en');
    });
});

describe('GloweSessionCache.create', () => {
    it('round-trips values and misses on unknown keys', () => {
        const c = GloweSessionCache.create(fakeStorage(), 10);
        expect(c.get('a')).toBe(undefined);
        c.put('a', 'Hello');
        expect(c.get('a')).toBe('Hello');
    });
    it('stores the empty-string sentinel (resolved: no translation)', () => {
        const c = GloweSessionCache.create(fakeStorage(), 10);
        c.put('a', '');
        expect(c.get('a')).toBe('');
    });
    it('evicts the oldest entry past the cap', () => {
        const c = GloweSessionCache.create(fakeStorage(), 2);
        c.put('a', '1'); c.put('b', '2'); c.put('c', '3');
        expect(c.get('a')).toBe(undefined);
        expect(c.get('b')).toBe('2');
        expect(c.get('c')).toBe('3');
    });
    it('clear() empties the cache', () => {
        const c = GloweSessionCache.create(fakeStorage(), 10);
        c.put('a', '1'); c.clear();
        expect(c.get('a')).toBe(undefined);
    });
});
