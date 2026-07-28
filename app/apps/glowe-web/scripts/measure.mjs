#!/usr/bin/env node
// GloWe performance measurement + budget gate (FR-GLOWE-026 AC9).
//
// Walks every HTML entry point, resolves what a browser must actually fetch
// before it can paint, and reports raw / gzip / brotli bytes per page. Fails
// with a non-zero exit when a page breaches its budget in scripts/perf-budget.json.
//
// This measures the *shipped* tree it is pointed at, so it works identically on
// the raw sources today and on the built `dist/` once Wave 1 lands.
//
// Usage:
//   node scripts/measure.mjs                 # measure + enforce budgets
//   node scripts/measure.mjs --root dist     # measure a built tree
//   node scripts/measure.mjs --json          # machine-readable, no gate
//   node scripts/measure.mjs --no-gate       # report only, always exit 0
import { readFileSync, existsSync, statSync, readdirSync } from 'node:fs';
import { gzipSync, brotliCompressSync, constants } from 'node:zlib';
import { resolve, dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const SITE_ROOT = resolve(HERE, '..');

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(`--${name}`);
const value = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};

const root = resolve(SITE_ROOT, value('root', '.'));
const asJson = flag('json');
const gate = !flag('no-gate') && !asJson;

// ── size helpers ────────────────────────────────────────────────────────────

const KB = (bytes) => bytes / 1024;

/** Raw / gzip / brotli for one file. Missing files count as zero and are
 *  reported separately — a broken href is a correctness bug, not a perf win.
 *
 *  Memoized by absolute path, and not as a micro-optimization: 19 pages share
 *  the same ~18 blocking files, so an uncached brotli-11 pass re-compresses the
 *  same ~770 KB roughly 19 times and the run takes minutes instead of a second.
 *  Sizes are read once per process, which is also what makes them consistent
 *  across every page in one report. */
const sizeCache = new Map();
function measureFile(absPath) {
  if (sizeCache.has(absPath)) return sizeCache.get(absPath);
  let result = null;
  if (existsSync(absPath) && statSync(absPath).isFile()) {
    const buf = readFileSync(absPath);
    result = {
      raw: buf.length,
      gzip: gzipSync(buf, { level: 9 }).length,
      // Brotli only pays for itself on text; running quality-11 over multi-MB
      // images costs seconds each and tells us nothing, since no CDN
      // re-compresses an already-compressed image format.
      brotli: isCompressibleText(absPath)
        ? brotliCompressSync(buf, {
          params: { [constants.BROTLI_PARAM_QUALITY]: 11 },
        }).length
        : buf.length,
    };
  }
  sizeCache.set(absPath, result);
  return result;
}

const isCompressibleText = (p) => /\.(js|mjs|css|html|json|svg|txt|map)$/i.test(p);

// ── HTML parsing ────────────────────────────────────────────────────────────
// Regex rather than a DOM parser: the input is our own hand-written markup, the
// shapes we care about are unambiguous, and this keeps the gate dependency-free
// so it can never be the reason CI is red.

const TAG_SCRIPT = /<script\b([^>]*)>/gi;
const TAG_LINK = /<link\b([^>]*)>/gi;
const TAG_IMG = /<img\b([^>]*)>/gi;
const CSS_URL = /url\(\s*['"]?([^'")]+)['"]?\s*\)/gi;
// Quoted form stops at the quote, bare form at whitespace/`)`/`;`. Without the
// quoted alternative a Google Fonts URL truncates at the first `;` in its
// `wght@400;600;700` list, which makes the report misleading.
const CSS_IMPORT = /@import\s+(?:url\(\s*)?(?:'([^']+)'|"([^"]+)"|([^'")\s;]+))/gi;

const attr = (tag, name) => {
  const m = tag.match(new RegExp(`${name}\\s*=\\s*["']([^"']*)["']`, 'i'));
  return m ? m[1] : null;
};
const hasAttr = (tag, name) => new RegExp(`\\b${name}\\b`, 'i').test(tag);

/** A stylesheet blocks paint unless it is scoped to a non-screen media type. */
function isBlockingStylesheet(tag) {
  if ((attr(tag, 'rel') || '').toLowerCase() !== 'stylesheet') return false;
  const media = (attr(tag, 'media') || '').toLowerCase();
  return media === '' || media === 'all' || media === 'screen';
}

/** A classic script blocks parsing unless deferred, async, or a module. */
const isBlockingScript = (tag) =>
  !hasAttr(tag, 'defer') && !hasAttr(tag, 'async') &&
  (attr(tag, 'type') || '').toLowerCase() !== 'module';

/** Local, same-origin references only. Third-party URLs are reported as a
 *  separate count: they cost a DNS + TLS handshake we cannot weigh from here,
 *  and each one is itself a finding. */
const isLocal = (href) =>
  Boolean(href) && !/^(https?:)?\/\//i.test(href) &&
  !href.startsWith('data:') && !href.startsWith('#');

/** Matches against `re`, passing the first non-empty capture group to `pick`.
 *  Multiple groups exist so alternations (quoted vs bare @import URLs) work. */
