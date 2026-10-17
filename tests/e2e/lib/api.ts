import { anonKey, SUPABASE_URL } from './env';
import { fetchPasswordSession } from './supabaseSession';

export async function sessionFor(user: { email: string; password: string }) {
  return fetchPasswordSession({ supabaseUrl: SUPABASE_URL, anonKey: await anonKey(), ...user });
}

/** Authenticated PostgREST call as the given user. Throws with the server message on error. */
export async function rest<T = unknown>(
  accessToken: string,
  path: string,
  init: { method?: string; body?: unknown } = {},
): Promise<T> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: init.method ?? 'GET',
    headers: {
      apikey: await anonKey(),
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(`${res.status} ${path}: ${data?.message ?? text}`);
  return data as T;
}

export const runTag = () => `[e2e ${new Date().toISOString().slice(0, 16)}]`;
