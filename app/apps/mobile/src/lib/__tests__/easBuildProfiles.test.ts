import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/** Ensures EAS profiles declare environment tier (#857). Supabase URL/key are injected via EAS secrets. */
describe('eas.json build profiles', () => {
  it('sets EXPO_PUBLIC_ENVIRONMENT on development, preview, and production', () => {
    const raw = readFileSync(join(__dirname, '../../../eas.json'), 'utf8');
    const eas = JSON.parse(raw) as {
      build: Record<string, { env?: Record<string, string> }>;
    };

    expect(eas.build.development?.env?.EXPO_PUBLIC_ENVIRONMENT).toBe('development');
    expect(eas.build.preview?.env?.EXPO_PUBLIC_ENVIRONMENT).toBe('development');
    expect(eas.build.production?.env?.EXPO_PUBLIC_ENVIRONMENT).toBe('production');
  });
});
