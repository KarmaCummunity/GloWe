// Unit tests for scripts/smoke-deploy.mjs. Run: node --test scripts/smoke-deploy.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  checkFunctions,
  checkSupabase,
  checkWeb,
  extractScriptSrcs,
  optionsFromEnv,
  renderSummary,
  runSmoke,
  waitForVersion,
} from './smoke-deploy.mjs';

const SHA = 'a'.repeat(40);
const OLD = 'b'.repeat(40);
const WEB = 'https://dev.example.dev';
const SB = 'https://ref.supabase.co';
const INDEX = '<!DOCTYPE html><html><body><script src="/_expo/static/js/web/entry-1.js" defer></script></body></html>';

const response = (status, body = '') => ({ ok: status >= 200 && status < 300, status, text: async () => body });

/** Fake fetch: `routes` maps "METHOD url-prefix" to a response or a list served in order. */
function fakeFetch(routes) {
  const calls = [];
  const fetch = async (url, init = {}) => {
    const key = `${init.method ?? 'GET'} ${url}`;
    calls.push(key);
    const hit = Object.keys(routes).find((k) => key.startsWith(k));
    if (!hit) throw new Error(`unexpected ${key}`);
    const r = routes[hit];
    return Array.isArray(r) ? (r.length > 1 ? r.shift() : r[0]) : r;
  };
  return { fetch, calls };
}

/** Virtual clock: sleep advances time instantly. */
function clock() {
  let t = 0;
  return { now: () => t, sleep: async (ms) => { t += ms; } };
}

test('extractScriptSrcs resolves every script src against the page URL', () => {
  assert.deepEqual(extractScriptSrcs(INDEX, `${WEB}/`), [`${WEB}/_expo/static/js/web/entry-1.js`]);
  assert.deepEqual(extractScriptSrcs('<html></html>', `${WEB}/`), []);
});

test('waitForVersion keeps polling through the SPA fallback and an old build', async () => {
  const { fetch } = fakeFetch({
    [`GET ${WEB}/version.json`]: [response(200, INDEX), response(200, JSON.stringify({ sha: OLD })), response(200, JSON.stringify({ version: '1.5.3', sha: SHA }))],
  });
  const result = await waitForVersion({ webUrl: WEB, sha: SHA, timeoutMs: 60_000, fetch, ...clock() });
  assert.equal(result.ok, true);
  assert.match(result.detail, /v1\.5\.3 @ a{40} \(attempt 3\)/);
});

test('waitForVersion fails after the timeout and reports what was served', async () => {
  const { fetch, calls } = fakeFetch({ [`GET ${WEB}/version.json`]: response(200, JSON.stringify({ sha: OLD })) });
  const result = await waitForVersion({ webUrl: WEB, sha: SHA, timeoutMs: 60_000, fetch, ...clock() });
  assert.equal(result.ok, false);
  assert.match(result.detail, new RegExp(`expected ${SHA}; last: serving ${OLD}`));
  // 5 + 10 + 20 + 30 s of backoff fit in 60 s; the next 30 s wait would not.
  assert.equal(calls.length, 4);
});

test('waitForVersion without an expected SHA accepts any well-formed version.json', async () => {
  const { fetch } = fakeFetch({ [`GET ${WEB}/version.json`]: response(200, JSON.stringify({ version: '1.5.2', sha: OLD })) });
  assert.equal((await waitForVersion({ webUrl: WEB, sha: '', timeoutMs: 1000, fetch, ...clock() })).ok, true);
});

test('checkWeb requires HTML and a loadable bundle', async () => {
  const ok = fakeFetch({ [`GET ${WEB}/_expo`]: response(200), [`GET ${WEB}/`]: response(200, INDEX) });
  assert.deepEqual(await checkWeb({ webUrl: WEB, fetch: ok.fetch }), { ok: true, detail: '1 scripts load' });
  const missing = fakeFetch({ [`GET ${WEB}/_expo`]: response(404), [`GET ${WEB}/`]: response(200, INDEX) });
  assert.match((await checkWeb({ webUrl: WEB, fetch: missing.fetch })).detail, /entry-1\.js → HTTP 404/);
  const noScripts = fakeFetch({ [`GET ${WEB}/`]: response(200, '<html></html>') });
  assert.match((await checkWeb({ webUrl: WEB, fetch: noScripts.fetch })).detail, /no script bundle/);
});

test('checkSupabase needs a 200 from auth health', async () => {
  assert.equal((await checkSupabase({ supabaseUrl: SB, anonKey: 'k', fetch: fakeFetch({ [`GET ${SB}/auth`]: response(200) }).fetch })).ok, true);
  assert.equal((await checkSupabase({ supabaseUrl: SB, anonKey: 'k', fetch: fakeFetch({ [`GET ${SB}/auth`]: response(401) }).fetch })).ok, false);
});

test('checkFunctions accepts 2xx/4xx, rejects 5xx and 404', async () => {
  const { fetch } = fakeFetch({
    [`OPTIONS ${SB}/functions/v1/ok`]: response(200),
    [`OPTIONS ${SB}/functions/v1/no-options`]: response(405),
    [`OPTIONS ${SB}/functions/v1/crash`]: response(503),
    [`OPTIONS ${SB}/functions/v1/gone`]: response(404),
  });
  const result = await checkFunctions({ supabaseUrl: SB, webUrl: WEB, names: ['ok', 'no-options', 'crash', 'gone'], fetch });
  assert.equal(result.ok, false);
  assert.equal(result.detail, 'crash → HTTP 503; gone → HTTP 404');
});

test('runSmoke runs every selected check and turns a throw into a failure', async () => {
  const { fetch } = fakeFetch({ [`GET ${SB}/auth`]: response(200) });
  const results = await runSmoke({ checks: ['supabase', 'web'], webUrl: WEB, supabaseUrl: SB, anonKey: 'k', fetch, ...clock() });
  assert.deepEqual(results.map((r) => [r.check, r.ok]), [['supabase', true], ['web', false]]);
  assert.match(results[1].detail, /unexpected GET/);
  assert.match(renderSummary(results, WEB), /\| web \| FAIL \|/);
});

test('optionsFromEnv validates the check list and required settings', () => {
  const opts = optionsFromEnv({ SMOKE_CHECKS: 'version', SMOKE_WEB_URL: `${WEB}/`, SMOKE_SHA: SHA, SMOKE_TIMEOUT_SECONDS: '30' });
  assert.deepEqual([opts.webUrl, opts.timeoutMs, opts.supabaseUrl], [WEB, 30_000, '']);
  assert.throws(() => optionsFromEnv({ SMOKE_CHECKS: 'versoin', SMOKE_WEB_URL: WEB }), /unknown SMOKE_CHECKS: versoin/);
  assert.throws(() => optionsFromEnv({ SMOKE_WEB_URL: WEB }), /SUPABASE_URL is required/);
});
