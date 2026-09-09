import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import GloweUiShell from '../ui/glowe-ui-shell.js';

const siteDir = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const partial = (name) => readFileSync(resolve(siteDir, 'partials', name), 'utf8');

/** Collapse whitespace between tags so hand-formatted partials compare to builder output. */
function normalize(html) {
    return html.replace(/>\s+</g, '><').replace(/\s+/g, ' ').trim();
}

describe('GloweUiShell — page resolution', () => {
    it('maps root and clean URLs to page slugs', () => {
        expect(GloweUiShell.resolvePage('/glowe/')).toBe('index');
        expect(GloweUiShell.resolvePage('/glowe/index.html')).toBe('index');
        expect(GloweUiShell.resolvePage('/glowe/pages/settings')).toBe('settings');
        expect(GloweUiShell.resolvePage('/glowe/pages/wishing-well.html?x=1#y')).toBe('wishing-well');
        expect(GloweUiShell.resolvePage(undefined)).toBe('index');
    });

    it('derives relative link prefixes from the current path', () => {
        expect(GloweUiShell.linkContext('/glowe/index.html')).toEqual({ inPages: false, prefix: 'pages/', homeHref: 'index.html' });
        expect(GloweUiShell.linkContext('/glowe/pages/about.html')).toEqual({ inPages: true, prefix: '', homeHref: '../index.html' });
    });
});

describe('GloweUiShell — primary nav', () => {
    it('shows Profile only when signed in and keeps Home for every session', () => {
        const ctx = GloweUiShell.linkContext('/glowe/pages/about.html');
        const guest = GloweUiShell.mainNavLinks(ctx, false).map(l => l.label);
        const member = GloweUiShell.mainNavLinks(ctx, true).map(l => l.label);
        expect(guest).toEqual(['Home', 'Wishing Well', 'Organizations', 'Community', 'About']);
        expect(member).toEqual(['Home', 'Wishing Well', 'Organizations', 'Community', 'Profile', 'About']);
    });

    it('lights the parent tab for sibling pages', () => {
        const profile = { match: 'profile', pages: GloweUiShell.PROFILE_PAGES };
        expect(GloweUiShell.isMainNavActive('settings', profile)).toBe(true);
        expect(GloweUiShell.isMainNavActive('forums', { match: 'community' })).toBe(true);
        expect(GloweUiShell.isMainNavActive('opportunity', { match: 'wishing-well' })).toBe(true);
        expect(GloweUiShell.isMainNavActive('whats-next', { match: 'about' })).toBe(true);
        expect(GloweUiShell.isMainNavActive('about', { match: 'community' })).toBe(false);
    });

    it('renders exactly one aria-current link', () => {
        const html = GloweUiShell.mainNavHtml({ pathname: '/glowe/pages/forums.html', signedIn: true });
        expect(html.match(/aria-current="page"/g)).toHaveLength(1);
        expect(html).toContain('href="community.html" class="nav-link active" aria-current="page"');
    });

    it('matches the static header partial for a guest on the home page', () => {
        const fromPartial = partial('header.html')
            .replace(/\{\{home\}\}/g, 'index.html')
            .replace(/\{\{pages\}\}/g, 'pages/')
            .replace(/\{\{active:index\}\}/g, ' active" aria-current="page')
            .replace(/\{\{active:[a-z-]+\}\}/g, '');
        const navFromPartial = normalize(fromPartial.match(/<nav class="main-nav"[^>]*>([\s\S]*?)<\/nav>/)[1]);
        expect(navFromPartial).toBe(normalize(GloweUiShell.mainNavHtml({ pathname: '/glowe/index.html', signedIn: false })));
        const authFromPartial = normalize(fromPartial.match(/<div class="auth-buttons">([\s\S]*?)<\/div>/)[1]);
        expect(authFromPartial).toBe(normalize(GloweUiShell.authButtonsHtml()));
        expect(fromPartial).not.toContain('style=');
    });
});

describe('GloweUiShell — bottom nav', () => {
    it('places the create FAB between Wishes and Community', () => {
        const html = GloweUiShell.bottomNavHtml({ pathname: '/glowe/pages/community.html' });
        const order = [...html.matchAll(/class="([^"]*\b(?:bottom-nav-link|bottom-nav-create)\b[^"]*)"/g)]
            .map(m => m[1].includes('bottom-nav-create') ? 'bottom-nav-create' : 'bottom-nav-link');
        expect(order).toEqual(['bottom-nav-link', 'bottom-nav-link', 'bottom-nav-create', 'bottom-nav-link', 'bottom-nav-link']);
    });

    it('renders the create FAB as a .btn variant', () => {
        const html = GloweUiShell.bottomNavHtml({ pathname: '/glowe/pages/community.html' });
        expect(html).toContain('class="btn btn-fab bottom-nav-create"');
    });

    it('activates the community tab for forums and organizations', () => {
        expect(GloweUiShell.isBottomNavActive('organizations', 'community')).toBe(true);
        expect(GloweUiShell.isBottomNavActive('discussion-group', 'community')).toBe(true);
        expect(GloweUiShell.isBottomNavActive('volunteer-network', 'wishing-well')).toBe(true);
        expect(GloweUiShell.isBottomNavActive('settings', 'my-applications')).toBe(false);
    });

    it('swaps to the filled icon on the active tab only', () => {
        const html = GloweUiShell.bottomNavHtml({ pathname: '/glowe/index.html' });
        expect(html).toContain(GloweUiShell.ICONS.homeFilled);
        expect(html).not.toContain(GloweUiShell.ICONS.homeOutline);
        expect(html).toContain(GloweUiShell.ICONS.starOutline);
    });
});

describe('GloweUiShell — footer + header cluster', () => {
    it('formats the build label from a semver string only', () => {
        expect(GloweUiShell.versionLabel('1.4.9')).toBe('v1.4.9');
        expect(GloweUiShell.versionLabel('dev')).toBe('v0.0.0-local');
        expect(GloweUiShell.versionLabel(undefined)).toBe('v0.0.0-local');
    });

    it('matches the static footer partial (placeholders, no year/version)', () => {
        const fromPartial = normalize(partial('footer.html').match(/<footer class="main-footer">([\s\S]*)<\/footer>/)[1]);
        const built = normalize(GloweUiShell.footerHtml({ prefix: '{{pages}}', homeHref: '{{home}}' }));
        expect(built).toBe(fromPartial);
    });

    it('prefixes the year and version at runtime', () => {
        const html = GloweUiShell.footerHtml({ pathname: '/glowe/pages/about.html', year: 2026, versionLabel: 'v1.4.9' });
        expect(html).toContain('<p>2026 GloWe.');
        expect(html).toContain('translate="no">v1.4.9</p>');
        expect(html).toContain('href="../index.html"');
        expect(html).toContain('href="terms.html"');
    });

    it('builds the signed-in cluster with Messages and Settings links', () => {
        const html = GloweUiShell.userMenuHtml('pages/');
        expect(html).toContain('href="pages/messages.html" aria-label="Messages"');
        expect(html).toContain('href="pages/settings.html" aria-label="Settings"');
        expect(html).toContain('header-create-btn');
    });
});