function collect(re, html, pick) {
  const out = [];
  for (const m of html.matchAll(re)) {
    const got = pick(m.slice(1).find(Boolean) || '');
    if (got) out.push(got);
  }
  return out;
}

/** Every image a stylesheet pulls in, resolved relative to the stylesheet. */
function imagesFromCss(cssAbsPath) {
  if (!existsSync(cssAbsPath)) return [];
  const css = readFileSync(cssAbsPath, 'utf8');
  const cssDir = dirname(cssAbsPath);
  return collect(CSS_URL, css, (u) => u).flatMap((u) => {
    const url = u.trim();
    return isLocal(url) ? [resolve(cssDir, url)] : [];
  });
}

/** Cross-origin `@import`s inside a stylesheet.
 *
 *  Worth its own check, and added because scanning only HTML tags missed a real
 *  one: styles.css opened with an @import of Google Fonts. That is strictly
 *  worse than a <link> — an @import cannot start until the importing sheet has
 *  been fetched AND parsed, so it chains a fresh DNS + TLS + fetch behind the
 *  stylesheet instead of running beside it, all in front of the first paint. */
function remoteImportsFromCss(cssAbsPath) {
  if (!existsSync(cssAbsPath)) return [];
  // Comments are stripped first: a comment *documenting* a removed @import (or
  // a commented-out one) is not a request the browser makes, and reporting it
  // would train readers to ignore this warning.
  const css = readFileSync(cssAbsPath, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  return collect(CSS_IMPORT, css, (u) => u).filter((u) => !isLocal(u.trim()));
}

// ── page analysis ───────────────────────────────────────────────────────────

function analyzePage(htmlAbsPath) {
  const html = readFileSync(htmlAbsPath, 'utf8');
  const pageDir = dirname(htmlAbsPath);
  const abs = (href) => resolve(pageDir, href);

  const scripts = collect(TAG_SCRIPT, html, (tag) => {
    const src = attr(tag, 'src');
    if (!src) return null;
    return { src, local: isLocal(src), blocking: isBlockingScript(tag) };
  });
  const styles = collect(TAG_LINK, html, (tag) => {
    const href = attr(tag, 'href');
    if (!href || !isBlockingStylesheet(tag)) return null;
    return { href, local: isLocal(href) };
  });

  const blocking = [
    ...styles.filter((s) => s.local).map((s) => s.href),
    ...scripts.filter((s) => s.local && s.blocking).map((s) => s.src),
  ];

  const totals = { raw: 0, gzip: 0, brotli: 0 };
  const missing = [];
  for (const href of blocking) {
    const size = measureFile(abs(href));
    if (!size) { missing.push(href); continue; }
    totals.raw += size.raw;
    totals.gzip += size.gzip;
    totals.brotli += size.brotli;
  }

  // Page weight counts only what the browser is CERTAIN to fetch: the
  // document, everything render-blocking, and the <img> elements in the markup.
  //
  // CSS url() references are deliberately NOT in this total. A stylesheet
  // naming nine hero photos does not mean a page downloads nine hero photos —
  // the browser fetches only the ones whose selectors actually match. Folding
  // them in made every page look like a uniform ~4.5 MB, which is both wrong
  // and useless for spotting which page regressed. They are reported separately
  // as a pool, because a large pool is still a real risk (one bad selector
  // change turns a latent 2 MB into a fetched 2 MB).
  const htmlSize = measureFile(htmlAbsPath);
  const imgPaths = new Set();
  for (const src of collect(TAG_IMG, html, (tag) => attr(tag, 'src'))) {
    if (isLocal(src)) imgPaths.add(abs(src));
  }
  let imageBytes = 0;
  for (const p of imgPaths) imageBytes += measureFile(p)?.raw ?? 0;

  const cssImagePool = new Set();
  for (const s of styles) {
    if (s.local) imagesFromCss(abs(s.href)).forEach((p) => cssImagePool.add(p));
  }
  let cssImageBytes = 0;
  for (const p of cssImagePool) cssImageBytes += measureFile(p)?.raw ?? 0;

  const thirdParty = [
    ...scripts.filter((s) => !s.local).map((s) => s.src),
    ...styles.filter((s) => !s.local).map((s) => s.href),
    // Chained behind the stylesheet rather than parallel to it — see
    // remoteImportsFromCss. Flagged so this class of regression cannot hide in
    // a CSS file the way it did before.
    ...styles.filter((s) => s.local)
      .flatMap((s) => remoteImportsFromCss(abs(s.href)).map((u) => `@import ${u}`)),
  ];

  return {
    page: relative(root, htmlAbsPath),
    blockingRequests: blocking.length,
    criticalPath: totals,
    html: htmlSize?.raw ?? 0,
    imageBytes,
    imageCount: imgPaths.size,
    cssImageBytes,
    cssImageCount: cssImagePool.size,
    pageWeight: (htmlSize?.raw ?? 0) + totals.raw + imageBytes,
    thirdParty,
    missing,
  };
}

// ── budgets ─────────────────────────────────────────────────────────────────

// --budget lets the test suite point the gate at a deliberately strict file and
// assert that it actually fails; CI always uses the checked-in default.
const budgetConfig = JSON.parse(
  readFileSync(resolve(SITE_ROOT, value('budget', 'scripts/perf-budget.json')), 'utf8'),
);
const budgetFor = (page) => ({
  ...budgetConfig.default,
  ...(budgetConfig.pages?.[page] ?? {}),
});

function checkBudgets(report) {
  const limits = budgetFor(report.page);
  const actual = {
    criticalPathGzipKb: KB(report.criticalPath.gzip),
    pageWeightKb: KB(report.pageWeight),
    blockingRequests: report.blockingRequests,
  };
  const breaches = [];
  for (const [metric, limit] of Object.entries(limits)) {
    if (actual[metric] > limit.budget) {
      breaches.push({ metric, actual: actual[metric], budget: limit.budget });
    }
  }
  return { actual, limits, breaches };
}

// ── run ─────────────────────────────────────────────────────────────────────

function findPages(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    // `dist` is skipped when walking the source tree so a stale local build
    // cannot leak into the numbers; measuring it deliberately is what
    // `--root dist` is for.
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name.startsWith('.')) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...findPages(full));
    else if (entry.name.endsWith('.html')) out.push(full);
  }
  return out.sort();
}

