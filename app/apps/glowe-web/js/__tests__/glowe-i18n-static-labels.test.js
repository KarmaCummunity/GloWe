// FR-TRANSLATE-003 — static-label language-gap guard.
//
// FR-GLOWE-016 bug: the post-type badge ("Post | Knowledge Share") always
// rendered in English regardless of the selected interface language, because
// its template literal welded a hardcoded English word directly onto a
// dynamic value ( `Post | ${post.category}` ). That produces ONE DOM text
// node ("Post | Knowledge Share"), and the passive i18n walker
// (translateGloweTree in app.js) only ever matches a whole, isolated text
// node against a dictionary key — a merged node can never match.
//
// This file has two layers of defense:
//   1. A whole-file static scan that fails on ANY occurrence of that pattern
//      anywhere in app.js, so a future render function can't reintroduce it
//      silently (glowePostTypeLabel/glowePrefixedLabel exist precisely so
//      call sites never need to write the pattern by hand again).
//   2. Unit tests of the two helpers extracted from source, proving the
//      original bug scenario ("Knowledge Share" while reader language is
//      "he") now renders localized text.
//
// app.js is a browser script (touches window/document at load), so it can't
// be imported here — the relevant literals/functions are extracted from the
// source text and evaluated in isolation, same technique as glowe-i18n.test.js.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const APP_JS = join(dirname(fileURLToPath(import.meta.url)), '..', 'app.js');
const source = readFileSync(APP_JS, 'utf8');

function extractLiteral(src, declaration, open, close) {
    const start = src.indexOf(declaration);
    if (start === -1) throw new Error(`declaration not found: ${declaration}`);
    const from = src.indexOf(open, start);
    let depth = 0;
    let inString = null;
    let escaped = false;
    for (let i = from; i < src.length; i++) {
        const c = src[i];
        if (inString) {
            if (escaped) { escaped = false; continue; }
            if (c === '\\') { escaped = true; continue; }
            if (c === inString) inString = null;
            continue;
        }
        if (c === '"' || c === "'" || c === '`') { inString = c; continue; }
        if (c === '/' && src[i + 1] === '/') { while (i < src.length && src[i] !== '\n') i++; continue; }
        if (c === open) depth++;
        else if (c === close) {
            depth--;
            if (depth === 0) return new Function(`return (${src.slice(from, i + 1)})`)();
        }
    }
    throw new Error(`unterminated literal for: ${declaration}`);
}

function extractFunctionSource(src, signature) {
    const start = src.indexOf(signature);
    if (start === -1) throw new Error(`function not found: ${signature}`);
    const braceStart = src.indexOf('{', start);
    let depth = 0;
    for (let i = braceStart; i < src.length; i++) {
        if (src[i] === '{') depth++;
        else if (src[i] === '}') {
            depth--;
            if (depth === 0) return src.slice(start, i + 1);
        }
    }
    throw new Error(`unterminated function: ${signature}`);
}

