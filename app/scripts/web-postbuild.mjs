#!/usr/bin/env node
// Post-process the Expo web export for Cloudflare Pages.
// - Copies the GloWe static frontend into `dist/glowe/` so it is served at the
//   `/glowe` sub-path of the main domain, alongside the KC web app (one domain,
//   two frontends, shared Supabase backend). See FR-GLOWE-001 / DECISIONS D-61.
//   This mount happens in EVERY environment — GloWe stays reachable at /glowe.
// - D-169 (2026-07-05): whether the KC root ALSO redirects to /glowe/ is now
//   environment-gated, not unconditional. On `development`
//   (`EXPO_PUBLIC_ENVIRONMENT=development`, the `dev` deploy) the KC root is
//   still gated behind a 302 to /glowe/ — dev is where GLOWE-only mode is being
//   built/tested. On every other value (including missing/unknown —
//   fail-safe-closed, same convention as `isDevEnvironment()` in
//   `apps/mobile/src/config/environment.ts`) the KC root serves the real KC web
//   app; GLOWE remains available at /glowe for anyone who navigates there.
// - D-188 (2026-07-27): after copy, minify + content-hash GloWe JS/CSS (esbuild)
//   and write site-root Cloudflare `_headers` for long-cache hashed assets /
//   no-cache HTML. Source tree under apps/glowe-web stays unhashed for local serve.
// See: https://developers.cloudflare.com/pages/configuration/redirects/
//
// TO GATE KC BEHIND /glowe AGAIN ON PROD: set EXPO_PUBLIC_ENVIRONMENT=development
// for the `cloudflare-prod` GitHub environment (or force GATE_ROOT below).

import { writeFileSync, readFileSync, existsSync, cpSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { minifyAndHashGloweAssets, GLOWE_CF_HEADERS } from './glowe-minify-hash.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(here, '..');
const distDir = resolve(appRoot, 'apps', 'mobile', 'dist');
const redirectsPath = resolve(distDir, '_redirects');
const headersPath = resolve(distDir, '_headers');

// Same semantics as `isDevEnvironment()`: only the literal 'development' value
// opts in; anything else (unset, 'production', a typo) fails safe to "serve KC".
const GATE_ROOT_TO_GLOWE = process.env.EXPO_PUBLIC_ENVIRONMENT === 'development';

if (!existsSync(distDir)) {
  console.error(`[web-postbuild] dist not found at ${distDir} — did expo export run?`);
  process.exit(1);
}

// Mount the GloWe static site at /glowe (skip dev-only tooling files).
const gloweSrc = resolve(here, '..', 'apps', 'glowe-web');
const gloweDest = resolve(distDir, 'glowe');
const skip = new Set(['node_modules', 'package.json', 'README.md', '__tests__']);
if (existsSync(gloweSrc)) {
  cpSync(gloweSrc, gloweDest, {
    recursive: true,
    filter: (src) => {
      const base = src.split('/').pop();
      if (skip.has(base)) return false;
      // Nested vitest trees under js/__tests__
      if (src.includes(`${gloweSrc}/js/__tests__`) || src.endsWith('/js/__tests__')) {
        return false;
      }
      return true;
    },
  });
  console.log(`[web-postbuild] copied GloWe → ${gloweDest}`);
  stampGloweAppVersion(gloweDest);
  await minifyAndHashGloweAssets(gloweDest, { gloweSrc });
} else {
  console.warn(`[web-postbuild] GloWe source not found at ${gloweSrc} — skipping /glowe mount`);
}

/** Re-stamp footer version from app/VERSION (FR-GLOWE-025 / D-181). */
function stampGloweAppVersion(gloweDestDir) {
  const versionPath = resolve(appRoot, 'VERSION');
  if (!existsSync(versionPath)) {
    console.warn(`[web-postbuild] ${versionPath} missing — skip glowe version stamp`);
    return;
  }
  const version = readFileSync(versionPath, 'utf8').trim();
  if (!/^\d+\.\d+\.\d+$/.test(version)) {
    console.warn(`[web-postbuild] invalid VERSION ${JSON.stringify(version)} — skip stamp`);
    return;
  }
  const out = resolve(gloweDestDir, 'js', 'glowe-version.js');
  writeFileSync(
    out,
    `// App-wide display version (FR-GLOWE-025 / D-181). Stamped by web-postbuild.\n` +
      `(function (root) {\n` +
      `    root.GloweAppVersion = { version: '${version}' };\n` +
      `})(typeof self !== 'undefined' ? self : this);\n`,
    'utf8',
  );
  console.log(`[web-postbuild] stamped GloWe version ${version} → ${out}`);
}

// Cloudflare Pages reads `_headers` only at the publish root (not dist/glowe/).
writeFileSync(headersPath, GLOWE_CF_HEADERS, 'utf8');
console.log(`[web-postbuild] wrote ${headersPath}`);

// _redirects strategy:
// Cloudflare Pages applies ALL _redirects rules before serving static files
// (despite docs suggesting otherwise). A broad wildcard like /* therefore
// overrides real files — causing redirect loops for /glowe/* assets.
//
// Safe approach: only redirect the exact paths we want to gate (/  and
// individual KC named routes), never with a catch-all that matches /glowe/*.
// GloWe's own static files (/glowe/index.html, /glowe/pages/*, assets…) are
// served directly because they have no matching redirect rule.
const redirectsLines = [
  // GloWe root: serve index.html for the bare /glowe path (no trailing slash)
  '/glowe    /glowe/index.html  200',
];
if (GATE_ROOT_TO_GLOWE) {
  // Redirect the KC root to GloWe (dev-only "GLOWE-only" mode, D-169).
  redirectsLines.push('/         /glowe/            302');
}
writeFileSync(redirectsPath, redirectsLines.join('\n') + '\n', 'utf8');
console.log(
  `[web-postbuild] wrote ${redirectsPath} (root gated to /glowe: ${GATE_ROOT_TO_GLOWE})`,
);

if (GATE_ROOT_TO_GLOWE) {
  // Replace dist/index.html with a redirect shim.
  // "/" serves dist/index.html as a directory-index before _redirects fires,
  // so we overwrite it with a page that immediately sends the browser to /glowe/.
  const rootIndexPath = resolve(distDir, 'index.html');
  writeFileSync(
    rootIndexPath,
    `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta http-equiv="refresh" content="0; url=/glowe/">
<title>Redirecting…</title>
<script>window.location.replace('/glowe/');</script>
</head>
<body><a href="/glowe/">Click here if not redirected automatically</a></body>
</html>
`,
    'utf8',
  );
  console.log(`[web-postbuild] replaced ${rootIndexPath} with /glowe/ redirect shim`);
} else {
  console.log('[web-postbuild] KC root left untouched — serving the real KC web app at /');
}
