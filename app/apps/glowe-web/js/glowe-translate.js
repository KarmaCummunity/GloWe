// GloWe UGC translation (FR-TRANSLATE-005 / 006).
//
// Progressive enhancement: cards render in their source language immediately;
// this module translates them into the reader's interface language in the
// background and injects a "Show original" toggle ONLY when a translation was
// actually applied. Pure helpers are exported for unit tests; the DOM/network
// driver runs only in the browser.
//
// FR-TRANSLATE-006 — efficiency-first cold path. Each translatable field walks a
// decision ladder and stops at the first step that resolves: (1) same-language
// short-circuit (script detection, no network); (2) sessionStorage cache;
// (3) batched DB cache read; (4) one batched glowe-translate call for the
// genuine misses. Translation is triggered by an IntersectionObserver lookahead
// (a screen or two ahead) rather than on paint, and a discreet, localized
// "Translating…" indicator appears only when a cold miss takes > 400ms.
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
        const skip = new Set();                 // (type|id|field|target) resolved skip/fail
        const SC = (window.GloweSessionCache && window.sessionStorage)
            ? window.GloweSessionCache.create(window.sessionStorage, 500)
            : null;
        const CHUNK = 24;                        // max items per batch request
        const INDICATOR_DELAY = 400;             // ms before "Translating…" shows

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

        function scKey(type, id, field, target) {
            return window.GloweSessionCache ? window.GloweSessionCache.key(type, id, field, target) : null;
        }

        // Collect { card, type, id, fields:[{field, el}] } for the given cards
        // (skipping any already processed).
        function collectFrom(cards) {
            const out = [];
            cards.forEach(function (card) {
                if (card.getAttribute('data-tr-done')) return;
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

        // --- loading indicator (delayed, localized, shift-safe) ------------
        // Shows a discreet "Translating…" line in the card's reserved .tr-slot
        // only if the cold miss is still unresolved after INDICATOR_DELAY. The
        // source text stays visible; the indicator is a separate line removed on
        // resolve, so the source->translation swap causes no layout shift.
        function startPending(card) {
            const slot = card.querySelector(':scope > .tr-slot, .tr-slot');
            if (!slot || slot.closest('[data-tr-card]') !== card) return function () {};
            const timer = setTimeout(function () {
                if (slot.querySelector('.tr-pending')) return;
                const span = document.createElement('span');
                span.className = 'tr-pending';
                span.textContent = 'Translating…';   // localized to interface lang below
                slot.appendChild(span);
                localizeLabel(span);
            }, INDICATOR_DELAY);
            return function stop() {
                clearTimeout(timer);
                const el = slot.querySelector('.tr-pending');
                if (el) el.remove();
            };
        }

        function startIndicators(misses) {
            const seen = new Set();
            const stops = [];
            misses.forEach(function (m) {
                if (seen.has(m.e.card)) return;
                seen.add(m.e.card);
                stops.push(startPending(m.e.card));
            });
            return function () { stops.forEach(function (s) { s(); }); };
        }

        // --- step 4: one batched translate call for the genuine misses ------
        // Chunks to <=CHUNK items/request. Maps results by (type|id|field);
        // failures/skips resolve to null (render source) and join the skip-set.
        async function batchTranslate(sb, items, target) {
            const map = {};
            for (let i = 0; i < items.length; i += CHUNK) {
                const chunk = items.slice(i, i + CHUNK);
                try {
                    const { data, error } = await sb.functions.invoke('glowe-translate', {
                        body: { targetLanguage: target, items: chunk },
                    });
                    if (error || !data || !Array.isArray(data.results)) continue;
                    data.results.forEach(function (r) {
                        const k = r.contentType + '|' + r.contentId + '|' + r.field;
                        const norm = (r.status !== 'skipped') ? T.normalizeTranslation(r.translation) : null;
                        map[k] = norm;
                        if (!norm) skip.add(T.tupleKey(r.contentType, r.contentId, r.field, target));
                    });
                } catch (_e) { /* leave source text in place */ }
            }
            return map;
        }

        // Apply each field's resolution. `f._text` is: a translated string to
        // apply; '' meaning resolved with no translation (remember in session
        // cache); or undefined meaning unresolved (leave the source, cache
        // nothing). Injects the toggle once per card that applied a translation.
        function applyEntries(entries, target) {
            entries.forEach(function (e) {
                let any = false;
                e.fields.forEach(function (f) {
                    if (typeof f._text !== 'string') return;   // unresolved -> leave source
                    const key = scKey(e.type, e.id, f.field, target);
                    if (f._text) {
                        if (applyTranslation(f.el, f._source, f._text)) {
                            any = true;
                            if (SC && key) SC.put(key, f._text);
                        }
                    } else if (SC && key) {
                        SC.put(key, '');   // '' sentinel: resolved, no translation needed
                    }
                });
                if (any) injectToggle(e.card, target);
            });
        }

        // Resolve a settled set of near-viewport cards through the ladder.
        async function flush(cards) {
            const entries = collectFrom(cards);
            if (!entries.length) return;
            const target = readerLang();
            entries.forEach(function (e) { e.card.setAttribute('data-tr-done', '1'); });

            // Steps 1-2: same-language short-circuit + session cache. Only fields
            // that fall through both become network candidates.
            const misses = [];
            entries.forEach(function (e) {
                e.fields.forEach(function (f) {
                    const source = (f.el.textContent || '').trim();
                    f._source = source;
                    if (!source || T.sameLanguageSkip(source, target)) { f._text = ''; return; }
                    const key = scKey(e.type, e.id, f.field, target);
                    const pre = (SC && key) ? SC.get(key) : undefined;
                    if (pre !== undefined) { f._text = pre; return; }   // translated string or '' sentinel
                    if (skip.has(T.tupleKey(e.type, e.id, f.field, target))) { f._text = ''; return; }
                    misses.push({ e: e, f: f });
                });
            });

            if (misses.length) {
                const sb = await client();
                if (sb) {
                    // Step 3: batched DB cache read for the miss ids.
                    const ids = Array.from(new Set(misses.map(function (m) { return m.e.id; })));
                    const cacheMap = await readCache(sb, ids, target);
                    const stillMiss = [];
                    misses.forEach(function (m) {
                        const cn = T.normalizeTranslation(cacheMap[T.cacheMapKey(m.e.type, m.e.id, m.f.field)]);
                        if (cacheMap[T.cacheMapKey(m.e.type, m.e.id, m.f.field)]) {
                            m.f._text = (cn && T.needsTranslation(cn.sourceLanguage, target)) ? cn.translated : '';
                        } else {
                            stillMiss.push(m);
                        }
                    });
                    // Step 4: one batched translate call for the remaining misses.
                    if (stillMiss.length) {
                        const stop = startIndicators(stillMiss);
                        const items = stillMiss.map(function (m) {
                            return { contentType: m.e.type, contentId: m.e.id, field: m.f.field };
                        });
                        const resultMap = await batchTranslate(sb, items, target);
                        stillMiss.forEach(function (m) {
                            const rn = resultMap[m.e.type + '|' + m.e.id + '|' + m.f.field] || null;
                            m.f._text = (rn && T.needsTranslation(rn.sourceLanguage, target)) ? rn.translated : '';
                        });
                        stop();
                    }
                }
            }
            applyEntries(entries, target);
        }

        // --- trigger: translate cards a screen or two before they're seen ----
        // Primary signal is an IntersectionObserver lookahead (AC6). A rAF-
        // throttled sweep — run on register, scroll and resize — is the robust
        // fallback: it enqueues any registered card currently within the
        // lookahead band, so the first screen starts immediately (AC7) and the
        // feature still works where IntersectionObserver never fires.
        const pending = new Set();
        const LOOKAHEAD_PX = 800;                // ~one to two screens ahead
        let scheduled = false;

        function nearViewport(card) {
            const h = window.innerHeight;
            if (!h) return true;                 // viewport unmeasurable -> don't strand cards
            const r = card.getBoundingClientRect();
            return r.top < h + LOOKAHEAD_PX && r.bottom > -LOOKAHEAD_PX;
        }

        function sweep() {
            document.querySelectorAll('[data-tr-card][data-tr-registered]:not([data-tr-done])')
                .forEach(function (card) { if (nearViewport(card)) pending.add(card); });
        }

        function runFlush() {
            if (!scheduled) return;
            scheduled = false;
            sweep();
            const cards = Array.from(pending);
            pending.clear();
            if (cards.length) flush(cards);
        }

        function schedule() {
            if (scheduled) return;
            scheduled = true;
            // rAF aligns the flush with paint; setTimeout is the fallback for
            // background tabs and embedded webviews where rAF is paused. The
            // `scheduled` guard makes whichever fires first the single winner.
            requestAnimationFrame(runFlush);
            setTimeout(runFlush, 32);
        }

        const io = ('IntersectionObserver' in window)
            ? new IntersectionObserver(function (obsEntries) {
                let any = false;
                obsEntries.forEach(function (en) {
                    if (!en.isIntersecting) return;
                    io.unobserve(en.target);
                    pending.add(en.target);
                    any = true;
                });
                if (any) schedule();
            }, { rootMargin: LOOKAHEAD_PX + 'px 0px' })
            : null;

        // Discovery: mark + observe each new card, then sweep (catches cards
        // already within the lookahead band at registration). Idempotent.
        function register(rootEl) {
            const r = rootEl || document;
            if (!r.querySelectorAll) return;
            r.querySelectorAll('[data-tr-card]:not([data-tr-registered])').forEach(function (card) {
                card.setAttribute('data-tr-registered', '1');
                if (io) io.observe(card);
            });
            schedule();
        }

        function boot() {
            register(document);
            const observer = new MutationObserver(function (muts) {
                for (const m of muts) {
                    if (m.addedNodes && m.addedNodes.length) { register(document); return; }
                }
            });
            observer.observe(document.body, { childList: true, subtree: true });
            window.addEventListener('scroll', schedule, { passive: true });
            window.addEventListener('resize', schedule);
        }

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', boot);
        } else {
            boot();
        }

        // Existing callers nudge the driver via scan(); it registers cards with
        // the viewport observer + sweep instead of translating immediately.
        window.GloweTranslate.scan = register;
    })();
}