describe('static English label welded to a dynamic value (language-gap scan)', () => {
    // Matches e.g. `>Post | ${`, `>Deadline: ${`, `>Post${` — an HTML tag's
    // rendered text starting with a capitalized static word immediately
    // followed (optionally through a separator) by a template expression, all
    // inside the same text node. This is exactly the shape that defeats
    // translateGloweTree(), which can only translate a whole, isolated text
    // node. It is the generic version of the FR-GLOWE-016 badge bug.
    const RISKY_PATTERN = />\s*([A-Z][A-Za-z]{2,})(\s*[|·:]\s*)?\$\{/g;

    it('never reintroduces a hardcoded label glued to a template expression', () => {
        const hits = [];
        let m;
        while ((m = RISKY_PATTERN.exec(source))) {
            const line = source.slice(0, m.index).split('\n').length;
            hits.push(`line ${line}: ${JSON.stringify(m[0])}`);
        }
        // If this fails: wrap the static word in its own element/helper (see
        // glowePostTypeLabel / glowePrefixedLabel in app.js) so the label is
        // translated instead of being frozen in English for every non-English
        // reader.
        expect(hits).toEqual([]);
    });
});

describe('glowePostTypeLabel()', () => {
    const GLOWE_POST_NOUN = extractLiteral(source, 'const GLOWE_POST_NOUN = {', '{', '}');
    const TRANSLATIONS = extractLiteral(source, 'const GLOWE_TRANSLATIONS = {', '{', '}');
    const LANGUAGES = extractLiteral(source, 'const GLOWE_LANGUAGES = [', '[', ']');
    const fnSrc = extractFunctionSource(source, 'function glowePostTypeLabel(category, separator) {');

    // Build the function in a sandbox with its two real dependencies
    // (gloweDict, getGloweLanguage) stubbed to a chosen reader language.
    function makeGlowePostTypeLabel(lang) {
        const gloweDict = () => TRANSLATIONS[lang] || null;
        const getGloweLanguage = () => lang;
        // eslint-disable-next-line no-new-func
        return new Function('GLOWE_POST_NOUN', 'gloweDict', 'getGloweLanguage', `${fnSrc}; return glowePostTypeLabel;`)(
            GLOWE_POST_NOUN, gloweDict, getGloweLanguage
        );
    }

    it('ships a noun translation for every non-English interface language', () => {
        for (const { code } of LANGUAGES) {
            if (code === 'en') continue;
            expect(GLOWE_POST_NOUN[code], code).toBeTruthy();
        }
    });

    it('localizes the exact FR-GLOWE-016 regression: "Post | Knowledge Share" in Hebrew', () => {
        const label = makeGlowePostTypeLabel('he')('Knowledge Share');
        expect(label).toBe(`${GLOWE_POST_NOUN.he} | ${TRANSLATIONS.he['Knowledge Share']}`);
        expect(label).not.toContain('Post');
        expect(label).not.toContain('Knowledge Share');
    });

    it.each(['he', 'ru', 'ar', 'am'])('localizes every known post-topic category in %s', (lang) => {
        const postTypeLabel = makeGlowePostTypeLabel(lang);
        const categories = [
            'Knowledge Share', 'Connection Request', 'Success Story',
            'Event / Webinar', 'Grant / Open Call', 'Professional Guide',
            'Community Discussion',
        ];
        for (const category of categories) {
            const label = postTypeLabel(category);
            expect(label, category).toBe(`${GLOWE_POST_NOUN[lang]} | ${TRANSLATIONS[lang][category]}`);
        }
    });

    it('translates only the recognized prefix of a forum-thread compound category, leaving the group title verbatim', () => {
        const postTypeLabel = makeGlowePostTypeLabel('he');
        const label = postTypeLabel('Discussion | Climate Action Network');
        expect(label).toBe(`${GLOWE_POST_NOUN.he} | ${TRANSLATIONS.he.Discussion} | Climate Action Network`);
    });

    it('falls back to the bare "Post" noun when there is no category', () => {
        expect(makeGlowePostTypeLabel('he')('')).toBe(GLOWE_POST_NOUN.he);
        expect(makeGlowePostTypeLabel('en')('')).toBe('Post');
    });

    it('honors a custom separator (member-feed compact badge)', () => {
        const label = makeGlowePostTypeLabel('he')('Knowledge Share', ' · ');
        expect(label).toBe(`${GLOWE_POST_NOUN.he} · ${TRANSLATIONS.he['Knowledge Share']}`);
    });

    it('passes categories through unchanged in English (source language)', () => {
        expect(makeGlowePostTypeLabel('en')('Knowledge Share')).toBe('Post | Knowledge Share');
    });
});

describe('glowePrefixedLabel()', () => {
    const TRANSLATIONS = extractLiteral(source, 'const GLOWE_TRANSLATIONS = {', '{', '}');
    const fnSrc = extractFunctionSource(source, "function glowePrefixedLabel(key) {");

    function makeGlowePrefixedLabel(lang) {
        const gloweDict = () => TRANSLATIONS[lang] || null;
        // eslint-disable-next-line no-new-func
        return new Function('gloweDict', `${fnSrc}; return glowePrefixedLabel;`)(gloweDict);
    }

    it.each(['he', 'ru', 'ar', 'am'])('localizes every inline label prefix used in app.js in %s', (lang) => {
        const prefixedLabel = makeGlowePrefixedLabel(lang);
        for (const key of ['Deadline', 'Audience', 'Tags', 'Reporter', 'Reason']) {
            expect(prefixedLabel(key), key).toBe(`${TRANSLATIONS[lang][key]}:`);
        }
    });

    it('falls back to the raw key with a colon when a translation is missing', () => {
        const prefixedLabel = makeGlowePrefixedLabel('en');
        expect(prefixedLabel('Deadline')).toBe('Deadline:');
    });
});

describe('gloweEnumLabel() (TD-141 — raw enum badges)', () => {
    const TRANSLATIONS = extractLiteral(source, 'const GLOWE_TRANSLATIONS = {', '{', '}');
    const GLOWE_POST_NOUN = extractLiteral(source, 'const GLOWE_POST_NOUN = {', '{', '}');
    const REPORT_STATUS = extractLiteral(source, 'const GLOWE_REPORT_STATUS_LABEL = {', '{', '}');
    const TARGET_TYPE = extractLiteral(source, 'const GLOWE_TARGET_TYPE_LABEL = {', '{', '}');
    const SAVED_ITEM_TYPE = extractLiteral(source, 'const GLOWE_SAVED_ITEM_TYPE_LABEL = {', '{', '}');
    const fnSrc = extractFunctionSource(source, 'function gloweEnumLabel(map, key) {');

    function makeGloweEnumLabel(lang) {
        const dict = TRANSLATIONS[lang] || null;
        const gloweDict = () => dict;
        const getGloweLanguage = () => lang;
        const gloweText = (key) => (dict && dict[key]) || key;
        // eslint-disable-next-line no-new-func
        return new Function(
            'GLOWE_POST_NOUN', 'gloweDict', 'getGloweLanguage', 'gloweText',
            `${fnSrc}; return gloweEnumLabel;`
        )(GLOWE_POST_NOUN, gloweDict, getGloweLanguage, gloweText);
    }

    it.each(['he', 'ru', 'ar', 'am'])('localizes every report status value in %s', (lang) => {
        const enumLabel = makeGloweEnumLabel(lang);
        for (const status of Object.keys(REPORT_STATUS)) {
            const label = enumLabel(REPORT_STATUS, status);
            expect(label, status).toBe(TRANSLATIONS[lang][REPORT_STATUS[status]]);
            expect(label, status).not.toBe(status);
        }
    });

    it.each(['he', 'ru', 'ar', 'am'])('localizes every report target type in %s, reusing the post noun for "post"', (lang) => {
        const enumLabel = makeGloweEnumLabel(lang);
        expect(enumLabel(TARGET_TYPE, 'post')).toBe(GLOWE_POST_NOUN[lang]);
        for (const type of Object.keys(TARGET_TYPE)) {
            if (type === 'post') continue;
            expect(enumLabel(TARGET_TYPE, type), type).toBe(TRANSLATIONS[lang][TARGET_TYPE[type]]);
        }
    });

    it.each(['he', 'ru', 'ar', 'am'])('localizes every saved-item type in %s, reusing the post noun for "post"', (lang) => {
        const enumLabel = makeGloweEnumLabel(lang);
        expect(enumLabel(SAVED_ITEM_TYPE, 'post')).toBe(GLOWE_POST_NOUN[lang]);
        for (const type of Object.keys(SAVED_ITEM_TYPE)) {
            if (type === 'post') continue;
            expect(enumLabel(SAVED_ITEM_TYPE, type), type).toBe(TRANSLATIONS[lang][SAVED_ITEM_TYPE[type]]);
        }
    });

    it('falls back to the raw enum value when the map has no entry for it', () => {
        const enumLabel = makeGloweEnumLabel('he');
        expect(enumLabel(TARGET_TYPE, 'unknown_type')).toBe('unknown_type');
    });
});
