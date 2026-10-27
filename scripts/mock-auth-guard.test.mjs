import test from 'node:test';
import assert from 'node:assert/strict';

const LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost']);

function isLocalSupabaseUrl(url) {
  try {
    return LOCAL_HOSTS.has(new URL(url).hostname);
  } catch {
    return false;
  }
}

test('mock auth guard allows only local Supabase URLs', () => {
  assert.equal(isLocalSupabaseUrl('http://127.0.0.1:54321'), true);
  assert.equal(isLocalSupabaseUrl('http://localhost:54321'), true);
  assert.equal(isLocalSupabaseUrl('https://roeefqpdbftlndzsvhfj.supabase.co'), false);
});

test('mock auth guard rejects hosted supabase.co and allows kong runtime', () => {
  function isMockAuthEnvironment(supabaseUrl) {
    if (!supabaseUrl || /\.supabase\.co$/i.test(supabaseUrl) || supabaseUrl.includes('.supabase.co')) return false;
    try {
      const host = new URL(supabaseUrl).hostname;
      if (LOCAL_HOSTS.has(host)) return true;
      if (host === 'kong' || host.endsWith('.kong')) return true;
    } catch { /* ignore */ }
    return false;
  }
  assert.equal(isMockAuthEnvironment('http://kong:8000'), true);
  assert.equal(isMockAuthEnvironment('https://abc.supabase.co'), false);
});