const pages = findPages(root);
if (pages.length === 0) {
  console.error(`[measure] no HTML entry points under ${root}`);
  process.exit(1);
}

const reports = pages.map(analyzePage);
const checks = reports.map((r) => ({ report: r, ...checkBudgets(r) }));

if (asJson) {
  console.log(JSON.stringify({ root: relative(SITE_ROOT, root) || '.', measuredAt: new Date().toISOString(), pages: checks }, null, 2));
  process.exit(0);
}

const pad = (s, n) => String(s).padEnd(n);
const num = (v, n, digits = 1) => String(v.toFixed(digits)).padStart(n);

console.log(`\nGloWe performance report — ${relative(SITE_ROOT, root) || 'source tree'}\n`);
console.log(`${pad('page', 34)}${pad('blocking', 10)}${pad('gzip KB', 10)}${pad('brotli KB', 11)}${pad('weight KB', 11)}`);
console.log('-'.repeat(76));
for (const { report: r } of checks) {
  console.log(
    pad(r.page, 34) +
    pad(r.blockingRequests, 10) +
    num(KB(r.criticalPath.gzip), 8) + '  ' +
    num(KB(r.criticalPath.brotli), 9) + '  ' +
    num(KB(r.pageWeight), 9) + '  ',
  );
}

const worst = checks.reduce((a, b) =>
  b.actual.criticalPathGzipKb > a.actual.criticalPathGzipKb ? b : a);
const limits = worst.limits;
const cssPool = checks.reduce((max, c) => Math.max(max, c.report.cssImageBytes), 0);
if (cssPool > 0) {
  console.log(`\nCSS-reachable image pool: ${KB(cssPool).toFixed(1)} KB across ${worst.report.cssImageCount} files`);
  console.log('  (not counted in page weight — fetched only when a selector matches,');
  console.log('   but a large pool is one selector change away from becoming real)');
}

console.log(`\nworst page: ${worst.report.page}`);
console.log(`  critical path  ${num(worst.actual.criticalPathGzipKb, 7)} KB gzip   (budget ${limits.criticalPathGzipKb.budget}, target ${limits.criticalPathGzipKb.target})`);
console.log(`  page weight    ${num(worst.actual.pageWeightKb, 7)} KB        (budget ${limits.pageWeightKb.budget}, target ${limits.pageWeightKb.target})`);
console.log(`  blocking reqs  ${String(worst.actual.blockingRequests).padStart(7)}           (budget ${limits.blockingRequests.budget}, target ${limits.blockingRequests.target})`);

const thirdParty = new Set(checks.flatMap((c) => c.report.thirdParty));
if (thirdParty.size) {
  console.log(`\nthird-party render-path origins (${thirdParty.size}) — each costs a DNS + TLS handshake:`);
  for (const t of thirdParty) console.log(`  ${t}`);
}

const missing = checks.filter((c) => c.report.missing.length);
if (missing.length) {
  console.log('\nbroken references (counted as 0 bytes — fix these, they are not savings):');
  for (const c of missing) console.log(`  ${c.report.page}: ${c.report.missing.join(', ')}`);
}

const breaches = checks.filter((c) => c.breaches.length);
if (breaches.length && gate) {
  console.error('\nBUDGET BREACH — see scripts/perf-budget.json (FR-GLOWE-026 AC9):');
  for (const c of breaches) {
    for (const b of c.breaches) {
      console.error(`  ${c.report.page}: ${b.metric} = ${typeof b.actual === 'number' ? b.actual.toFixed(1) : b.actual} > ${b.budget}`);
    }
  }
  console.error('\nBudgets ratchet down, never up. If this PR legitimately needs more,');
  console.error('raise the budget in its own PR with a stated reason.\n');
  process.exit(1);
}

console.log(breaches.length ? '\nbudgets breached (gate disabled)\n' : '\nall budgets OK\n');
