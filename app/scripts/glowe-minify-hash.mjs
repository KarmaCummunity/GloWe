#!/usr/bin/env node
/**
 * GloWe Wave 2.2 — minify + content-hash JS/CSS in a copied deploy tree.
 *
 * Source `app/apps/glowe-web` stays unhashed for local `serve` on :4321.
 * Only the postbuild output under `dist/glowe/` is rewritten.
 *
 * Usage (from web-postbuild): `await minifyAndHashGloweAssets(gloweDestDir)`
 * Standalone: `node scripts/glowe-minify-hash.mjs <gloweDestDir>`
 */
import { createHash } from 'node:crypto';
import {
  existsSync,
  readdirSync,
  readFileSync,
  rmdirSync,
  unlinkSync,
  writeFileSync,
  statSync,
} from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SKIP_DIR_NAMES = new Set(['__tests__', 'node_modules']);
const ASSET_EXTS = new Set(['.js', '.css']);

function toPosix(p) {
  return p.split('\\').join('/');
}

function listAssetFiles(rootDir) {
  const out = [];
  function walk(dir) {
    for (const name of readdirSync(dir)) {
      if (SKIP_DIR_NAMES.has(name)) continue;
      const abs = join(dir, name);
      const st = statSync(abs);
      if (st.isDirectory()) {
        walk(abs);
        continue;
      }
      if (!ASSET_EXTS.has(extname(name))) continue;
      out.push(abs);
    }
  }
  walk(rootDir);
  return out;
}

function injectContentHash(relPosix, hash) {
  const ext = extname(relPosix);
  const stem = relPosix.slice(0, -ext.length);
  return `${stem}.${hash}${ext}`;
}

function applyRenames(content, renameMap) {
  let out = content;
  const entries = [...renameMap.entries()].sort((a, b) => b[0].length - a[0].length);
  for (const [from, to] of entries) {
    if (from === to) continue;
    out = out.split(`../${from}`).join(`../${to}`);
    out = out.split(from).join(to);
  }
  return out;
}

function mapsEqual(a, b) {
  if (a.size !== b.size) return false;
  for (const [k, v] of a) {
    if (b.get(k) !== v) return false;
  }
  return true;
}

function resolveEsbuild(gloweSrcHint) {
  const requireFrom = createRequire(import.meta.url);
  const candidates = [];
  if (gloweSrcHint) {
    candidates.push(createRequire(join(gloweSrcHint, 'package.json')));
  }
  candidates.push(requireFrom);
  for (const req of candidates) {
    try {
      return req('esbuild');
    } catch {
      /* try next */
    }
  }
  throw new Error(
    '[glowe-minify-hash] esbuild not found — add it as a dep of @kc/glowe-web (or app/)',
  );
}

const CSS_LOCAL_IMPORT_RE = /@import\s+(?:url\()?['"]?([^'")\s]+\.css)['"]?\)?[^;]*;/g;

