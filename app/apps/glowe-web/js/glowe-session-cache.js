// GloWe translation session cache (FR-TRANSLATE-006).
// A bounded key->string store over a Storage-like object (sessionStorage in the
// browser, a fake in tests). Persists resolved translations AND same-language
// decisions (empty-string sentinel) so re-renders and cross-page navigation on
// this multi-page static site cost zero network. Order index lives in one key.
(function (root, factory) {
    const api = factory();
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    root.GloweSessionCache = api;
})(typeof self !== 'undefined' ? self : this, function () {
    const PREFIX = 'gtr:';        // per-entry key prefix
    const INDEX = 'gtr:index';    // ordered list of entry keys (oldest first)

    function key(type, id, field, target) {
        return type + '|' + id + '|' + field + '|' + target;
    }

    function readIndex(storage) {
        try { return JSON.parse(storage.getItem(INDEX) || '[]'); } catch (_e) { return []; }
    }
    function writeIndex(storage, list) {
        try { storage.setItem(INDEX, JSON.stringify(list)); } catch (_e) { /* quota: ignore */ }
    }

    function create(storage, cap) {
        const limit = cap > 0 ? cap : 500;
        return {
            get(k) {
                const v = storage.getItem(PREFIX + k);
                return v === null ? undefined : v;
            },
            put(k, value) {
                try {
                    if (storage.getItem(PREFIX + k) === null) {
                        const list = readIndex(storage);
                        list.push(k);
                        while (list.length > limit) storage.removeItem(PREFIX + list.shift());
                        writeIndex(storage, list);
                    }
                    storage.setItem(PREFIX + k, String(value));
                } catch (_e) { /* quota / private-mode: degrade to no-op */ }
            },
            clear() {
                readIndex(storage).forEach((k) => storage.removeItem(PREFIX + k));
                writeIndex(storage, []);
            },
        };
    }

    return { key: key, create: create };
});
