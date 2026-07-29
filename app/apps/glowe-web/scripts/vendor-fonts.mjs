#!/usr/bin/env node
// Vendor GloWe's web fonts locally (FR-GLOWE-026 AC3, decision D-182).
//
// Google Fonts costs two extra origins (fonts.googleapis.com for the CSS, then
// fonts.gstatic.com for the files) on the render path, and the CSS request
// blocks first paint on a domain we do not control. Self-hosting removes both
// handshakes and lets the faces share the app's own immutable cache headers.
//
// Worse than a <link>, four of these arrived as a single `@import` near the top
// of styles.css. An @import serialises: the browser must fetch and parse
// styles.css, discover the import, then open a NEW connection to
// fonts.googleapis.com, then a third to fonts.gstatic.com for the files —
// a three-hop chain in front of the first line of text.
//
// Subsets are chosen per family to cover the five interface languages in
// GLOWE_LANGUAGES (FR-TRANSLATE-003) and nothing more:
//   en → Nunito latin        he → Assistant / Heebo hebrew
//   ru → Nunito cyrillic     ar → Noto Sans Arabic
//   am → Noto Sans Ethiopic
// Nunito's cyrillic subset is REQUIRED, not optional: styles.css relies on it
// for Russian ("Cyrillic is covered by Nunito"), so dropping it would render
// Russian in a fallback face. Ethiopic likewise — it is absent from most system
// font stacks, so without it Amharic shows tofu boxes.
// latin-ext is kept on the Latin faces because names on a global platform
// routinely carry accented characters. vietnamese/greek are dropped: no
// interface language needs them.
//
// `unicode-range` on every face means a browser downloads only the subsets it
// actually renders — a Hebrew reader never fetches the Ethiopic file.
//
// Run this only when a family or its weights change; the output is committed so
// builds and CI stay offline. Usage: node scripts/vendor-fonts.mjs
import { writeFileSync, readFileSync, mkdirSync, rmSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const SITE = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const FONT_DIR = resolve(SITE, 'fonts');
const STYLES = resolve(SITE, 'css', 'styles.css');

// The @font-face block is written INTO styles.css between these markers rather
// than into a stylesheet of its own. A separate file would mean a third
// render-blocking <link> on every page; @font-face rules are a few KB of text
// and belong with the stylesheet that uses them. Markers make the block
// regenerable without touching hand-written CSS.
const BEGIN = '/* === BEGIN generated @font-face (scripts/vendor-fonts.mjs) === */';
const END = '/* === END generated @font-face === */';

// Weights mirror the two upstream requests being replaced: the styles.css
// @import (Assistant/Heebo/Noto Arabic/Noto Ethiopic) and the Nunito <link>.
const FAMILIES = [
  { family: 'Assistant', weights: [400, 600, 700], subsets: ['hebrew', 'latin', 'latin-ext'] },
  { family: 'Heebo', weights: [400, 500, 700], subsets: ['hebrew', 'latin'] },
  { family: 'Noto Sans Arabic', weights: [400, 600, 700], subsets: ['arabic'] },
  { family: 'Noto Sans Ethiopic', weights: [400, 600, 700], subsets: ['ethiopic'] },
  { family: 'Nunito', weights: [400, 600, 700], subsets: ['latin', 'latin-ext', 'cyrillic', 'cyrillic-ext'] },
];

// Modern-browser UA, so Google serves woff2 rather than legacy formats.
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

rmSync(FONT_DIR, { recursive: true, force: true });
mkdirSync(FONT_DIR, { recursive: true });

const out = [
  '/* Self-hosted web fonts, vendored by scripts/vendor-fonts.mjs — do not edit by hand.',
  ' * Replaces a render-blocking Google Fonts @import (styles.css line 1) and',
  ' * <link> tag, removing both Google origins from the critical path.',
  ' * Licence: SIL Open Font License 1.1 for all five families.',
  ' */',
];
let kept = 0;

for (const { family, weights, subsets } of FAMILIES) {
  const cssUrl = 'https://fonts.googleapis.com/css2?family='
    + `${family.replace(/ /g, '+')}:wght@${weights.join(';')}&display=swap`;
  const res = await fetch(cssUrl, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`Google Fonts CSS for ${family}: ${res.status}`);
  const css = await res.text();

  // Google emits `/* subset */` immediately before each @font-face it labels.
  const blocks = [...css.matchAll(/\/\*\s*([a-z-]+)\s*\*\/\s*(@font-face\s*\{[^}]*\})/g)];
  if (blocks.length === 0) {
    throw new Error(`no labelled @font-face blocks for ${family} — upstream format changed`);
  }

  const wanted = new Set(subsets);
  const slug = family.toLowerCase().replace(/\s+/g, '-');
  out.push(`\n/* ── ${family} — ${subsets.join(', ')} ── */`);

  for (const [, subset, face] of blocks) {
    if (!wanted.has(subset)) continue;
    const weight = face.match(/font-weight:\s*(\d+)/)?.[1];
    const remote = face.match(/url\(([^)]+)\)/)?.[1];
    if (!weight || !remote) throw new Error(`unparseable @font-face: ${family}/${subset}`);

    const name = `${slug}-${subset}-${weight}.woff2`;
    const bin = await fetch(remote, { headers: { 'User-Agent': UA } });
    if (!bin.ok) throw new Error(`font ${name}: ${bin.status}`);
    writeFileSync(resolve(FONT_DIR, name), Buffer.from(await bin.arrayBuffer()));

    out.push(face.replace(remote, `../fonts/${name}`).replace(/^\s*@font-face/, '\n@font-face'));
    kept += 1;
    console.log(`  ${name}`);
  }
}

const block = [BEGIN, out.join('\n'), END, ''].join('\n');
const styles = readFileSync(STYLES, 'utf8');
const start = styles.indexOf(BEGIN);
const finish = styles.indexOf(END);
const next = start >= 0 && finish > start
  ? styles.slice(0, start) + block + styles.slice(finish + END.length + 1)
  : block + '\n' + styles;
writeFileSync(STYLES, next, 'utf8');
console.log(`\n[vendor-fonts] ${kept} faces → ${STYLES}`);
