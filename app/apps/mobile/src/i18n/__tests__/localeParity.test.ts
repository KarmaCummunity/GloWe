// FR-SETTINGS-018 — guards the English UI locale against key drift.
//
// The `en` bundle is machine-translated from `he` and must stay structurally
// identical: every key path present in one must exist in the other. A missing
// key would silently fall back to Hebrew; an extra key is dead weight. Functions
// (e.g. admin.ts label builders) and array items are compared as leaves/by index.
import { describe, expect, it } from 'vitest';
import he from '../locales/he';
import en from '../locales/en';

function keyPaths(value: unknown, prefix = ''): string[] {
  if (value === null || typeof value !== 'object') return [prefix];
  if (Array.isArray(value)) {
    return value.flatMap((item, i) => keyPaths(item, `${prefix}[${i}]`));
  }
  const record = value as Record<string, unknown>;
  return Object.keys(record)
    .sort((a, b) => a.localeCompare(b))
    .flatMap((key) => keyPaths(record[key], prefix ? `${prefix}.${key}` : key));
}

describe('i18n locale parity (FR-SETTINGS-018)', () => {
  const hePaths = keyPaths(he);
  const enPaths = keyPaths(en);
  const heSet = new Set(hePaths);
  const enSet = new Set(enPaths);

  it('en covers every key path in he (no untranslated gaps)', () => {
    expect(hePaths.filter((p) => !enSet.has(p))).toEqual([]);
  });

  it('en has no key paths absent from he (no stray keys)', () => {
    expect(enPaths.filter((p) => !heSet.has(p))).toEqual([]);
  });

  it('exposes the app-language keys added for FR-SETTINGS-018', () => {
    expect(heSet.has('settings.language')).toBe(true);
    expect(enSet.has('settings.languageScreen.title')).toBe(true);
  });
});
