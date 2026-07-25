// FR-TRANSLATE-003 — interface i18n coverage guard.
//
// app.js is a browser script (touches window/document at load), so it cannot be
// imported here. Instead the two i18n literals are extracted from the source by
// brace matching and evaluated in isolation — they are pure data.
//
// The point of this test: a new UI string added to `he` but forgotten in
// ru/ar/am silently falls back to English for those readers. That regression is
// invisible in review, so it is asserted here instead.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const APP_JS = join(dirname(fileURLToPath(import.meta.url)), '..', 'app.js');
const source = readFileSync(APP_JS, 'utf8');

// Brace-match the object/array literal that follows `declaration`, skipping over
// string contents and line comments so braces inside them do not miscount.
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

const LANGUAGES = extractLiteral(source, 'const GLOWE_LANGUAGES = [', '[', ']');
const TRANSLATIONS = extractLiteral(source, 'const GLOWE_TRANSLATIONS = {', '{', '}');
const RTL = extractLiteral(source, 'const GLOWE_RTL_LANGS = [', '[', ']');

// English is the source language: its strings are the keys, so it has no dict.
const TRANSLATED = LANGUAGES.map(l => l.code).filter(code => code !== 'en');

describe('GLOWE_LANGUAGES', () => {
    it('offers English, Hebrew, Russian, Arabic and Amharic', () => {
        expect(LANGUAGES.map(l => l.code)).toEqual(['en', 'he', 'ru', 'ar', 'am']);
    });

    it('labels every language with a non-empty endonym', () => {
        for (const { code, native } of LANGUAGES) {
            expect(native, `${code} endonym`).toBeTruthy();
        }
        // Endonyms, not English names — a Russian speaker looks for "Русский".
        expect(LANGUAGES.find(l => l.code === 'ru').native).toBe('Русский');
        expect(LANGUAGES.find(l => l.code === 'ar').native).toBe('العربية');
        expect(LANGUAGES.find(l => l.code === 'am').native).toBe('አማርኛ');
        expect(LANGUAGES.find(l => l.code === 'he').native).toBe('עברית');
    });

    it('marks exactly the right-to-left scripts as RTL', () => {
        expect([...RTL].sort()).toEqual(['ar', 'he']);
        // Amharic and Russian are left-to-right despite being non-Latin.
        expect(RTL).not.toContain('am');
        expect(RTL).not.toContain('ru');
    });
});

describe('GLOWE_TRANSLATIONS', () => {
    it('ships a dictionary for every non-English language', () => {
        expect(Object.keys(TRANSLATIONS).sort()).toEqual([...TRANSLATED].sort());
    });

    it.each(TRANSLATED)('%s covers every key in the Hebrew baseline', (code) => {
        const baseline = Object.keys(TRANSLATIONS.he);
        const missing = baseline.filter(key => !(key in TRANSLATIONS[code]));
        expect(missing, `${code} is missing ${missing.length} key(s)`).toEqual([]);
    });

    it.each(TRANSLATED)('%s introduces no key the baseline lacks', (code) => {
        const baseline = new Set(Object.keys(TRANSLATIONS.he));
        const extra = Object.keys(TRANSLATIONS[code]).filter(key => !baseline.has(key));
        // An extra key is almost always a typo in the English source string,
        // which means the intended string never gets translated at runtime.
        expect(extra, `${code} has ${extra.length} unmatched key(s)`).toEqual([]);
    });

    it.each(TRANSLATED)('%s has no blank translations', (code) => {
        const blank = Object.entries(TRANSLATIONS[code])
            .filter(([, value]) => typeof value !== 'string' || value.trim() === '')
            .map(([key]) => key);
        expect(blank).toEqual([]);
    });

    it('localizes the UGC translation toggle in every language', () => {
        // glowe-translate.js emits these English labels and relies on
        // translateGloweTree() to localize them.
        for (const code of TRANSLATED) {
            expect(TRANSLATIONS[code]['Show original'], code).toBeTruthy();
            expect(TRANSLATIONS[code]['Show translation'], code).toBeTruthy();
        }
    });
});
