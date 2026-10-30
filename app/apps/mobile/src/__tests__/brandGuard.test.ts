import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { brand } from '@kc/ui';
// eslint-disable-next-line no-restricted-imports -- test asserts both bundles' appName match the brand constants
import en from '../i18n/locales/en';
// eslint-disable-next-line no-restricted-imports -- test asserts both bundles' appName match the brand constants
import he from '../i18n/locales/he';

// Brand guard — spec 17 §4/§6 (D65), debt TD-199.
//
// App code must take colours, font sizes and font families from @kc/ui tokens.
// Existing literals are frozen per file in `brand-guard.baseline.json`; counts
// may only go down. After a cleanup, tighten the baseline with:
//   KC_BRAND_BASELINE=update pnpm --filter @kc/mobile test -- brandGuard
// A line ending in `brand-guard-allow: <reason>` is skipped (reviewed in PR).

const MOBILE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SCANNED_DIRS = ['src', 'app'] as const;
const BASELINE_PATH = path.join(MOBILE_ROOT, 'brand-guard.baseline.json');
const ALLOW_MARKER = 'brand-guard-allow:';

const RULES = {
  colorLiteral: /['"`](?:#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})['"`]|rgba?\()/g,
  fontSizeLiteral: /\bfontSize:\s*\d/g,
  fontFamilyLiteral: /\bfontFamily:\s*['"`]/g,
} as const;

type RuleName = keyof typeof RULES;
type FileCounts = Partial<Record<RuleName, number>>;
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

function countLiterals(source: string): FileCounts {
  const lines = source.split('\n').filter((line) => !line.includes(ALLOW_MARKER));
  const counts: FileCounts = {};
  for (const rule of Object.keys(RULES) as RuleName[]) {
    const found = lines.reduce((sum, line) => sum + (line.match(RULES[rule])?.length ?? 0), 0);
    if (found > 0) counts[rule] = found;
  }
  return counts;
}

function scanApp(): Baseline {
  const result: Baseline = {};
  for (const file of SCANNED_DIRS.flatMap(listSources).sort()) {
    const counts = countLiterals(readFileSync(path.join(MOBILE_ROOT, file), 'utf8'));
    if (Object.keys(counts).length > 0) result[file] = counts;
  }
  return result;
}

function readBaseline(): Baseline {
  return (JSON.parse(readFileSync(BASELINE_PATH, 'utf8')) as { files: Baseline }).files;
}

function writeBaseline(files: Baseline): void {
  const body = {
    $comment: 'Frozen hard-coded style literals per file (spec 17 §6, TD-199). Counts may only go down.',
    files,
  };
  writeFileSync(BASELINE_PATH, `${JSON.stringify(body, null, 2)}\n`);
}

function compare(current: Baseline, baseline: Baseline) {
  const grew: string[] = [];
  const shrank: string[] = [];
  const files = new Set([...Object.keys(current), ...Object.keys(baseline)]);
  for (const file of files) {
    for (const rule of Object.keys(RULES) as RuleName[]) {
      const now = current[file]?.[rule] ?? 0;
      const allowed = baseline[file]?.[rule] ?? 0;
      if (now > allowed) grew.push(`${file}: ${rule} ${now} > ${allowed}`);
      if (now < allowed) shrank.push(`${file}: ${rule} ${now} < ${allowed}`);
    }
  }
  return { grew, shrank };
}

describe('countLiterals', () => {
  it('counts quoted hex and rgb() colours, raw font sizes and font families', () => {
    const source = [
      "const a = { color: '#F97316', backgroundColor: \"#fff\" };",
      "const b = { borderColor: 'rgba(0, 0, 0, 0.5)', fontSize: 13, fontFamily: 'Courier' };",
    ].join('\n');
    expect(countLiterals(source)).toEqual({ colorLiteral: 3, fontSizeLiteral: 1, fontFamilyLiteral: 1 });
  });

  it('ignores tokens, hashtags, issue numbers and allowed lines', () => {
    const source = [
      'const a = { color: colors.primary, fontSize: typography.body.fontSize };',
      "const tag = '#giving'; // see #123",
      "const google = '#4285F4'; // brand-guard-allow: Google sign-in mark",
    ].join('\n');
    expect(countLiterals(source)).toEqual({});
  });
});

describe('brand guard', () => {
  const current = scanApp();

  if (process.env.KC_BRAND_BASELINE === 'update') {
    it('rewrites brand-guard.baseline.json from the current code', () => {
      writeBaseline(current);
    });
    return;
  }

  const { grew, shrank } = compare(current, readBaseline());

  it('adds no hard-coded colour / fontSize / fontFamily beyond the frozen baseline', () => {
    expect(grew, 'use @kc/ui tokens (useTheme / typography) instead of literals').toEqual([]);
  });

  it('keeps the baseline tight after cleanups (rerun with KC_BRAND_BASELINE=update)', () => {
    expect(shrank).toEqual([]);
  });
});

describe('brand identity in the shipped app', () => {
  const appJson = JSON.parse(readFileSync(path.join(MOBILE_ROOT, 'app.json'), 'utf8')) as {
    expo: { name: string };
  };

  it('uses the English brand name in the English bundle', () => {
    expect(en.appName).toBe(`${brand.shortName} - ${brand.name}`);
  });

  it('ships the store name from the Hebrew bundle, prefixed with the nickname', () => {
    expect(he.appName.startsWith(`${brand.shortName} - `)).toBe(true);
    expect(appJson.expo.name).toBe(he.appName);
  });
});
