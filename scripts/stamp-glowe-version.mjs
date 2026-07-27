#!/usr/bin/env node
/**
 * Sync app/apps/glowe-web/js/glowe-version.js from app/VERSION (no bump).
 * Runs before local GloWe dev server and mirrors web-postbuild stamping on deploy.
 */
import { writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { stampGloweVersionFiles } from './bump-app-version.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(process.env.APP_ROOT || resolve(here, '..', 'app'));

function main() {
  const result = stampGloweVersionFiles(appRoot);
  writeFileSync(result.glowePath, result.gloweBody, 'utf8');
  process.stdout.write(`[stamp-glowe-version] synced v${result.version} → ${result.glowePath}\n`);
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main();
