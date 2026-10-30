import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { brand, lightColors } from '@kc/ui';
// eslint-disable-next-line no-restricted-imports -- test asserts both bundles' appName match the brand constants
import en from '../i18n/locales/en';
// eslint-disable-next-line no-restricted-imports -- test asserts both bundles' appName match the brand constants
import he from '../i18n/locales/he';
import { countLiterals, RULE_NAMES, type FileCounts } from './brandGuardRules';

// Brand guard — spec 17 §4/§6 (D65, D67, D87), debt TD-199.
//
// App code must take colours, type (size, weight, family), corner radii,
// spacing, icon sizes, layers and shadows from @kc/ui tokens, use logical sides
// (start/end) so layouts mirror between Hebrew (RTL) and English (LTR), and
// build forms and dialogs from the shared kit. The rules live in
// `brandGuardRules.ts`.
// Existing literals are frozen per file in `brand-guard.baseline.json`; counts
// may only go down. After a cleanup, tighten the baseline with:
//   KC_BRAND_BASELINE=update pnpm --filter @kc/mobile test -- brandGuard
// A line ending in `brand-guard-allow: <reason>` is skipped (reviewed in PR).
// Touched-file rule (D67): every scanned file the branch changes must be fully
// clean, whatever its frozen count.

const MOBILE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SCANNED_DIRS = ['src', 'app'] as const;
const BASELINE_PATH = path.join(MOBILE_ROOT, 'brand-guard.baseline.json');
const REPO_ROOT = path.resolve(MOBILE_ROOT, '../../..');
const MOBILE_FROM_REPO = `${path.relative(REPO_ROOT, MOBILE_ROOT).split(path.sep).join('/')}/`;

type Baseline = Record<string, FileCounts>;

function isScannedSource(fileName: string): boolean {
  return /\.tsx?$/.test(fileName) && !/\.(test|d)\.tsx?$/.test(fileName);
}

function listSources(relativeDir: string): string[] {
  return readdirSync(path.join(MOBILE_ROOT, relativeDir), { withFileTypes: true }).flatMap((entry) => {
    const relativePath = path.posix.join(relativeDir, entry.name);
    if (entry.isDirectory()) return entry.name === '__tests__' ? [] : listSources(relativePath);
    return isScannedSource(entry.name) ? [relativePath] : [];
  });
}

function scanApp(): Baseline {
  const result: Baseline = {};
  for (const file of SCANNED_DIRS.flatMap(listSources).sort()) {
    const counts = countLiterals(readFileSync(path.join(MOBILE_ROOT, file), 'utf8'), file);
    if (Object.keys(counts).length > 0) result[file] = counts;
  }
  return result;
}

function readBaseline(): Baseline {
  return (JSON.parse(readFileSync(BASELINE_PATH, 'utf8')) as { files: Baseline }).files;
}

function writeBaseline(files: Baseline): void {
  const body = {
    $comment: 'Frozen brand-guard findings per file (spec 17 §6, TD-199). Counts may only go down.',
    files,
  };
  writeFileSync(BASELINE_PATH, `${JSON.stringify(body, null, 2)}\n`);
}

/** Base the touched-file rule diffs against: the PR base in CI, else `origin/dev`. */
function touchedBaseRef(): string {
  const prBase = process.env.GITHUB_BASE_REF;
  return process.env.KC_BRAND_BASE_REF ?? (prBase ? `origin/${prBase}` : 'origin/dev');
}

function git(args: readonly string[]): string {
  return execFileSync('git', args, { cwd: REPO_ROOT, encoding: 'utf8' }).trim();
}

/**
 * Scanned sources (mobile-relative) changed since the merge-base with `baseRef`,
 * committed or not. Deleted files are left out. Null when the ref cannot be resolved.
 */
function touchedSources(baseRef: string): string[] | null {
  let mergeBase: string;
  try {
    mergeBase = git(['merge-base', baseRef, 'HEAD']);
  } catch {
    return null;
  }
  return git(['diff', '--name-only', '--diff-filter=ACMR', mergeBase, '--', MOBILE_FROM_REPO])
    .split('\n')
    .filter((file) => file.startsWith(MOBILE_FROM_REPO))
    .map((file) => file.slice(MOBILE_FROM_REPO.length))
    .filter(
      (file) =>
        SCANNED_DIRS.some((dir) => file.startsWith(`${dir}/`)) &&
        !file.includes('/__tests__/') &&
        isScannedSource(path.posix.basename(file)),
    );
}

