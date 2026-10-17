export function supabaseConfig() {
  const url = __ENV.K6_SUPABASE_URL;
  const anonKey = __ENV.K6_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error('Set K6_SUPABASE_URL and K6_SUPABASE_ANON_KEY (dev only).');
  }
  const auth = __ENV.K6_TEST_USER_JWT
    ? { Authorization: `Bearer ${__ENV.K6_TEST_USER_JWT}` }
    : { apikey: anonKey, Authorization: `Bearer ${anonKey}` };
  return { url: url.replace(/\/$/, ''), anonKey, authHeaders: { ...auth, 'Content-Type': 'application/json' } };
}

export function rpc(name, body, tags) {
  const { url, authHeaders } = supabaseConfig();
  return {
    method: 'POST',
    url: `${url}/rest/v1/rpc/${name}`,
    body: JSON.stringify(body ?? {}),
    headers: authHeaders,
    tags,
  };
}
