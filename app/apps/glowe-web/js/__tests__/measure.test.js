// Tests for scripts/measure.mjs — the FR-GLOWE-026 AC9 performance gate.
//
// Driven through the real CLI against fixture trees rather than by importing
// internals: the exit code IS the contract CI depends on, and a gate that is
// only tested at the unit level can still be wired up so it never fails.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const SCRIPT = resolve(HERE, '..', '..', 'scripts', 'measure.mjs');

let root;

/** Run the CLI against a fixture tree; never throws, so exit codes are assertable. */
function run(args = []) {
  try {
    const stdout = execFileSync('node', [SCRIPT, '--root', root, ...args], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { code: 0, stdout, stderr: '' };
  } catch (err) {
    return {
      code: err.status ?? 1,
      stdout: err.stdout?.toString() ?? '',
      stderr: err.stderr?.toString() ?? '',
    };
  }
}

const measure = (args = []) => JSON.parse(run(['--json', ...args]).stdout).pages;
const page = (name, pages) => pages.find((p) => p.report.page.endsWith(name));

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), 'glowe-measure-'));
  mkdirSync(join(root, 'js'), { recursive: true });
  mkdirSync(join(root, 'css'), { recursive: true });
  mkdirSync(join(root, 'assets'), { recursive: true });

  // Padded so gzip cannot compress the difference between files away.
  writeFileSync(join(root, 'js', 'blocking.js'), `// ${'a'.repeat(4000)}\n`);
  writeFileSync(join(root, 'js', 'deferred.js'), `// ${'b'.repeat(4000)}\n`);
  writeFileSync(join(root, 'css', 'main.css'), `.x{color:red}\n.bg{background:url('../assets/bg.png')}\n`);
  writeFileSync(join(root, 'css', 'print.css'), '.p{color:blue}\n');
  writeFileSync(join(root, 'assets', 'hero.png'), Buffer.alloc(50 * 1024, 7));
  writeFileSync(join(root, 'assets', 'bg.png'), Buffer.alloc(90 * 1024, 9));

  writeFileSync(join(root, 'index.html'), `<!doctype html>
<link rel="stylesheet" href="css/main.css">
<link rel="stylesheet" href="css/print.css" media="print">
<link rel="stylesheet" href="https://fonts.example.com/f.css">
<img src="assets/hero.png">
<script src="js/blocking.js"></script>
<script src="js/deferred.js" defer></script>
<script src="js/missing.js"></script>
`);
});

afterAll(() => rmSync(root, { recursive: true, force: true }));

describe('blocking-resource classification', () => {
  it('counts a plain script and a screen stylesheet, and nothing else', () => {
    // main.css + blocking.js + missing.js == 3. The deferred script, the
    // print-only stylesheet and the cross-origin stylesheet are all excluded.
    expect(page('index.html', measure()).report.blockingRequests).toBe(3);
  });

  it('excludes deferred script bytes from the critical path', () => {
    const { report } = page('index.html', measure());
    // Both JS fixtures are ~4 KB; counting the deferred one would roughly
    // double a critical path that is otherwise dominated by blocking.js.
    expect(report.criticalPath.raw).toBeGreaterThan(4000);
    expect(report.criticalPath.raw).toBeLessThan(8000);
  });

  it('reports third-party render-path origins instead of weighing them', () => {
    expect(page('index.html', measure()).report.thirdParty)
      .toEqual(['https://fonts.example.com/f.css']);
  });

  it('surfaces broken references rather than banking them as savings', () => {
    expect(page('index.html', measure()).report.missing).toEqual(['js/missing.js']);
  });
});

describe('page weight', () => {
  it('counts <img> bytes but not CSS-only images', () => {
    const { report } = page('index.html', measure());
    expect(report.imageBytes).toBe(50 * 1024);
    // The 90 KB CSS background is tracked separately: a browser fetches it only
    // if a selector matches, so folding it in would overstate every page.
    expect(report.cssImageBytes).toBe(90 * 1024);
    expect(report.pageWeight).toBeLessThan(report.pageWeight + report.cssImageBytes);
  });

  it('sums document, blocking bytes and images', () => {
    const { report } = page('index.html', measure());
    expect(report.pageWeight).toBe(report.html + report.criticalPath.raw + report.imageBytes);
  });
});

describe('the gate', () => {
  it('passes when every page is inside budget', () => {
    expect(run(['--no-gate']).code).toBe(0);
  });

  it('fails with a non-zero exit when a budget is breached', () => {
    // The real budget file allows 18 blocking requests; this fixture has 3.
    // Squeeze the ceiling under it to prove the gate bites — without this the
    // whole workflow could be green because it never actually checks anything.
    const strict = join(root, 'strict-budget.json');
    writeFileSync(strict, JSON.stringify({
      default: {
        blockingRequests: { budget: 1, target: 1 },
        criticalPathGzipKb: { budget: 9999, target: 60 },
        pageWeightKb: { budget: 9999, target: 500 },
      },
      pages: {},
    }));
    const result = run(['--budget', strict]);
    expect(result.code).toBe(1);
    expect(result.stderr).toContain('BUDGET BREACH');
    expect(result.stderr).toContain('blockingRequests');
  });

  it('--no-gate reports a breach without failing', () => {
    const strict = join(root, 'strict-budget.json');
    const result = run(['--budget', strict, '--no-gate']);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain('budgets breached');
  });
});
