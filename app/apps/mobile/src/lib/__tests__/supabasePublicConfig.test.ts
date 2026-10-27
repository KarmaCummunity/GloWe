import { afterEach, describe, expect, it } from 'vitest';
import { getSupabasePublicEnv, isSupabaseConfigured } from '../supabasePublicConfig';

const ORIG_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const ORIG_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

afterEach(() => {
  if (ORIG_URL === undefined) delete process.env.EXPO_PUBLIC_SUPABASE_URL;
  else process.env.EXPO_PUBLIC_SUPABASE_URL = ORIG_URL;
  if (ORIG_KEY === undefined) delete process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  else process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = ORIG_KEY;
});

describe('supabasePublicConfig', () => {
  it('returns null when url or anon key missing', () => {
    delete process.env.EXPO_PUBLIC_SUPABASE_URL;
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'key';
    expect(getSupabasePublicEnv()).toBeNull();
    expect(isSupabaseConfigured()).toBe(false);
  });

  it('returns trimmed env when both set', () => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = ' https://example.supabase.co ';
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = ' anon ';
    expect(getSupabasePublicEnv()).toEqual({
      url: 'https://example.supabase.co',
      anonKey: 'anon',
    });
    expect(isSupabaseConfigured()).toBe(true);
  });
});
