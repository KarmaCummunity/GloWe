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
    // js/glowe-localized-name.js. \u escapes (not literal glyphs) keep the
    // inline-Hebrew lint guard + bidi rendering clean.
    const HEBREW = /[\u0590-\u05FF]/;
    const NON_LATIN = /[\u0590-\u05FF\u0600-\u06FF\u0400-\u04FF\u0370-\u03FF\u4E00-\u9FFF]/;
    // Hebrew cantillation / nikud marks — strip before equality so
    // "חינוך" vs "הִנּוּךְ" (or synonym+nikud paraphrases) can be detected.
    const HEBREW_MARKS = /[\u0591-\u05C7]/g;

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

    function stripHebrewMarks(text) {
        return String(text || '').replace(HEBREW_MARKS, '').replace(/\s+/g, ' ').trim();
    }

    // Fields that warrant a card-level "Show original" toggle. Meta chips
    // (org_field, location, duration, skills.*) may still translate silently.
    const PRIMARY_CONTENT_FIELDS = {
        title: 1, description: 1, text: 1, body: 1,
        about: 1, org_description: 1, mission: 1
    };

    function isPrimaryContentField(field) {
        return !!PRIMARY_CONTENT_FIELDS[String(field || '')];
    }

    // Gate for applying a candidate translation to the DOM. Blocks:
    // - empty / identical strings (incl. nikud-only diffs)
    // - source already in reader language (stops he→he paraphrases like חינוך→השכלה)
    // - explicit same-base sourceLanguage from cache/provider when present
    function acceptTranslation(source, translated, target, sourceLanguage) {
        const src = String(source || '').trim();
        const out = String(translated || '').trim();
        if (!out || out === src) return false;
        if (stripHebrewMarks(out) === stripHebrewMarks(src)) return false;
        if (sameLanguageSkip(src, target)) return false;
        if (sourceLanguage && !needsTranslation(sourceLanguage, target)) return false;
        return true;
    }

    return {
        baseLang: baseLang,
        needsTranslation: needsTranslation,
        tupleKey: tupleKey,
        cacheMapKey: cacheMapKey,
        normalizeTranslation: normalizeTranslation,
        sameLanguageSkip: sameLanguageSkip,
        stripHebrewMarks: stripHebrewMarks,
        isPrimaryContentField: isPrimaryContentField,
        acceptTranslation: acceptTranslation,
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
        const RETRY_DELAY_MS = 2500;             // backoff after provider `error`
        const MAX_CARD_RETRIES = 4;              // then leave source text (AC9)
        const cardRetries = new WeakMap();       // card → attempt count
        let retryTimer = null;

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
                if (error) {
                    console.warn('[glowe-translate] cache read failed', error);
                    return {};
                }
                if (!data) return {};
                const map = {};
                data.forEach(function (r) {
                    map[T.cacheMapKey(r.content_type, r.content_id, r.field)] = r;
                });
                return map;
            } catch (err) {
                console.warn('[glowe-translate] cache read threw', err);
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
        // Chunks to <=CHUNK items/request. Maps results by (type|id|field).
        // Intentional `skipped` joins the permanent skip-set; provider `error`
        // stays out so a later flush can retry after backoff.
        async function batchTranslate(sb, items, target) {
            const map = {};
            for (let i = 0; i < items.length; i += CHUNK) {
                const chunk = items.slice(i, i + CHUNK);
                try {
                    const { data, error } = await sb.functions.invoke('glowe-translate', {
                        body: { targetLanguage: target, items: chunk },
                    });
                    if (error || !data || !Array.isArray(data.results)) {
                        // Most common silent miss: CORS (Origin not allow-listed) —
                        // the Edge call succeeds server-side but the browser hides
                        // the body, so we get error/null here with no translation.
                        console.warn('[glowe-translate] batch invoke failed', {
                            target: target,
                            count: chunk.length,
                            error: error || null,
                            dataType: data == null ? 'null' : typeof data,
                        });
                        continue;
                    }
                    data.results.forEach(function (r) {
                        const k = r.contentType + '|' + r.contentId + '|' + r.field;
                        if (r.status === 'error') {
                            console.warn('[glowe-translate] provider error (will retry)', {
                                contentId: r.contentId,
                                field: r.field,
                                target: target,
                            });
                            map[k] = null;
                            return;
                        }
                        const norm = (r.status !== 'skipped') ? T.normalizeTranslation(r.translation) : null;
                        map[k] = norm;
                        if (!norm) {
                            // Intentional skip (same-lang / empty / echo) — don't
                            // re-hit Edge for this tuple this session.
                            skip.add(T.tupleKey(r.contentType, r.contentId, r.field, target));
                        }
                    });
                } catch (err) {
                    console.warn('[glowe-translate] batch invoke threw', err);
                }
            }
            return map;
        }

        // Apply each field's resolution. `f._text` is: a translated string to
        // apply; '' meaning resolved with no translation (remember in session
        // cache); or undefined meaning unresolved (leave the source, cache
        // nothing). Toggle only for primary content fields — meta chips may
        // translate silently without "הצג מקור" on an otherwise-Hebrew card.
        function applyEntries(entries, target) {
            entries.forEach(function (e) {
                let showToggle = false;
                e.fields.forEach(function (f) {
                    if (typeof f._text !== 'string') return;   // unresolved -> leave source
                    const key = scKey(e.type, e.id, f.field, target);
                    if (f._text) {
                        if (!T.acceptTranslation(f._source, f._text, target, f._sourceLanguage || null)) {
                            // Do NOT session-cache '' here — a rejected candidate
                            // may be poison; next paint should be allowed to retry.
                            f._text = '';
                            return;
                        }
                        if (applyTranslation(f.el, f._source, f._text)) {
                            if (T.isPrimaryContentField(f.field)) showToggle = true;
                            if (SC && key) SC.put(key, f._text);
                        }
                    } else if (SC && key && T.sameLanguageSkip(f._source, target)) {
                        // '' sentinel only for intentional same-language skips.
                        SC.put(key, '');
                    }
                });
                if (showToggle) injectToggle(e.card, target);
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
                    f._sourceLanguage = null;
                    if (!source || T.sameLanguageSkip(source, target)) { f._text = ''; return; }
                    const key = scKey(e.type, e.id, f.field, target);
                    const pre = (SC && key) ? SC.get(key) : undefined;
                    if (pre !== undefined) {
                        // Non-empty hit must still pass acceptTranslation.
                        if (pre && T.acceptTranslation(source, pre, target, null)) {
                            f._text = pre;
                            return;
                        }
                        // '' sentinel is only valid while source is still same-lang;
                        // a stale '' over Latin text (poison recovery) must retry.
                        if (pre === '' && T.sameLanguageSkip(source, target)) {
                            f._text = '';
                            return;
                        }
                        // Fall through to network (ignore stale/poison session).
                    }
                    if (skip.has(T.tupleKey(e.type, e.id, f.field, target))) { f._text = ''; return; }
                    misses.push({ e: e, f: f });
                });
            });

            let hadProviderMiss = false;
            if (misses.length) {
                const sb = await client();
                if (!sb) {
                    console.warn('[glowe-translate] no backend client; leaving source text');
                    hadProviderMiss = true;
                } else {
                    // Step 3: batched DB cache read for the miss ids.
                    const ids = Array.from(new Set(misses.map(function (m) { return m.e.id; })));
                    const cacheMap = await readCache(sb, ids, target);
                    const stillMiss = [];
                    misses.forEach(function (m) {
                        const raw = cacheMap[T.cacheMapKey(m.e.type, m.e.id, m.f.field)];
                        const cn = T.normalizeTranslation(raw);
                        if (cn && T.acceptTranslation(m.f._source, cn.translated, target, cn.sourceLanguage)) {
                            m.f._text = cn.translated;
                            m.f._sourceLanguage = cn.sourceLanguage;
                        } else {
                            // Missing OR rejected poison → ask Edge (which deletes
                            // unusable rows and re-translates).
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
                            if (rn && T.acceptTranslation(m.f._source, rn.translated, target, rn.sourceLanguage)) {
                                m.f._text = rn.translated;
                                m.f._sourceLanguage = rn.sourceLanguage;
                            } else {
                                // Unresolved foreign text — leave undefined so we
                                // can clear data-tr-done and retry (not '' which
                                // would look "settled" to applyEntries).
                                if (!T.sameLanguageSkip(m.f._source, target)
                                    && !skip.has(T.tupleKey(m.e.type, m.e.id, m.f.field, target))) {
                                    hadProviderMiss = true;
                                    m.f._text = undefined;
                                } else {
                                    m.f._text = '';
                                }
                            }
                        });
                        stop();
                    }
                }
            }
            applyEntries(entries, target);

            // Cards that still need a foreign→reader translation: unlock and
            // re-queue with backoff (provider 429 / network blip). Cap retries
            // so a permanently broken provider does not spin forever (AC9).
            let needsRetry = false;
            entries.forEach(function (e) {
                const stillNeeds = e.fields.some(function (f) {
                    if (!f._source || T.sameLanguageSkip(f._source, target)) return false;
                    if (f.el.getAttribute('data-tr-translated')) return false;
                    if (skip.has(T.tupleKey(e.type, e.id, f.field, target))) return false;
                    return typeof f._text !== 'string' || f._text === '';
                });
                if (!stillNeeds) return;
                const n = (cardRetries.get(e.card) || 0) + 1;
                cardRetries.set(e.card, n);
                if (n > MAX_CARD_RETRIES) {
                    console.warn('[glowe-translate] giving up after retries', {
                        id: e.id,
                        attempts: n,
                    });
                    e.card.setAttribute('data-tr-done', '1');
                    return;
                }
                e.card.removeAttribute('data-tr-done');
                pending.add(e.card);
                needsRetry = true;
            });
            if (needsRetry || hadProviderMiss) scheduleRetry();
        }

        function scheduleRetry() {
            if (retryTimer) return;
            retryTimer = setTimeout(function () {
                retryTimer = null;
                schedule();
            }, RETRY_DELAY_MS);
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
            if (!cards.length) return;
            // Await so a follow-up sweep can pick up remaining / retry cards.
            Promise.resolve(flush(cards)).then(function () {
                schedule();
            }).catch(function (err) {
                console.warn('[glowe-translate] flush threw', err);
                scheduleRetry();
            });
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
