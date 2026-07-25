// Playwright / agent helper — mint a GloWe session via the local mock-login Edge Function.
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './glowe.js';
import type { SupabaseSession } from './glowe.js';
import { gloweStorageState } from './glowe.js';

const LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost']);

export function isLocalSupabaseUrl(url = SUPABASE_URL): boolean {
  try {
    return LOCAL_HOSTS.has(new URL(url).hostname);
  } catch {
    return false;
  }
}

export type MockLoginOptions = {
  userId?: string;
  email?: string;
  role?: 'user' | 'admin';
};

export type MockLoginResponse = {
  session: SupabaseSession;
  user: { id: string; name: string; email: string; type: string; avatarUrl?: string };
};

/** POST /functions/v1/mock-login — local Supabase only; 404 elsewhere. */
export async function mockLogin(options: MockLoginOptions = {}): Promise<MockLoginResponse | null> {
  if (!isLocalSupabaseUrl()) return null;
  const res = await fetch(`${SUPABASE_URL.replace(/\/$/, '')}/functions/v1/mock-login`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(options),
  });
  if (!res.ok) return null;
  const body = await res.json() as MockLoginResponse;
  if (!body?.session?.access_token) return null;
  return body;
}

export async function mockLoginStorageState(
  displayName: string,
  options: MockLoginOptions = {},
) {
  const result = await mockLogin(options);
  if (!result) return null;
  return gloweStorageState(result.session, displayName);
}