/** Every local .css file pulled in via `@import` by another .css file (D-190 layered entry). */
function collectCssPartials(absFiles) {
  const partials = new Set();
  for (const abs of absFiles) {
    if (extname(abs) !== '.css') continue;
    const source = readFileSync(abs, 'utf8');
    for (const match of source.matchAll(CSS_LOCAL_IMPORT_RE)) {
      const spec = match[1];
      if (/^(https?:)?\/\//.test(spec)) continue;
      partials.add(resolve(dirname(abs), spec));
    }
  }
  return partials;
}

/** Bundle a CSS entry (inlining local @imports, keeping asset URLs as written) and minify. */
async function bundleCss(esbuild, entryAbs) {
  const result = await esbuild.build({
    entryPoints: [entryAbs],
    bundle: true,
    minify: true,
    write: false,
    legalComments: 'none',
    external: ['*.webp', '*.jpg', '*.jpeg', '*.png', '*.svg', '*.gif', '*.woff', '*.woff2', 'https://*', 'http://*'],
    logLevel: 'silent',
  });
  return result.outputFiles[0].text;
}

function listHtmlFiles(rootDir) {
  const out = [];
  function walk(dir) {
    for (const name of readdirSync(dir)) {
      if (SKIP_DIR_NAMES.has(name)) continue;
      const abs = join(dir, name);
      const st = statSync(abs);
      if (st.isDirectory()) {
        walk(abs);
        continue;
      }
      if (extname(name) === '.html') out.push(abs);
    }
  }
  walk(rootDir);
  return out;
}

/**
 * Minify + content-hash JS/CSS under `gloweDestDir`, rewrite HTML + cross-refs.
 * @param {string} gloweDestDir absolute path to dist/glowe (or a copy)
 * @param {{ gloweSrc?: string }} [opts]
 * @returns {Promise<Map<string, string>>} oldRel → hashedRel (posix)
 */
export async function minifyAndHashGloweAssets(gloweDestDir, opts = {}) {
  const root = resolve(gloweDestDir);
  if (!existsSync(root)) {
    throw new Error(`[glowe-minify-hash] missing dir: ${root}`);
  }

  const esbuild = resolveEsbuild(opts.gloweSrc);
  const absFiles = listAssetFiles(root);
  const cssPartials = collectCssPartials(absFiles);
  const minified = new Map();

  for (const abs of absFiles) {
    const rel = toPosix(relative(root, abs));
    if (cssPartials.has(abs)) continue; // inlined into its entry by bundleCss
    if (extname(abs) === '.css') {
      minified.set(rel, await bundleCss(esbuild, abs));
      continue;
    }
    const result = await esbuild.transform(readFileSync(abs, 'utf8'), {
      loader: 'js',
      minify: true,
      legalComments: 'none',
    });
    minified.set(rel, result.code);
  }
  // Partials are never shipped alone (they are inside the bundled entry).
  for (const abs of cssPartials) {
    if (existsSync(abs)) unlinkSync(abs);
    const dir = dirname(abs);
    if (existsSync(dir) && readdirSync(dir).length === 0) rmdirSync(dir);
  }

  let renameMap = new Map();
  let rewritten = minified;
  let stabilized = false;
  for (let pass = 0; pass < 6; pass += 1) {
    rewritten = new Map();
    for (const [rel, code] of minified) {
      rewritten.set(rel, applyRenames(code, renameMap));
    }
    const next = new Map();
    for (const [rel, code] of rewritten) {
      const hash = createHash('sha256').update(code).digest('hex').slice(0, 8);
      next.set(rel, injectContentHash(rel, hash));
    }
    if (mapsEqual(renameMap, next)) {
      stabilized = true;
      break;
    }
    renameMap = next;
  }
  if (!stabilized) {
    throw new Error('[glowe-minify-hash] asset hash rename map did not stabilize');
  }

  for (const [rel, code] of rewritten) {
    const hashedRel = renameMap.get(rel);
    const outAbs = join(root, hashedRel);
    writeFileSync(outAbs, code, 'utf8');
    const srcAbs = join(root, rel);
    if (srcAbs !== outAbs && existsSync(srcAbs)) unlinkSync(srcAbs);
  }

  for (const htmlAbs of listHtmlFiles(root)) {
    const before = readFileSync(htmlAbs, 'utf8');
    const after = applyRenames(before, renameMap);
    if (after !== before) writeFileSync(htmlAbs, after, 'utf8');
  }

  const manifest = {};
  for (const [from, to] of renameMap) manifest[from] = to;
  writeFileSync(join(root, 'asset-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

  console.log(
    `[glowe-minify-hash] hashed ${renameMap.size} assets → ${root} (manifest: asset-manifest.json)`,
  );
  return renameMap;
}

/** Cloudflare Pages cache rules for /glowe (site-root `_headers`). */
export const GLOWE_CF_HEADERS = `# GloWe (Wave 2.2) — hashed JS/CSS are immutable; HTML stays fresh.
/glowe/js/*
  Cache-Control: public, max-age=31536000, immutable
/glowe/css/*
  Cache-Control: public, max-age=31536000, immutable
/glowe/assets/*
  Cache-Control: public, max-age=604800
/glowe/index.html
  Cache-Control: public, max-age=0, must-revalidate
/glowe/
  Cache-Control: public, max-age=0, must-revalidate
/glowe/pages/*
  Cache-Control: public, max-age=0, must-revalidate
`;

const isMain =
  process.argv[1] &&
  resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));

if (isMain) {
  const target = process.argv[2];
  if (!target) {
    console.error('Usage: node scripts/glowe-minify-hash.mjs <gloweDestDir>');
    process.exit(1);
  }
  const here = dirname(fileURLToPath(import.meta.url));
  const gloweSrc = resolve(here, '..', 'apps', 'glowe-web');
  await minifyAndHashGloweAssets(target, { gloweSrc });
}
