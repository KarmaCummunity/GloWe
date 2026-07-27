#!/usr/bin/env node
// GloWe live-DOM i18n leak scanner (FR-GLOWE-005, closes the manual-audit
// gap noted in TECH_DEBT TD-142/TD-175: those sweeps walked every page by
// hand, in Hebrew, looking for leftover English text. This script automates
// the *narrowing* step — it flags candidate leaks for human review, it does
// not replace judgment on tone/register (see TD-187).
//
// What it catches:
//   1. Text nodes / translated attributes (placeholder, title, aria-label,
//      alt) containing Latin-script words, outside data-no-i18n /
//      data-tr-field / data-tr-card (UGC has its own translation path).
//   2. English month names in non-English locales — the toLocaleDateString()
//      missing-locale bug fixed repeatedly in TD-142.
//
// It is a heuristic, not a gate: GloWe brand terms, proper nouns and
// intentionally-English seed content (data.js demo rows, per FR-GLOWE-005
// "Out of scope") will show up and must be judged by a human, same as the
// manual sweeps did.
//
// Usage (from tests/e2e/):
//   node scripts/glowe-i18n-scan.mjs [--locales he,ru,ar,am] [--persona yossi]
//     [--pages about.html,community.html] [--out report.json] [--base <url>]
//
// Env: DEV_WEB_URL or GLOWE_WEB_URL (same as the E2E suite) to point at a
// deployed site instead of a local static server.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const AUTH_DIR = path.resolve(here, '../.auth');

const devWebUrl = (process.env.DEV_WEB_URL ?? '').replace(/\/$/, '');
const DEFAULT_BASE = (process.env.GLOWE_WEB_URL ?? (devWebUrl ? `${devWebUrl}/glowe` : 'http://127.0.0.1:4321')).replace(/\/$/, '');

const PUBLIC_PAGES = [
  'index.html',
  'pages/about.html',
  'pages/community.html',
  'pages/connections.html',
  'pages/discussion-group.html',
  'pages/forums.html',
  'pages/opportunities.html',
  'pages/opportunity.html',
  'pages/organizations.html',
  'pages/terms.html',
  'pages/volunteer-network.html',
  'pages/whats-next.html',
  'pages/wishing-well.html',
];

// persona name -> extra pages that need a signed-in session to render real content
const AUTHED_PAGES = {
  yossi: ['pages/messages.html', 'pages/profile.html', 'pages/saved.html', 'pages/my-applications.html', 'pages/settings.html', 'pages/write-post.html'],
  admin: ['pages/admin.html'],
};

function parseArgs(argv) {
  const opts = { locales: ['he'], pages: null, personas: [], out: null, base: DEFAULT_BASE };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--locales') opts.locales = argv[++i].split(',').map((s) => s.trim()).filter(Boolean);
    else if (a === '--pages') opts.pages = argv[++i].split(',').map((s) => s.trim()).filter(Boolean);
    else if (a === '--persona') opts.personas.push(argv[++i]);
    else if (a === '--out') opts.out = argv[++i];
    else if (a === '--base') opts.base = argv[++i].replace(/\/$/, '');
  }
  return opts;
}

