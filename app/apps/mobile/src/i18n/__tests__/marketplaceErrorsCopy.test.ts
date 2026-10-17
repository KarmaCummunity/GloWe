// Every marketplace rule/server error code has friendly he + en copy.
import { describe, expect, it } from 'vitest';
import { MARKETPLACE_SERVER_ERROR_CODES } from '@kc/domain';
import he from '../locales/he';
import en from '../locales/en';

function lookup(bundle: unknown, key: string): unknown {
  return key.split('.').reduce<unknown>((acc, k) => (acc as Record<string, unknown> | undefined)?.[k], bundle);
}

describe('marketplace error copy (he/en)', () => {
  it.each([...MARKETPLACE_SERVER_ERROR_CODES, 'generic'])('%s has non-empty he and en strings', (code) => {
    const key = `marketplace.errors.${code}`;
    for (const bundle of [he, en]) {
      const v = lookup(bundle, key);
      expect(typeof v).toBe('string');
      expect((v as string).length).toBeGreaterThan(0);
    }
  });
});
