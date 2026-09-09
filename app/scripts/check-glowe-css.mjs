#!/usr/bin/env node
/**
 * GloWe CSS design-system guard (FR-GLOWE-029 / D-190).
 *
 * Enforced on every file under app/apps/glowe-web/css/ (legacy.css: rules 3 + ratchet only):
 *   1. raw colors (#hex / rgb() / hsl()) live ONLY in tokens.css
 *   2. `!important` only in base.css / utilities.css
 *   3. media queries use the canonical breakpoint set only
 *   4. no render-blocking remote @import (fonts go through <link> in the head partial)
 *   5. ≤ 300 lines per file
 *   6. nested folders (css/components/**) carry no relative url() and consume no
 *      url() token (--*-photo / --asset-*): Chromium resolves url() inside var()
 *      against the sheet that USES it, and the bundle lands at css/glowe.<hash>.css
 * legacy.css is a ratchet: it may only shrink (LEGACY_LINE_BUDGET).
 * HTML pages may link only css/glowe.css.
 *
 *   node scripts/check-glowe-css.mjs
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Shrink this number whenever legacy.css loses lines. It must never grow (TD-192). */
export const LEGACY_LINE_BUDGET = 805;
export const MAX_FILE_LINES = 300;

export const BREAKPOINTS = {
  max: [479, 639, 767, 1023, 1279],
  min: [480, 640, 768, 1024, 1280],
};

const TOKENS_FILE = 'tokens.css';
const LEGACY_FILE = 'legacy.css';
const IMPORTANT_ALLOWED = new Set(['base.css', 'utilities.css']);