function loadStorageState(persona) {
  const file = path.join(AUTH_DIR, `glowe-${persona}.json`);
  if (!fs.existsSync(file)) {
    console.warn(`[i18n-scan] no auth state for persona "${persona}" (${file}) — run the glowe-setup Playwright project first. Skipping its pages.`);
    return null;
  }
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

const MONTHS = 'January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec';

// Target-script Unicode ranges. A node containing any of these characters is
// NOT a leak candidate even if it also contains Latin substrings — GloWe
// legitimately mixes the brand name / proper nouns into translated sentences
// (e.g. "GloWe בנויה לתמיכה הדדית..."). A genuine leak (TD-142's definition)
// is a node with NO target-script character at all — the whole label never
// got translated.
const TARGET_SCRIPT = { he: /[֐-׿]/, ar: /[؀-ۿ]/, ru: /[Ѐ-ӿ]/, am: /[ሀ-፿]/ };

// Runs inside the page. Kept as a plain function string via page.evaluate
// (no closures over Node-side constants besides what's passed in).
function scanPage({ months, script }) {
  const results = [];
  const skipTags = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE']);
  // Standalone tokens that are intentionally English even in a fully leaked
  // node (brand/proper nouns, units, acronyms) — judged not worth flagging.
  const allow = /^[\s\d.,:;/#@()%$&'"+-]*(GloWe|Google|GitHub|MVP|SDGs?|OK|ID|URL|API|PDF|N\/A|RTL|LTR|CSR|ESG|Topaz)[\s\d.,:;/#@()%$&'"+-]*$/i;
  const isUrlOrEmail = /^(https?:\/\/|www\.|[\w.+-]+@[\w-]+\.[\w.-]+$)/i;
  const latinWord = /[A-Za-z]{3,}/;
  const targetScript = new RegExp(script);
  const monthNames = new RegExp(`\\b(${months})\\b`);
  const isExempt = (el) => !!(el && el.closest('[data-no-i18n],[data-tr-field],[data-tr-card]'));

  const selectorFor = (el) => {
    const parts = [];
    let node = el;
    for (let depth = 0; node && depth < 3; depth += 1, node = node.parentElement) {
      let s = node.tagName ? node.tagName.toLowerCase() : '';
      if (node.id) s += `#${node.id}`;
      else if (typeof node.className === 'string' && node.className.trim()) {
        s += `.${node.className.trim().split(/\s+/).slice(0, 2).join('.')}`;
      }
      parts.unshift(s);
    }
    return parts.join(' > ');
  };

  const record = (el, text) => {
    const trimmed = text.trim();
    if (!trimmed || !latinWord.test(trimmed)) return;
    if (targetScript.test(trimmed)) return; // mixed node with a proper noun — not a leak
    if (allow.test(trimmed) || isUrlOrEmail.test(trimmed)) return;
    results.push({ selector: selectorFor(el), text: trimmed.slice(0, 140), dateSuspect: monthNames.test(trimmed) });
  };

  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
  let node = walker.nextNode();
  while (node) {
    const parent = node.parentElement;
    if (parent && !skipTags.has(parent.tagName) && !isExempt(parent)) {
      record(parent, node.textContent);
    }
    node = walker.nextNode();
  }

  for (const el of document.querySelectorAll('[placeholder],[title],[aria-label],[alt]')) {
    if (isExempt(el)) continue;
    for (const attr of ['placeholder', 'title', 'aria-label', 'alt']) {
      const value = el.getAttribute(attr);
      if (value) record(el, value);
    }
  }

  return results;
}

async function scanOne(browser, base, locale, page404, storageState) {
  const context = await browser.newContext(storageState ? { storageState } : undefined);
  await context.addInitScript((lang) => {
    try { window.localStorage.setItem('gloweLang', lang); } catch { /* ignore */ }
  }, locale);
  const page = await context.newPage();
  const url = page404 === 'index.html' ? `${base}/index.html` : `${base}/${page404}`;
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForFunction(
      () => !document.documentElement.classList.contains('glowe-i18n-pending'),
      { timeout: 8_000 },
    ).catch(() => {});
    await page.waitForTimeout(300); // MutationObserver settle for async-rendered lists
    const scriptPattern = (TARGET_SCRIPT[locale] ?? /$^/).source;
    return await page.evaluate(scanPage, { months: MONTHS, script: scriptPattern });
  } catch (err) {
    console.warn(`[i18n-scan] ${locale} ${page404} — navigation/scan failed: ${err.message}`);
    return [];
  } finally {
    await context.close();
  }
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  let pages = opts.pages ?? [...PUBLIC_PAGES];
  const stateByPersona = {};
  for (const persona of opts.personas) {
    const state = loadStorageState(persona);
    if (state) {
      stateByPersona[persona] = state;
      if (!opts.pages) pages = pages.concat(AUTHED_PAGES[persona] ?? []);
    }
  }

  const browser = await chromium.launch();
  const report = [];
  for (const locale of opts.locales) {
    if (locale === 'en') continue; // English is the dictionary baseline, nothing to leak against
    for (const pagePath of pages) {
      const persona = Object.keys(AUTHED_PAGES).find((p) => AUTHED_PAGES[p].includes(pagePath));
      const storageState = persona ? stateByPersona[persona] : undefined;
      if (persona && !storageState) continue; // already warned in loadStorageState
      const findings = await scanOne(browser, opts.base, locale, pagePath, storageState);
      if (findings.length) report.push({ locale, page: pagePath, findings });
    }
  }
  await browser.close();

  const totalFindings = report.reduce((n, r) => n + r.findings.length, 0);
  const dateBugs = report.reduce((n, r) => n + r.findings.filter((f) => f.dateSuspect).length, 0);
  console.log(`\n[i18n-scan] ${totalFindings} candidate leak(s) across ${report.length} page/locale combo(s), ${dateBugs} look like un-localized dates.\n`);
  for (const { locale, page: p, findings } of report) {
    console.log(`--- ${locale} :: ${p} (${findings.length}) ---`);
    for (const f of findings.slice(0, 20)) {
      console.log(`  ${f.dateSuspect ? '[date] ' : ''}${f.selector} → "${f.text}"`);
    }
    if (findings.length > 20) console.log(`  … +${findings.length - 20} more`);
  }

  if (opts.out) {
    fs.writeFileSync(opts.out, JSON.stringify(report, null, 2));
    console.log(`\n[i18n-scan] full report written to ${opts.out}`);
  }

  process.exit(totalFindings > 0 ? 1 : 0);
}

main();
