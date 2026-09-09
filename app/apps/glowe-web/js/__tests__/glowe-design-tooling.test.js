// Design-system tooling (FR-GLOWE-029 / D-190): CSS guard + shell sync.
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
    lintCssSource,
    lintHtmlSource,
    checkGloweSite,
    BANNED_FILES,
} from '../../../../scripts/check-glowe-css.mjs';
import {
    renderPartial,
    stampPage,
    heroPhotoFor,
    activeNavFor,
    pageContext,
    syncShell,
    BLOCKS,
} from '../../../../scripts/glowe-sync-shell.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const siteDir = resolve(here, '..', '..');

describe('check-glowe-css guard', () => {
    it('allows raw colors only in tokens.css', () => {
        expect(lintCssSource(':root { --x: #147c75; --y: rgba(0,0,0,.5); }', 'tokens.css')).toEqual([]);
        const bad = lintCssSource('.a { color: #147c75; background: rgb(1,2,3); }', 'components/x.css');
        expect(bad).toHaveLength(2);
        expect(bad[0]).toMatch(/raw color "#147c75"/);
    });

    it('ignores colors inside comments and data URLs', () => {
        const css = '/* #ffffff */ .a { background-image: url("data:image/svg+xml;utf8,<svg fill=\'%23fff\' stroke=\'rgb(1,1,1)\'/>"); }';
        expect(lintCssSource(css, 'components/x.css')).toEqual([]);
    });

    it('rejects !important outside base/utilities', () => {
        expect(lintCssSource('.a { display: none !important; }', 'base.css')).toEqual([]);
        expect(lintCssSource('.a { display: none !important; }', 'components/x.css')[0]).toMatch(/!important/);
    });

    it('rejects off-scale breakpoints and accepts the canonical set', () => {
        expect(lintCssSource('@media (max-width: 767px) { .a { gap: 0; } }', 'layout/x.css')).toEqual([]);
        expect(lintCssSource('@media (min-width: 1024px) and (hover: hover) { .a { gap: 0; } }', 'layout/x.css')).toEqual([]);
        const bad = lintCssSource('@media (max-width: 680px) { .a { gap: 0; } }', 'layout/x.css');
        expect(bad[0]).toMatch(/off-scale breakpoint "\(max-width: 680px\)"/);
    });

    it('rejects render-blocking remote @import and oversized files', () => {
        expect(lintCssSource("@import url('https://fonts.googleapis.com/css2?family=X');", 'base.css')[0]).toMatch(/render-blocking/);
        const big = Array.from({ length: 301 }, () => '.a{}').join('\n');
        expect(lintCssSource(big, 'components/x.css')[0]).toMatch(/exceeds 300/);
    });

    it('keeps asset url()s (direct or via tokens) out of nested sheets', () => {
        const nested = lintCssSource(".a{background:url('../x.webp')}\n.b{background:var(--page-photo)}", 'css/components/x.css');
        expect(nested).toHaveLength(2);
        expect(nested[0]).toMatch(/relative url\(\)/);
        expect(nested[1]).toMatch(/--page-photo/);
        expect(lintCssSource(".a{background:url('../x.webp')}\n.b{background:var(--page-photo)}", 'css/layout-x.css')).toEqual([]);
        expect(lintCssSource('.s{background-image:url("data:image/svg+xml;utf8,<svg/>")}', 'css/components/forms.css')).toEqual([]);
    });

    it('bans the retired legacy stylesheets outright', () => {
        expect(BANNED_FILES.has('legacy.css')).toBe(true);
        expect(lintCssSource('.a { color: var(--text-muted) }', 'legacy.css')[0]).toMatch(/retired/);
        expect(lintCssSource('.a { color: var(--text-muted) }', 'legacy-responsive.css')[0]).toMatch(/retired/);
    });

    it('applies the raw-color and !important rules to every sheet', () => {
        expect(lintCssSource('@media (max-width: 1023px) { .a { color: #fff !important } }', 'pages/x.css')).toEqual([
            expect.stringMatching(/raw color/),
            expect.stringMatching(/!important/),
        ]);
    });

    it('pages link only css/glowe.css', () => {
        expect(lintHtmlSource('<link rel="stylesheet" href="../css/glowe.css">', 'pages/a.html')).toEqual([]);
        expect(lintHtmlSource('<link rel="stylesheet" href="../css/styles.css">', 'pages/a.html')[0]).toMatch(/only css\/glowe\.css/);
    });

    it('the checked-in site passes the guard', () => {
        expect(checkGloweSite(siteDir)).toEqual([]);
    });
});

