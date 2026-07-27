// FR-GLOWE-028 — consent banner contract (no DOM runtime; browser IIFE).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const CONSENT_JS = join(dirname(fileURLToPath(import.meta.url)), '..', 'glowe-consent.js');
const APP_JS = join(dirname(fileURLToPath(import.meta.url)), '..', 'app.js');
const source = readFileSync(CONSENT_JS, 'utf8');
const appSource = readFileSync(APP_JS, 'utf8');

describe('glowe-consent.js', () => {
    it('persists choice under glowe-consent-v1', () => {
        expect(source).toContain("glowe-consent-v1");
        expect(source).toContain('localStorage');
    });

    it('links to privacy.html and exposes Got it dismiss', () => {
        expect(source).toContain('privacy.html');
        expect(source).toContain('Got it');
        expect(source).toContain('GloweConsent');
    });

    it('is wired from ensureGlobalUI and footer legal links', () => {
        expect(appSource).toContain('ensureConsentBanner');
        expect(appSource).toContain('GloweConsent');
        expect(appSource).toMatch(/privacy\.html/);
        expect(appSource).toMatch(/accessibility\.html/);
    });
});
