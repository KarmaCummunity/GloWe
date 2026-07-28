#!/usr/bin/env node
// Loads every built page in headless Chromium and fails on any console error,
// page error, or failed request (FR-GLOWE-026 AC1 risk mitigation).
//
// This is the check that makes the core/page bundle split safe to ship. The
// split relies on a claim that is true today but is not enforced by anything in
// the source: no module touches another at load time, they only reach for each
// other inside functions behind `typeof X !== 'undefined'` guards. If someone
// later adds a top-level cross-reference, the concatenation order changes
// meaning and a page throws a ReferenceError. Reading the diff would not catch
// that. Loading all 19 pages does.
//
// Usage: node scripts/smoke.mjs [--root dist] [--keep-going]
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync, readdirSync } from 'node:fs';
import { resolve, dirname, join, relative, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const SITE = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const argOf = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
const ROOT = resolve(SITE, argOf('root', 'dist'));
const KEEP_GOING = argv.includes('--keep-going');

if (!existsSync(ROOT)) {
  console.error(`[smoke] ${ROOT} does not exist — run scripts/build.mjs first`);
  process.exit(1);
}

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.ico': 'image/x-icon',
};

const server = createServer((req, res) => {
  const urlPath = decodeURIComponent(req.url.split('?')[0]);
  const file = resolve(ROOT, `.${urlPath}`);
  // Path traversal guard: a request must not escape the served root.
  if (!file.startsWith(ROOT) || !existsSync(file) || !statSync(file).isFile()) {
    res.writeHead(404).end('not found');
    return;
  }
  res.writeHead(200, { 'Content-Type': MIME[extname(file)] ?? 'application/octet-stream' });
  res.end(readFileSync(file));
});

await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;

function pagesUnder(dir, acc = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    // Skipped so `--root .` can smoke the unbuilt source tree — useful for
    // telling "my build broke this" apart from "this was already broken".
    if (e.name === 'node_modules' || e.name === 'dist' || e.name.startsWith('.')) continue;
    const full = join(dir, e.name);
    if (e.isDirectory()) pagesUnder(full, acc);
    else if (e.name.endsWith('.html')) acc.push(full);
  }
  return acc.sort();
}

const pages = pagesUnder(ROOT);
// GLOWE_CHROMIUM_PATH lets an environment that already ships a browser point at
// it instead of downloading one whose build number happens to match the pinned
// playwright package. CI installs a matching browser and leaves this unset.
const browser = await chromium.launch(
  process.env.GLOWE_CHROMIUM_PATH ? { executablePath: process.env.GLOWE_CHROMIUM_PATH } : {},
);
const failures = [];

for (const file of pages) {
  const rel = relative(ROOT, file);
  const context = await browser.newContext();
  const page = await context.newPage();
  const problems = [];

  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    const text = msg.text();
    // Supabase calls fail here by design: the smoke server has no backend and
    // CI has no credentials. Those are environment noise, not a bundling bug —
    // a ReferenceError from a missing global is what this test exists to catch.
    if (/supabase\.co|Failed to load resource|net::ERR|ERR_/i.test(text)) return;
    problems.push(`console: ${text}`);
  });
  page.on('pageerror', (err) => problems.push(`pageerror: ${err.message}`));
  page.on('requestfailed', (req) => {
    const url = req.url();
    if (!url.startsWith(base)) return;
    // Three pages are redirect shims that call location.replace() from <head>.
    // The navigation cancels every request already in flight, which surfaces
    // here as net::ERR_ABORTED. That is the shim working, not a broken asset.
    const failure = req.failure()?.errorText ?? '';
    if (/ERR_ABORTED/.test(failure)) return;
    problems.push(`request failed: ${url.slice(base.length)} (${failure})`);
  });

  const target = `${base}/${rel}`;
  try {
    // `domcontentloaded`, not `load`: this test asks "did every script parse and
    // execute without throwing", and that is settled by DOMContentLoaded.
    // Waiting for `load` additionally waits on every image and on any
    // runtime-injected third-party request — which is precisely what a
    // network-isolated environment cannot satisfy, so it times out on pages that
    // are perfectly healthy.
    await page.goto(target, { waitUntil: 'domcontentloaded', timeout: 20000 });
    // Deferred scripts run before DOMContentLoaded, and the app's page inits
    // are DOMContentLoaded handlers — give those a beat to throw.
    await page.waitForTimeout(400);
    // Some pages navigate away on purpose: three are redirect shims
    // (opportunities, saved, write-post) and admin.html bounces a non-admin
    // home. Asserting globals after that races the destination's own load and
    // reports a failure for correct behaviour, so only assert when we are still
    // on the page under test.
    const landed = new URL(page.url()).pathname.replace(/^\//, '');
    if (landed === rel) {
      const hasGlobals = await page.evaluate(
        () => typeof window.gloweBackend !== 'undefined' && typeof window.openModal === 'function',
      );
      if (!hasGlobals) problems.push('core globals missing (gloweBackend / openModal)');
    } else {
      console.log(`      (navigated to ${landed} — globals assertion skipped)`);
    }
  } catch (err) {
    problems.push(`navigation: ${err.message}`);
  }

  await context.close();
  if (problems.length) {
    failures.push({ page: rel, problems });
    console.log(`  ✗ ${rel}`);
    for (const p of problems) console.log(`      ${p}`);
    if (!KEEP_GOING) break;
  } else {
    console.log(`  ✓ ${rel}`);
  }
}

await browser.close();
server.close();

if (failures.length) {
  console.error(`\n[smoke] ${failures.length}/${pages.length} pages failed\n`);
  process.exit(1);
}
console.log(`\n[smoke] ${pages.length} pages loaded clean\n`);