function compare(current: Baseline, baseline: Baseline) {
  const grew: string[] = [];
  const shrank: string[] = [];
  const files = new Set([...Object.keys(current), ...Object.keys(baseline)]);
  for (const file of files) {
    for (const rule of RULE_NAMES) {
      const now = current[file]?.[rule] ?? 0;
      const allowed = baseline[file]?.[rule] ?? 0;
      if (now > allowed) grew.push(`${file}: ${rule} ${now} > ${allowed}`);
      if (now < allowed) shrank.push(`${file}: ${rule} ${now} < ${allowed}`);
    }
  }
  return { grew, shrank };
}

describe('brand guard', () => {
  const current = scanApp();

  if (process.env.KC_BRAND_BASELINE === 'update') {
    it('rewrites brand-guard.baseline.json from the current code', () => {
      writeBaseline(current);
      expect(readBaseline()).toEqual(current);
    });
    return;
  }

  const { grew, shrank } = compare(current, readBaseline());

  it('adds no hard-coded style literal or physical side beyond the frozen baseline', () => {
    expect(
      grew,
      'use @kc/ui tokens (useTheme / typography / radius / spacing / iconSize / zIndex / shadow), start/end sides and the kit components',
    ).toEqual([]);
  });

  it('keeps the baseline tight after cleanups (rerun with KC_BRAND_BASELINE=update)', () => {
    expect(shrank).toEqual([]);
  });
});

describe('touched-file rule (spec 17 §6, D67)', () => {
  const baseRef = touchedBaseRef();
  const touched = touchedSources(baseRef);

  if (touched === null) {
    // CI must always resolve the base (checkout with fetch-depth: 0); a local
    // clone without the ref only skips this rule.
    it(`resolves the base ref ${baseRef} in CI`, () => {
      expect(process.env.CI, `cannot resolve ${baseRef} — fetch it before running the guard`).toBeFalsy();
    });
    return;
  }

  it(`leaves every file changed since ${baseRef} with zero findings`, () => {
    const dirty = touched.flatMap((file) => {
      const counts = countLiterals(readFileSync(path.join(MOBILE_ROOT, file), 'utf8'), file);
      return Object.keys(counts).length > 0 ? [`${file}: ${JSON.stringify(counts)}`] : [];
    });
    expect(dirty, 'a file you change must be fully on tokens — fix the whole file, not only your lines').toEqual([]);
  });
});

describe('brand identity in the shipped app', () => {
  const appJson = JSON.parse(readFileSync(path.join(MOBILE_ROOT, 'app.json'), 'utf8')) as {
    expo: { name: string; userInterfaceStyle: string; web: { themeColor: string }; plugins: unknown[] };
  };

  it('uses the English brand name in the English bundle', () => {
    expect(en.appName).toBe(`${brand.shortName} - ${brand.name}`);
  });

  it('ships the store name from the Hebrew bundle, prefixed with the nickname', () => {
    expect(he.appName.startsWith(`${brand.shortName} - `)).toBe(true);
    expect(appJson.expo.name).toBe(he.appName);
  });

  // Config files cannot import tokens, so these copies of the decoration orange are pinned here.
  it('keeps browser chrome and notification colours on the primaryVivid token', () => {
    const notificationPlugin = appJson.expo.plugins.find(
      (plugin): plugin is [string, { color: string }] => Array.isArray(plugin) && plugin[0] === 'expo-notifications',
    );
    const htmlHead = readFileSync(path.join(MOBILE_ROOT, 'app/+html.tsx'), 'utf8');
    expect(appJson.expo.web.themeColor).toBe(lightColors.primaryVivid);
    expect(notificationPlugin?.[1].color).toBe(lightColors.primaryVivid);
    expect(htmlHead).toContain(`name="theme-color" content="${lightColors.primaryVivid}"`);
  });

  // FR-SETTINGS-014: a forced "light" style made the OS report light forever, so
  // the "system" appearance never resolved to dark on native.
  it('lets the OS colour scheme through so the "system" appearance can turn dark', () => {
    const packageJson = JSON.parse(readFileSync(path.join(MOBILE_ROOT, 'package.json'), 'utf8')) as {
      dependencies: Record<string, string>;
    };
    expect(appJson.expo.userInterfaceStyle).toBe('automatic');
    // Android applies `automatic` only through expo-system-ui.
    expect(packageJson.dependencies).toHaveProperty('expo-system-ui');
  });
});
