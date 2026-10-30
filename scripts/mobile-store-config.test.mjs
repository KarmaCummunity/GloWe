// Unit tests for scripts/mobile-store-config.mjs. Run: node --test scripts/mobile-store-config.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SUPABASE_REFS, checkAnonKey, injectProfileEnv, resolveStoreConfig } from './mobile-store-config.mjs';

/** Build an unsigned JWT with the given payload (only the payload is inspected). */
const jwt = (payload) =>
  ['e30', Buffer.from(JSON.stringify(payload)).toString('base64url'), 'sig'].join('.');

test('resolves each target to its project URL', () => {
  const prod = resolveStoreConfig({ target: 'prod', anonKey: 'sb_publishable_x' });
  assert.deepEqual(prod, {
    ref: SUPABASE_REFS.prod,
    url: `https://${SUPABASE_REFS.prod}.supabase.co`,
    errors: [],
  });
  assert.equal(resolveStoreConfig({ target: 'dev', anonKey: 'sb_publishable_x' }).ref, SUPABASE_REFS.dev);
});

test('rejects an unknown or missing target', () => {
  assert.match(resolveStoreConfig({ target: 'staging', anonKey: 'k' }).errors[0], /must be one of prod, dev/);
  assert.match(resolveStoreConfig({ target: undefined, anonKey: 'k' }).errors[0], /got ""/);
  assert.match(resolveStoreConfig({ target: 'toString', anonKey: 'k' }).errors[0], /must be one of/);
});

test('rejects a missing key', () => {
  assert.deepEqual(resolveStoreConfig({ target: 'prod', anonKey: '' }).errors, ['MOBILE_SUPABASE_ANON_KEY is not set']);
});

test('accepts a legacy anon JWT of the same project', () => {
  assert.deepEqual(checkAnonKey(jwt({ ref: SUPABASE_REFS.dev, role: 'anon' }), SUPABASE_REFS.dev), []);
});

test('rejects an anon JWT of the other project', () => {
  const errors = checkAnonKey(jwt({ ref: SUPABASE_REFS.dev, role: 'anon' }), SUPABASE_REFS.prod);
  assert.deepEqual(errors, [`MOBILE_SUPABASE_ANON_KEY belongs to project "${SUPABASE_REFS.dev}", not "${SUPABASE_REFS.prod}"`]);
});

test('rejects service-role and secret keys', () => {
  assert.match(checkAnonKey(jwt({ ref: 'r', role: 'service_role' }), 'r')[0], /role "service_role"/);
  assert.match(checkAnonKey('sb_secret_abc', 'r')[0], /secret key/);
});

test('rejects a value that is not a Supabase key', () => {
  assert.match(checkAnonKey('not-a-key', 'r')[0], /neither/);
});

test('injectProfileEnv merges into one profile and keeps the rest untouched', () => {
  const eas = { cli: {}, build: { production: { env: { A: '1' } }, preview: { env: { B: '2' } } } };
  const next = injectProfileEnv(eas, 'production', { C: '3' });
  assert.deepEqual(next.build.production.env, { A: '1', C: '3' });
  assert.deepEqual(next.build.preview, { env: { B: '2' } });
  assert.deepEqual(eas.build.production.env, { A: '1' });
});

test('injectProfileEnv fails on an unknown profile', () => {
  assert.throws(() => injectProfileEnv({ build: {} }, 'production', {}), /no build profile "production"/);
});