describe('glowe-sync-shell', () => {
    it('maps sibling pages onto their top-nav tab like app.js does', () => {
        expect(activeNavFor('index')).toBe('index');
        expect(activeNavFor('volunteer-network')).toBe('wishing-well');
        expect(activeNavFor('forums')).toBe('community');
        expect(activeNavFor('whats-next')).toBe('about');
        expect(activeNavFor('settings')).toBeNull();
    });

    it('resolves relative roots for the index vs nested pages', () => {
        expect(pageContext('index.html')).toEqual({ slug: 'index', root: '', pages: 'pages/', home: 'index.html', heroPhoto: null });
        expect(pageContext('pages/community.html')).toMatchObject({ slug: 'community', root: '../', pages: '', home: '../index.html' });
    });

    it('renders placeholders and the active tab', () => {
        const tpl = '<a href="{{home}}" class="nav-link{{active:index}}">Home</a><a href="{{pages}}about.html" class="nav-link{{active:about}}">About</a><script src="{{root}}js/app.js"></script>';
        const html = renderPartial(tpl, pageContext('pages/about.html'));
        expect(html).toContain('href="../index.html" class="nav-link">Home</a>');
        expect(html).toContain('class="nav-link active" aria-current="page">About</a>');
        expect(html).toContain('src="../js/app.js"');
    });

    it('preloads the hero photo only for pages with a static photo band', () => {
        const withBand = '<body class="about-page-body"><section class="page-header"></section></body>';
        const homeHero = '<body class="home-page-body"><section class="hero impact-home-hero"></section></body>';
        const fallback = '<body class="community-page-body"><section class="page-header"></section></body>';
        const noBand = '<body class="community-page-body"><main></main></body>';
        expect(heroPhotoFor(withBand)).toBe('glowe-blossoms');
        expect(heroPhotoFor(homeHero)).toBe('glowe-bridge');
        expect(heroPhotoFor(fallback)).toBe('glowe-regrowth');
        expect(heroPhotoFor(noBand)).toBeNull();

        const tpl = '<meta>\n    {{hero-preload}}\n    <link rel="stylesheet" href="{{root}}css/glowe.css">';
        expect(renderPartial(tpl, pageContext('pages/about.html', withBand))).toBe([
            '<meta>',
            '    <link rel="preload" as="image" href="../assets/glowe-blossoms-m.webp" media="(max-width: 767px)" fetchpriority="high">',
            '    <link rel="preload" as="image" href="../assets/glowe-blossoms.webp" media="(min-width: 768px)" fetchpriority="high">',
            '    <link rel="stylesheet" href="../css/glowe.css">',
        ].join('\n'));
        expect(renderPartial(tpl, pageContext('pages/community.html', noBand))).toBe(
            '<meta>\n    <link rel="stylesheet" href="../css/glowe.css">',
        );
    });

    it('replaces only marked blocks and leaves the rest of the page intact', () => {
        const page = [
            '<body>',
            '    <!-- glowe:header:start -->',
            '    <header>stale</header>',
            '    <!-- glowe:header:end -->',
            '    <main>keep me</main>',
            '</body>',
        ].join('\n');
        const partials = Object.fromEntries(BLOCKS.map(b => [b, `<${b} data-root="{{root}}"></${b}>`]));
        const { html, stamped } = stampPage(page, 'pages/x.html', partials);
        expect(stamped).toEqual(['header']);
        expect(html).toContain('<header data-root="../"></header>');
        expect(html).toContain('<main>keep me</main>');
        expect(html).not.toContain('stale');
    });

    it('every checked-in page is in sync with the partials', () => {
        const { changed, unmarked } = syncShell(siteDir, { check: true });
        expect(changed).toEqual([]);
        expect(unmarked).toEqual([]);
    });

    it('the header partial matches the shell app.js renders (no second paint)', () => {
        const header = readFileSync(resolve(siteDir, 'partials', 'header.html'), 'utf8');
        for (const label of ['Home', 'Wishing Well', 'Organizations', 'Community', 'About']) {
            expect(header).toContain(`>${label}</a>`);
        }
        expect(header).not.toContain('Forums');
        expect(existsSync(resolve(siteDir, 'css', 'glowe.css'))).toBe(true);
    });
});
