#!/usr/bin/env node
/**
 * Wait until a GloWe deployment is fully live before running post-deploy E2E.
 *
 *   node scripts/wait-for-glowe-deploy.mjs <glowe-url> [--version X.Y.Z] [--stable N] [attempts] [delayMs]
 *
 * A bare HTTP 200 on the root is not enough: while Cloudflare Pages propagates,
 * the HTML of the new deploy can be served next to the hashed assets of the
 * previous one, so `css/glowe.<hash>.css` 404s and the visual snapshots capture
 * an unstyled page. "Live" here means the root HTML resolves AND every hashed
 * stylesheet / script it references resolves with the right MIME type AND,
 * when `--version` is given, the deployed `glowe-version.js` carries it — for
 * `--stable N` consecutive probes (default 3), because propagation is
 * per-edge and a single green probe can be followed by a stale response.
 */
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HASHED_ASSET_RE = /(?:href|src)="((?:css|js)\/[^"]+\.[0-9a-f]{8}\.(?:css|js))"/g;
const VERSION_RE = /version:\s*["']([^"']+)["']/;

/** Hashed CSS/JS URLs referenced by an HTML document, resolved against `base`. */
export function hashedAssetUrls(html, base) {
  const root = base.endsWith('/') ? base : `${base}/`;
  return [...html.matchAll(HASHED_ASSET_RE)].map((m) => new URL(m[1], root).href);
}

/** The `version` field of a deployed glowe-version.js, or null. */
export function deployedVersion(jsSource) {
  const m = VERSION_RE.exec(jsSource);
  return m ? m[1] : null;
}

/**
 * One readiness probe. Resolves to `{ ok: true }` or `{ ok: false, reason }`.
 * @param {string} base GloWe site root
 * @param {{ version?: string, fetch?: typeof fetch }} opts
 */
export async function probeDeploy(base, opts = {}) {
  const doFetch = opts.fetch ?? fetch;
  const root = base.endsWith('/') ? base : `${base}/`;
  const page = await doFetch(root, { redirect: 'follow' });
  if (!page.ok) return { ok: false, reason: `root HTTP ${page.status}` };
  const html = await page.text();
  const assets = hashedAssetUrls(html, root);
  if (assets.length === 0) return { ok: false, reason: 'root HTML references no hashed assets' };

  for (const url of assets) {
    const res = await doFetch(url, { redirect: 'follow' });
    const type = res.headers.get('content-type') || '';
    const wantCss = url.endsWith('.css');
    if (!res.ok) return { ok: false, reason: `${url} HTTP ${res.status}` };
    if (wantCss ? !type.includes('css') : !type.includes('javascript')) {
      return { ok: false, reason: `${url} served as ${type || 'unknown'}` };
    }
    if (opts.version && /glowe-version\./.test(url)) {
      const got = deployedVersion(await res.text());
      if (got !== opts.version) return { ok: false, reason: `deployed version ${got}, want ${opts.version}` };
    }
  }
  return { ok: true, assets: assets.length };
}

function parseArgs(argv) {
  const rest = [];
  let version;
  let stable = 3;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--version') version = argv[++i];
    else if (argv[i] === '--stable') stable = parseInt(argv[++i], 10);
    else rest.push(argv[i]);
  }
  return { url: rest[0], version, stable, attempts: parseInt(rest[1] ?? '24', 10), delayMs: parseInt(rest[2] ?? '15000', 10) };
}

const isMain = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));

if (isMain) {
  const { url, version, stable, attempts, delayMs } = parseArgs(process.argv.slice(2));
  if (!url) {
    console.error('usage: node scripts/wait-for-glowe-deploy.mjs <glowe-url> [--version X.Y.Z] [--stable N] [attempts] [delayMs]');
    process.exit(2);
  }
  let streak = 0;
  for (let i = 1; i <= attempts; i++) {
    let result;
    try {
      result = await probeDeploy(url, { version });
    } catch (err) {
      result = { ok: false, reason: err.message };
    }
    streak = result.ok ? streak + 1 : 0;
    if (streak >= stable) {
      console.log(`OK ${url} — ${result.assets} hashed assets live${version ? `, v${version}` : ''}, ${stable} consecutive probes (attempt ${i}/${attempts})`);
      process.exit(0);
    }
    console.log(`attempt ${i}/${attempts}: ${result.ok ? `live (${streak}/${stable})` : result.reason}`);
    await new Promise((r) => setTimeout(r, result.ok ? Math.min(delayMs, 10_000) : delayMs));
  }
  console.error(`::error::${url} deploy not live after ${attempts} attempts`);
  process.exit(1);
}
