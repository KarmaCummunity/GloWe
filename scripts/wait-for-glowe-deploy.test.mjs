import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { hashedAssetUrls, deployedVersion, probeDeploy } from './wait-for-glowe-deploy.mjs';

const BASE = 'https://example.pages.dev/glowe/';
const HTML = `<!doctype html><link rel="stylesheet" href="css/glowe.38f6b76a.css">
<link rel="preload" as="image" href="assets/glowe-bridge.webp">
<script src="js/glowe-version.25bcf85f.js" defer></script><script src="js/app.js" defer></script>`;

function fakeFetch(routes) {
  return async (url) => {
    const r = routes[url];
    if (!r) return { ok: false, status: 404, headers: new Headers(), text: async () => '' };
    return {
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': r.type }),
      text: async () => r.body,
    };
  };
}

const liveRoutes = {
  [BASE]: { type: 'text/html', body: HTML },
  [`${BASE}css/glowe.38f6b76a.css`]: { type: 'text/css; charset=utf-8', body: '@layer tokens{}' },
  [`${BASE}js/glowe-version.25bcf85f.js`]: { type: 'application/javascript', body: "root.GloweAppVersion={version:'1.5.0'};" },
};

describe('wait-for-glowe-deploy', () => {
  it('lists only hashed css/js references, resolved against the site root', () => {
    assert.deepEqual(hashedAssetUrls(HTML, BASE), [
      `${BASE}css/glowe.38f6b76a.css`,
      `${BASE}js/glowe-version.25bcf85f.js`,
    ]);
  });

  it('reads the deployed version stamp', () => {
    assert.equal(deployedVersion("root.GloweAppVersion = { version: '1.5.0' };"), '1.5.0');
    // esbuild output
    assert.equal(deployedVersion('(function(e){e.GloweAppVersion={version:"1.5.0"}})(self);'), '1.5.0');
    assert.equal(deployedVersion('nothing here'), null);
  });

  it('is ready when every hashed asset resolves with its MIME type and the version matches', async () => {
    const res = await probeDeploy(BASE, { fetch: fakeFetch(liveRoutes), version: '1.5.0' });
    assert.deepEqual(res, { ok: true, assets: 2 });
  });

  it('is not ready while new HTML points at a stylesheet the CDN still 404s', async () => {
    const routes = { ...liveRoutes };
    delete routes[`${BASE}css/glowe.38f6b76a.css`];
    const res = await probeDeploy(BASE, { fetch: fakeFetch(routes) });
    assert.equal(res.ok, false);
    assert.match(res.reason, /glowe\.38f6b76a\.css HTTP 404/);
  });

  it('is not ready when the SPA fallback serves HTML for a missing asset', async () => {
    const routes = { ...liveRoutes, [`${BASE}css/glowe.38f6b76a.css`]: { type: 'text/html', body: '<!doctype html>' } };
    const res = await probeDeploy(BASE, { fetch: fakeFetch(routes) });
    assert.equal(res.ok, false);
    assert.match(res.reason, /served as text\/html/);
  });

  it('is not ready while the previous version is still deployed', async () => {
    const res = await probeDeploy(BASE, { fetch: fakeFetch(liveRoutes), version: '1.5.1' });
    assert.equal(res.ok, false);
    assert.match(res.reason, /deployed version 1\.5\.0, want 1\.5\.1/);
  });
});
