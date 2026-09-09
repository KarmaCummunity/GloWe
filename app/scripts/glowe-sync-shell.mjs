#!/usr/bin/env node
/**
 * GloWe shell sync (FR-GLOWE-029 AC4 / D-190).
 *
 * The header, footer, shared <head> assets and the base script list live ONCE
 * in `app/apps/glowe-web/partials/*.html`. This script stamps them into every
 * page between marker comments so the 22 static pages can never drift again.
 *
 *   node scripts/glowe-sync-shell.mjs          # rewrite pages in place
 *   node scripts/glowe-sync-shell.mjs --check  # exit 1 if any page is stale
 *
 * Markers (one pair per block):  <!-- glowe:<block>:start --> … <!-- glowe:<block>:end -->
 * A page opts out of a block by simply not carrying its markers.
 */
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const BLOCKS = ['head', 'header', 'footer', 'scripts-core', 'scripts-app'];

/** Top-nav tab that should be lit for a given page slug (mirrors app.js normalizeMainNavigation). */
const NAV_ACTIVE = {
  index: 'index',
  'wishing-well': 'wishing-well',
  'volunteer-network': 'wishing-well',
  opportunities: 'wishing-well',
  opportunity: 'wishing-well',
  organizations: 'organizations',
  community: 'community',
  forums: 'community',
  'discussion-group': 'community',
  about: 'about',
  'whats-next': 'about',
};

export function activeNavFor(pageSlug) {
  return NAV_ACTIVE[pageSlug] || null;
}

/**
 * Photo behind the page's hero band, keyed by the body class that selects it
 * in css/layout-page-header.css (default lives in tokens.css). Mirrored here so
 * the LCP image can be preloaded from <head> instead of being discovered only
 * after the stylesheet parses. Phones (< 768px) take the `<name>-m.webp` cut.
 */
const HERO_PHOTO_BY_BODY_CLASS = {
  'home-page-body': 'glowe-bridge',
  'organizations-page-body': 'glowe-bridge',
  'opportunities-page-body': 'glowe-field',
  'wishing-page-body': 'glowe-field',
  'about-page-body': 'glowe-blossoms',
};
const HERO_PHOTO_DEFAULT = 'glowe-regrowth';
const HERO_PHONE_MEDIA = '(max-width: 767px)';
const HERO_DESKTOP_MEDIA = '(min-width: 768px)';

/** Hero photo for a page, or null when its static markup has no photo band above the fold. */
export function heroPhotoFor(html) {
  if (!/class="(?:page-header|hero)[\s"]/.test(html)) return null;
  const body = /<body[^>]*class="([^"]*)"/.exec(html);
  const classes = body ? body[1].split(/\s+/) : [];
  const hit = classes.find((c) => HERO_PHOTO_BY_BODY_CLASS[c]);
  return hit ? HERO_PHOTO_BY_BODY_CLASS[hit] : HERO_PHOTO_DEFAULT;
}

export function pageContext(relPath, html = '') {
  const slug = basename(relPath, '.html');
  const inPages = relPath.replace(/\\/g, '/').startsWith('pages/');
  return {
    slug,
    root: inPages ? '../' : '',
    pages: inPages ? '' : 'pages/',
    home: inPages ? '../index.html' : 'index.html',
    heroPhoto: heroPhotoFor(html),
  };
}

