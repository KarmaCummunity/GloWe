// GloWe UGC translation (FR-TRANSLATE-005).
//
// Progressive enhancement: cards render in their source language immediately;
// this module translates them into the reader's interface language in the
// background and injects a "Show original" toggle ONLY when a translation was
// actually applied. Pure helpers are exported for unit tests; the DOM/network
// driver runs only in the browser.
//
// Two response shapes are normalized here: a direct PostgREST cache read returns
// snake_case (translated_text/source_language); the glowe-translate function
// returns camelCase (translatedText/sourceLanguage). normalizeTranslation()
// collapses both to { translated, sourceLanguage }.
(function (root, factory) {
    const api = factory();
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    root.GloweTranslate = api;
})(typeof self !== 'undefined' ? self : this, function () {
    // English source labels for the show-original toggle. Hebrew (and any future
    // locale) is applied by GLOWE's own i18n (`GLOWE_TRANSLATIONS` in app.js) via
    // translateGloweTree(), so no non-English string is inlined here.
    const TOGGLE_LABELS = { show: 'Show original', hide: 'Show translation' };

    // Base language subtag, lowercased ("en-US" -> "en").
    function baseLang(tag) {
        return String(tag || '').split('-')[0].toLowerCase();
    }

    // True when source is unknown or its base differs from target.
    function needsTranslation(source, target) {
        if (!source) return true;
        return baseLang(source) !== baseLang(target);
    }

    // Session key for the skip-set / de-dupe.
    function tupleKey(type, id, field, target) {
        return type + '|' + id + '|' + field + '|' + target;
    }

    // Cache-map key for a (type, id, field) tuple.
    function cacheMapKey(type, id, field) {
        return type + '|' + id + '|' + field;
    }

    // Collapse either response shape to { translated, sourceLanguage } or null.
    function normalizeTranslation(obj) {
        if (!obj) return null;
        const translated = obj.translated_text != null ? obj.translated_text : obj.translatedText;
        if (translated == null || translated === '') return null;
        const sourceLanguage = obj.source_language != null ? obj.source_language : obj.sourceLanguage;
        return { translated: translated, sourceLanguage: sourceLanguage != null ? sourceLanguage : null };
    }

    // Non-Latin letter blocks (Hebrew/Arabic/Cyrillic/Greek/CJK), mirroring
    // js/glowe-localized-name.js. Used to decide a field's script cheaply.
    const HEBREW = /[֐-׿]/;
    const NON_LATIN = /[֐-׿؀-ۿЀ-ӿͰ-Ͽ一-鿿]/;

    // True when `text` is already in the reader's language, so no network/
    // provider call is needed. Safe heuristic: he => has Hebrew letters;
    // en => no non-Latin letters. Ambiguous/empty falls through to false.
    function sameLanguageSkip(text, readerLang) {
        const t = String(text || '').trim();
        if (!t) return false;
        if (readerLang === 'he') return HEBREW.test(t);
        if (readerLang === 'en') return !NON_LATIN.test(t);
        return false;
    }

    return {
        baseLang: baseLang,
        needsTranslation: needsTranslation,
        tupleKey: tupleKey,
        cacheMapKey: cacheMapKey,
        normalizeTranslation: normalizeTranslation,
        sameLanguageSkip: sameLanguageSkip,
        TOGGLE_LABELS: TOGGLE_LABELS,
    };
});

