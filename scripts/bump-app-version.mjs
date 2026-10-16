#!/usr/bin/env node
/**
 * Bump app/VERSION patch (MAJOR.MINOR.PATCH).
 * Usage: node scripts/bump-app-version.mjs [--dry-run]
 * Env: APP_ROOT — override path to the `app/` directory (tests).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..');
const appRoot = resolve(process.env.APP_ROOT || resolve(repoRoot, 'app'));

export function parseSemver(raw) {
  const text = String(raw ?? '').trim();
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(text);
  if (!match) {
    throw new Error(`Invalid semver in VERSION: ${JSON.stringify(text)}`);
  }
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
  };
}

export function formatSemver({ major, minor, patch }) {
  return `${major}.${minor}.${patch}`;
}

export function bumpPatch(version) {
  return { ...version, patch: version.patch + 1 };
}

export function bumpAppVersionFiles(root = appRoot) {
  const versionPath = resolve(root, 'VERSION');
  const current = parseSemver(readFileSync(versionPath, 'utf8'));
  const next = formatSemver(bumpPatch(current));
  return {
    previous: formatSemver(current),
    next,
    versionPath,
    versionBody: `${next}\n`,
  };
}

function main() {
  const dryRun = process.argv.includes('--dry-run');
  const result = bumpAppVersionFiles();
  if (!dryRun) {
    writeFileSync(result.versionPath, result.versionBody, 'utf8');
  }
  process.stdout.write(`${result.previous} -> ${result.next}\n`);
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main();
