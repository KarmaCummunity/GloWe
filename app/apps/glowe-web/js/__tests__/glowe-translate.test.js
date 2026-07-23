import { describe, it, expect } from 'vitest';
import GloweTranslate from '../glowe-translate.js';

describe('baseLang', () => {
    it('strips the region subtag and lowercases', () => {
        expect(GloweTranslate.baseLang('en-US')).toBe('en');
        expect(GloweTranslate.baseLang('HE')).toBe('he');
        expect(GloweTranslate.baseLang('')).toBe('');
        expect(GloweTranslate.baseLang(null)).toBe('');
    });
});

describe('needsTranslation', () => {
    it('treats an unknown source as always needing translation', () => {
        expect(GloweTranslate.needsTranslation(null, 'en')).toBe(true);
        expect(GloweTranslate.needsTranslation('', 'he')).toBe(true);
    });

    it('is false when base languages match, true when they differ', () => {
        expect(GloweTranslate.needsTranslation('en-US', 'en')).toBe(false);
        expect(GloweTranslate.needsTranslation('he', 'he')).toBe(false);
        expect(GloweTranslate.needsTranslation('he', 'en')).toBe(true);
    });
});

describe('tupleKey / cacheMapKey', () => {
    it('builds stable keys', () => {
        expect(GloweTranslate.tupleKey('glowe_post', 'post-1', 'title', 'en'))
            .toBe('glowe_post|post-1|title|en');
        expect(GloweTranslate.cacheMapKey('glowe_post', 'post-1', 'title'))
            .toBe('glowe_post|post-1|title');
    });
});

describe('normalizeTranslation', () => {
    it('reads the snake_case (PostgREST) shape', () => {
        expect(GloweTranslate.normalizeTranslation({ translated_text: 'Hello', source_language: 'he' }))
            .toEqual({ translated: 'Hello', sourceLanguage: 'he' });
    });

    it('reads the camelCase (function) shape', () => {
        expect(GloweTranslate.normalizeTranslation({ translatedText: 'Hello', sourceLanguage: 'he' }))
            .toEqual({ translated: 'Hello', sourceLanguage: 'he' });
    });

    it('returns null for empty / missing translated text', () => {
        expect(GloweTranslate.normalizeTranslation(null)).toBe(null);
        expect(GloweTranslate.normalizeTranslation({ translated_text: '' })).toBe(null);
        expect(GloweTranslate.normalizeTranslation({})).toBe(null);
    });

    it('defaults a missing source language to null', () => {
        expect(GloweTranslate.normalizeTranslation({ translated_text: 'Hi' }))
            .toEqual({ translated: 'Hi', sourceLanguage: null });
    });
});

describe('sameLanguageSkip', () => {
    it('he reader skips text containing Hebrew letters (incl. mixed)', () => {
        expect(GloweTranslate.sameLanguageSkip('שלום עולם', 'he')).toBe(true);
        expect(GloweTranslate.sameLanguageSkip('שלום world', 'he')).toBe(true);
    });
    it('he reader does NOT skip pure-Latin or other scripts', () => {
        expect(GloweTranslate.sameLanguageSkip('Hello world', 'he')).toBe(false);
        expect(GloweTranslate.sameLanguageSkip('Привет', 'he')).toBe(false);
    });
    it('en reader skips pure-Latin text only', () => {
        expect(GloweTranslate.sameLanguageSkip('Hello world', 'en')).toBe(true);
        expect(GloweTranslate.sameLanguageSkip('café 123!', 'en')).toBe(true);
    });
    it('en reader does NOT skip text with non-Latin letters', () => {
        expect(GloweTranslate.sameLanguageSkip('שלום', 'en')).toBe(false);
        expect(GloweTranslate.sameLanguageSkip('Hello שלום', 'en')).toBe(false);
    });
    it('never skips empty / whitespace text (let downstream short-circuit handle it)', () => {
        expect(GloweTranslate.sameLanguageSkip('', 'he')).toBe(false);
        expect(GloweTranslate.sameLanguageSkip('   ', 'en')).toBe(false);
    });
});