// --- browser driver ---------------------------------------------------------
if (typeof window !== 'undefined') {
    (function () {
        const T = window.GloweTranslate;
        const skip = new Set();
        let scheduled = false;

        function readerLang() {
            const fn = window.getGloweLanguage;
            return typeof fn === 'function' ? fn() : 'en';
        }

        async function client() {
            if (typeof gloweBackend === 'undefined' || !gloweBackend.configured()) return null;
            try {
                return await gloweBackend.getClient();
            } catch (_e) {
                return null;
            }
        }

        // Collect { card, type, id, fields:[{field, el}] } for un-processed cards.
        function collectCards(root) {
            const out = [];
            root.querySelectorAll('[data-tr-card]:not([data-tr-done])').forEach(function (card) {
                const type = card.getAttribute('data-tr-type');
                const id = card.getAttribute('data-tr-id');
                if (!type || !id) return;
                const fields = [];
                card.querySelectorAll('[data-tr-field]').forEach(function (el) {
                    // Nesting guard: a field belongs to the *nearest* enclosing
                    // card. Without this, a profile card (which nests project
                    // cards) would also collect the project fields and request
                    // them under the wrong content type.
                    if (el.closest('[data-tr-card]') !== card) return;
                    const field = el.getAttribute('data-tr-field');
                    const source = (el.textContent || '').trim();
                    if (field && source) fields.push({ field: field, el: el });
                });
                if (fields.length) out.push({ card: card, type: type, id: id, fields: fields });
            });
            return out;
        }

        // Batch-read cached translations for the given card ids + target.
        async function readCache(sb, ids, target) {
            try {
                const { data, error } = await sb
                    .from('glowe_content_translations')
                    .select('content_type, content_id, field, translated_text, source_language')
                    .eq('target_language', target)
                    .in('content_id', ids);
                if (error || !data) return {};
                const map = {};
                data.forEach(function (r) {
                    map[T.cacheMapKey(r.content_type, r.content_id, r.field)] = r;
                });
                return map;
            } catch (_e) {
                return {};
            }
        }

        function applyTranslation(el, source, translated) {
            if (!translated || translated === source) return false;
            el.setAttribute('data-tr-source', source);
            el.setAttribute('data-tr-translated', translated);
            el.textContent = translated;
            return true;
        }

        // Localize a freshly-set English label into the reader's GLOWE interface
        // language using app.js's i18n (idempotent, no-op in English).
        function localizeLabel(el) {
            if (typeof window.translateGloweTree === 'function') window.translateGloweTree(el);
        }

        function injectToggle(card, _target) {
            const already = Array.prototype.some.call(
                card.querySelectorAll('.tr-toggle'),
                function (el) { return el.closest('[data-tr-card]') === card; }
            );
            if (already) return;
            const labels = T.TOGGLE_LABELS;
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'tr-toggle';
            btn.textContent = labels.show;
            btn.setAttribute('data-showing', 'translation');
            btn.addEventListener('click', function () {
                const showingSource = btn.getAttribute('data-showing') === 'source';
                card.querySelectorAll('[data-tr-translated]').forEach(function (el) {
                    // Only swap fields owned by this card (nested comment cards
                    // keep their own toggle + source/translated attrs).
                    if (el.closest('[data-tr-card]') !== card) return;
                    el.textContent = showingSource
                        ? el.getAttribute('data-tr-translated')
                        : el.getAttribute('data-tr-source');
                });
                const ln = window.GloweLocalizedName;
                if (ln && typeof ln.applyToggleNamesInCard === 'function') {
                    ln.applyToggleNamesInCard(card, !showingSource, readerLang());
                }
                btn.setAttribute('data-showing', showingSource ? 'translation' : 'source');
                btn.textContent = showingSource ? labels.show : labels.hide;
                localizeLabel(btn);
            });
            // Global convention: prefer the reserved .tr-slot under the card
            // header (see glowe-ui-conventions.js). Fallback keeps proximity
            // to title/body for older markup.
            const slot = card.querySelector(':scope > .tr-slot, .tr-slot');
            if (slot && slot.closest('[data-tr-card]') === card) {
                slot.appendChild(btn);
            } else {
                const titleEl = card.querySelector('[data-tr-field="title"]');
                const bodyEl = card.querySelector('[data-tr-field="text"], [data-tr-field="description"], [data-tr-field="body"]');
                const anchor = titleEl || bodyEl;
                if (anchor && anchor.closest('[data-tr-card]') === card) {
                    anchor.insertAdjacentElement('afterend', btn);
                } else {
                    const fallback = card.querySelector('.post-actions, .card-actions, .post-comments');
                    if (fallback && fallback.parentNode === card) {
                        card.insertBefore(btn, fallback);
                    } else {
                        card.appendChild(btn);
                    }
                }
            }
            localizeLabel(btn);
        }

        async function translateMiss(sb, type, id, field, target) {
            const key = T.tupleKey(type, id, field, target);
            if (skip.has(key)) return null;
            try {
                const { data, error } = await sb.functions.invoke('glowe-translate', {
                    body: { contentType: type, contentId: id, field: field, targetLanguage: target },
                });
                const norm = (!error && data && data.status !== 'skipped')
                    ? T.normalizeTranslation(data.translation)
                    : null;
                if (!norm) skip.add(key);
                return norm;
            } catch (_e) {
                skip.add(key);
                return null;
            }
        }

        async function resolveField(sb, entry, f, target, cacheMap) {
            const hit = cacheMap[T.cacheMapKey(entry.type, entry.id, f.field)];
            if (hit) return T.normalizeTranslation(hit);
            return translateMiss(sb, entry.type, entry.id, f.field, target);
        }

        async function processCard(sb, entry, target, cacheMap) {
            let any = false;
            for (const f of entry.fields) {
                const source = (f.el.textContent || '').trim();
                const norm = await resolveField(sb, entry, f, target, cacheMap);
                if (norm && T.needsTranslation(norm.sourceLanguage, target)
                    && applyTranslation(f.el, source, norm.translated)) {
                    any = true;
                }
            }
            if (any) injectToggle(entry.card, target);
        }

        async function scan(rootEl) {
            const root = rootEl || document;
            const entries = collectCards(root);
            if (!entries.length) return;
            const sb = await client();
            if (!sb) return;
            const target = readerLang();
            entries.forEach(function (e) { e.card.setAttribute('data-tr-done', '1'); });
            const ids = Array.from(new Set(entries.map(function (e) { return e.id; })));
            const cacheMap = await readCache(sb, ids, target);
            for (const e of entries) await processCard(sb, e, target, cacheMap);
        }

        function schedule() {
            if (scheduled) return;
            scheduled = true;
            setTimeout(function () { scheduled = false; scan(); }, 150);
        }

        function boot() {
            scan();
            const observer = new MutationObserver(function (muts) {
                for (const m of muts) {
                    if (m.addedNodes && m.addedNodes.length) { schedule(); return; }
                }
            });
            observer.observe(document.body, { childList: true, subtree: true });
        }

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', boot);
        } else {
            boot();
        }

        window.GloweTranslate.scan = scan;
    })();
}