const COLOR_RE = /#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})\b|\b(?:rgba?|hsla?)\(/gi;
const MEDIA_RE = /@media[^{]*\{/g;
const WIDTH_RE = /\((min|max)-width:\s*([0-9.]+)(px|rem|em)\)/g;
const REMOTE_IMPORT_RE = /@import\s+(?:url\()?['"]?https?:/;
const RELATIVE_URL_RE = /url\(\s*["']?(?!data[:)]|https?:|\/)[^)]*\)/gi;
const URL_TOKEN_RE = /var\(\s*(--[a-z0-9-]*(?:photo|asset)[a-z0-9-]*)\s*\)/gi;

function stripComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
}

function stripDataUrls(css) {
  return css.replace(/url\(\s*["']?data:[^)]*\)/gi, 'url(data)');
}

function lineOf(text, index) {
  return text.slice(0, index).split('\n').length;
}

/**
 * Lint one stylesheet. Pure; returns human-readable violations.
 * @param {string} source
 * @param {string} fileName basename, e.g. "buttons.css"
 * @returns {string[]}
 */
export function lintCssSource(source, fileName) {
  const out = [];
  const name = basename(fileName);
  const lines = source.split('\n').length;

  const isLegacy = name === LEGACY_FILE;
  const css = stripDataUrls(stripComments(source));

  // legacy.css: ratchet only (raw colors / !important / size are Phase 5 work),
  // but its breakpoints were normalized in Phase 4 and must stay canonical.
  if (isLegacy && lines > LEGACY_LINE_BUDGET) {
    out.push(`${fileName}: legacy.css grew to ${lines} lines (budget ${LEGACY_LINE_BUDGET}) — migrate rules into layers instead`);
  }

  if (!isLegacy && lines > MAX_FILE_LINES) {
    out.push(`${fileName}: ${lines} lines exceeds ${MAX_FILE_LINES} — split the file`);
  }

  if (!isLegacy && name !== TOKENS_FILE) {
    for (const m of css.matchAll(COLOR_RE)) {
      out.push(`${fileName}:${lineOf(css, m.index)}: raw color "${m[0]}" — use a token from tokens.css`);
    }
  }

  if (!isLegacy && !IMPORTANT_ALLOWED.has(name)) {
    let idx = css.indexOf('!important');
    while (idx !== -1) {
      out.push(`${fileName}:${lineOf(css, idx)}: !important is not allowed here (layer order replaces it)`);
      idx = css.indexOf('!important', idx + 1);
    }
  }

  for (const media of css.matchAll(MEDIA_RE)) {
    for (const w of media[0].matchAll(WIDTH_RE)) {
      const kind = w[1];
      const px = w[3] === 'px' ? Number(w[2]) : Number(w[2]) * 16;
      if (!BREAKPOINTS[kind].includes(px)) {
        out.push(`${fileName}:${lineOf(css, media.index)}: off-scale breakpoint "${w[0]}" — allowed ${kind}-width: ${BREAKPOINTS[kind].join('/')}px`);
      }
    }
  }

  if (REMOTE_IMPORT_RE.test(css)) {
    out.push(`${fileName}: remote @import is render-blocking — load fonts via the head partial`);
  }

  if (isNestedSheet(fileName)) out.push(...lintNestedAssetUsage(source, fileName));

  return out;
}

/** True for css/<folder>/x.css (anything below the css/ root). */
function isNestedSheet(fileName) {
  const parts = fileName.replace(/\\/g, '/').split('/');
  const cssIdx = parts.indexOf('css');
  return cssIdx !== -1 && parts.length - cssIdx > 2;
}

/** Nested sheets may not reference assets by relative url(), directly or via url() tokens. */
export function lintNestedAssetUsage(source, fileName) {
  const out = [];
  const css = stripDataUrls(stripComments(source));
  for (const m of css.matchAll(RELATIVE_URL_RE)) {
    out.push(`${fileName}:${lineOf(css, m.index)}: relative url() in a nested sheet breaks once bundled — move the rule to a css/-level file`);
  }
  for (const m of css.matchAll(URL_TOKEN_RE)) {
    out.push(`${fileName}:${lineOf(css, m.index)}: url() token ${m[1]} consumed from a nested sheet resolves against this folder — move the rule to a css/-level file`);
  }
  return out;
}

/** HTML pages must reference exactly one stylesheet: css/glowe.css. */
export function lintHtmlSource(source, fileName) {
  const out = [];
  for (const m of source.matchAll(/<link[^>]+rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g)) {
    const href = m[1];
    if (/^https?:/.test(href)) continue;
    if (!/(^|\/)css\/glowe\.css$/.test(href)) {
      out.push(`${fileName}: stylesheet "${href}" — pages link only css/glowe.css`);
    }
  }
  return out;
}

function walk(dir, ext, out = []) {
  for (const name of readdirSync(dir)) {
    const abs = join(dir, name);
    if (statSync(abs).isDirectory()) {
      if (name !== 'node_modules' && name !== 'partials') walk(abs, ext, out);
    } else if (name.endsWith(ext)) {
      out.push(abs);
    }
  }
  return out;
}

export function checkGloweSite(siteDir) {
  const violations = [];
  const cssDir = join(siteDir, 'css');
  if (!existsSync(join(cssDir, TOKENS_FILE))) violations.push('css/tokens.css is missing');
  for (const abs of walk(cssDir, '.css')) {
    const rel = relative(siteDir, abs).split('\\').join('/');
    violations.push(...lintCssSource(readFileSync(abs, 'utf8'), rel));
  }
  for (const abs of walk(siteDir, '.html')) {
    const rel = relative(siteDir, abs).split('\\').join('/');
    violations.push(...lintHtmlSource(readFileSync(abs, 'utf8'), rel));
  }
  return violations;
}

const isMain =
  process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));

if (isMain) {
  const here = dirname(fileURLToPath(import.meta.url));
  const siteDir = resolve(here, '..', 'apps', 'glowe-web');
  const violations = checkGloweSite(siteDir);
  if (violations.length) {
    for (const v of violations) console.error(`[check-glowe-css] ${v}`);
    console.error(`[check-glowe-css] ${violations.length} violation(s)`);
    process.exit(1);
  }
  console.log('[check-glowe-css] OK — tokens-only colors, canonical breakpoints, legacy budget respected');
}
