#!/usr/bin/env node
// Post-process the Expo web export for Cloudflare Pages (KC web at site root).
// See: https://developers.cloudflare.com/pages/configuration/redirects/

import { writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(here, '..');
const distDir = resolve(appRoot, 'apps', 'mobile', 'dist');
const redirectsPath = resolve(distDir, '_redirects');

if (!existsSync(distDir)) {
  console.error(`[web-postbuild] dist not found at ${distDir} — did expo export run?`);
  process.exit(1);
}

// Legacy /glowe bookmarks: send to KC root (remove stale static tree after deploy).
writeFileSync(redirectsPath, '/glowe/*  /  302\n/glowe     /  302\n', 'utf8');
console.log(`[web-postbuild] wrote ${redirectsPath} (KC root + /glowe legacy redirects)`);
