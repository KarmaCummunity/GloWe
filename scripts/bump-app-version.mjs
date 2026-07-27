#!/usr/bin/env node
/**
 * Bump app/VERSION patch (MAJOR.MINOR.PATCH) and sync glowe-version.js.
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

export function gloweVersionSource(version) {
  return `// App-wide display version (FR-GLOWE-025 / D-181).
// Source of truth: app/VERSION. Kept in sync by scripts/bump-app-version.mjs,
// scripts/stamp-glowe-version.mjs (local dev), and web-postbuild on deploy.
(function (root) {
    root.GloweAppVersion = { version: '${version}' };
})(typeof self !== 'undefined' ? self : this);
`;
}

export function bumpAppVersionFiles(root = appRoot) {
  const versionPath = resolve(root, 'VERSION');
  const glowePath = resolve(root, 'apps', 'glowe-web', 'js', 'glowe-version.js');
  const current = parseSemver(readFileSync(versionPath, 'utf8'));
  const next = formatSemver(bumpPatch(current));
  return {
    previous: formatSemver(current),
    next,
    versionPath,
    glowePath,
    versionBody: `${next}\n`,
    gloweBody: gloweVersionSource(next),
  };
}

/** Sync glowe-version.js from app/VERSION without bumping (local dev + CI). */
export function stampGloweVersionFiles(root = appRoot) {
  const versionPath = resolve(root, 'VERSION');
  const glowePath = resolve(root, 'apps', 'glowe-web', 'js', 'glowe-version.js');
  const version = formatSemver(parseSemver(readFileSync(versionPath, 'utf8')));
  return {
    version,
    versionPath,
    glowePath,
    gloweBody: gloweVersionSource(version),
  };
}

function main() {
  const dryRun = process.argv.includes('--dry-run');
  const result = bumpAppVersionFiles();
  if (!dryRun) {
    writeFileSync(result.versionPath, result.versionBody, 'utf8');
    writeFileSync(result.glowePath, result.gloweBody, 'utf8');
  }
  process.stdout.write(`${result.previous} -> ${result.next}\n`);
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main();