/** Fill {{root}} / {{pages}} / {{home}} / {{active:<slug>}} / {{hero-preload}} placeholders. */
export function renderPartial(template, ctx) {
  const active = activeNavFor(ctx.slug);
  const preloadLink = (file, media) =>
    `\n$1<link rel="preload" as="image" href="${ctx.root}assets/${file}" media="${media}" fetchpriority="high">`;
  const heroPreload = ctx.heroPhoto
    ? preloadLink(`${ctx.heroPhoto}-m.webp`, HERO_PHONE_MEDIA)
      + preloadLink(`${ctx.heroPhoto}.webp`, HERO_DESKTOP_MEDIA)
    : '';
  return template
    .replace(/\n([ \t]*)\{\{hero-preload\}\}/g, heroPreload)
    .replace(/\{\{active:([a-z0-9-]+)\}\}/g, (_, slug) =>
      slug === active ? ' active" aria-current="page' : '',
    )
    .replace(/\{\{root\}\}/g, ctx.root)
    .replace(/\{\{pages\}\}/g, ctx.pages)
    .replace(/\{\{home\}\}/g, ctx.home)
    .replace(/\s+$/, '');
}

function markerRe(block) {
  return new RegExp(
    `([ \\t]*)<!-- glowe:${block}:start -->[\\s\\S]*?<!-- glowe:${block}:end -->`,
    'g',
  );
}

/**
 * Replace every marked block in `html` with its rendered partial.
 * @returns {{ html: string, stamped: string[] }}
 */
export function stampPage(html, relPath, partials) {
  const ctx = pageContext(relPath, html);
  const stamped = [];
  let out = html;
  for (const block of BLOCKS) {
    const re = markerRe(block);
    if (!re.test(out)) continue;
    re.lastIndex = 0;
    const body = renderPartial(partials[block], ctx);
    out = out.replace(re, (_m, indent) =>
      `${indent}<!-- glowe:${block}:start -->\n${body}\n${indent}<!-- glowe:${block}:end -->`,
    );
    stamped.push(block);
  }
  return { html: out, stamped };
}

export function loadPartials(partialsDir) {
  const partials = {};
  for (const block of BLOCKS) {
    const file = join(partialsDir, `${block}.html`);
    if (!existsSync(file)) throw new Error(`[glowe-sync-shell] missing partial ${file}`);
    partials[block] = readFileSync(file, 'utf8');
  }
  return partials;
}

export function listPages(siteDir) {
  const out = ['index.html'];
  const pagesDir = join(siteDir, 'pages');
  if (existsSync(pagesDir)) {
    for (const name of readdirSync(pagesDir).sort()) {
      if (name.endsWith('.html')) out.push(`pages/${name}`);
    }
  }
  return out.filter((rel) => existsSync(join(siteDir, rel)));
}

/**
 * @param {string} siteDir absolute path to app/apps/glowe-web
 * @param {{ check?: boolean }} opts
 * @returns {{ changed: string[], unmarked: string[] }}
 */
export function syncShell(siteDir, opts = {}) {
  const partials = loadPartials(join(siteDir, 'partials'));
  const changed = [];
  const unmarked = [];
  for (const rel of listPages(siteDir)) {
    const abs = join(siteDir, rel);
    const before = readFileSync(abs, 'utf8');
    const { html, stamped } = stampPage(before, rel, partials);
    if (stamped.length === 0) unmarked.push(rel);
    if (html !== before) {
      changed.push(rel);
      if (!opts.check) writeFileSync(abs, html, 'utf8');
    }
  }
  return { changed, unmarked };
}

const isMain =
  process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));

if (isMain) {
  const check = process.argv.includes('--check');
  const here = dirname(fileURLToPath(import.meta.url));
  const siteDir = resolve(here, '..', 'apps', 'glowe-web');
  const { changed, unmarked } = syncShell(siteDir, { check });
  for (const rel of unmarked) {
    console.error(`[glowe-sync-shell] ${rel} carries no shell markers`);
  }
  if (check) {
    if (changed.length || unmarked.length) {
      for (const rel of changed) console.error(`[glowe-sync-shell] stale shell: ${rel}`);
      console.error('[glowe-sync-shell] run `node scripts/glowe-sync-shell.mjs` and commit.');
      process.exit(1);
    }
    console.log('[glowe-sync-shell] all pages in sync');
  } else {
    console.log(`[glowe-sync-shell] stamped ${changed.length} page(s)`);
  }
}
