// GloWe shell builders (FR-GLOWE-029 Phase 2 / D-190).
//
// Pure, DOM-free HTML builders for the chrome every page shares: primary nav,
// mobile bottom nav, footer, header auth cluster. app.js owns the DOM wiring
// and calls these; partials/*.html carry the same markup for first paint, and
// glowe-ui-shell.test.js asserts the two never drift.
(function (root, factory) {
    const api = factory();
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    root.GloweUiShell = api;
})(typeof self !== 'undefined' ? self : this, function () {
    const PROFILE_PAGES = ['my-applications', 'connections', 'saved', 'settings'];
    const COMMUNITY_PAGES = ['forums', 'discussion-group'];
    const WISHES_PAGES = ['volunteer-network', 'opportunities', 'opportunity'];

    const ICONS = {
        chat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>',
        gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>',
        shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>',
        plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>',
        homeOutline: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>',
        homeFilled: '<svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"></path></svg>',
        starOutline: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>',
        starFilled: '<svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path></svg>',
        peopleOutline: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>',
        peopleFilled: '<svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5C15 14.17 10.33 13 8 13zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"></path></svg>',
        personOutline: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>',
        personFilled: '<svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"></path></svg>'
    };

    /** 'index' for the site root, otherwise the page slug (clean URLs + .html). */
    function resolvePage(pathname) {
        const clean = String(pathname || '/').split(/[?#]/)[0].replace(/\/+$/, '');
        if (!clean.includes('/pages/')) return 'index';
        const seg = clean.split('/').pop().replace(/\.html$/, '');
        return (!seg || seg === 'index') ? 'index' : seg;
    }

    /** Relative-link context: the home page sits one level above pages/*. */
    function linkContext(pathname) {
        const inPages = String(pathname || '').includes('/pages/');
        return {
            inPages: inPages,
            prefix: inPages ? '' : 'pages/',
            homeHref: inPages ? '../index.html' : 'index.html'
        };
    }

    function mainNavLinks(ctx, signedIn) {
        const links = [
            { label: 'Home', href: ctx.homeHref, match: 'index' },
            { label: 'Wishing Well', href: ctx.prefix + 'wishing-well.html', match: 'wishing-well' },
            { label: 'Organizations', href: ctx.prefix + 'organizations.html', match: 'organizations' },
            { label: 'Community', href: ctx.prefix + 'community.html', match: 'community' }
        ];
        // Profile appears in the desktop header only when signed in; Home stays
        // for every session — parity with the mobile bottom-nav Home tab.
        if (signedIn) links.push({ label: 'Profile', href: ctx.prefix + 'my-applications.html', match: 'profile', pages: PROFILE_PAGES });
        links.push({ label: 'About', href: ctx.prefix + 'about.html', match: 'about' });
        return links;
    }

    function isMainNavActive(page, link) {
        if (page === link.match) return true;
        if (Array.isArray(link.pages) && link.pages.includes(page)) return true;
        if (link.match === 'about') return page === 'whats-next';
        if (link.match === 'community') return COMMUNITY_PAGES.includes(page);
        if (link.match === 'wishing-well') return WISHES_PAGES.includes(page);
        return false;
    }

    function navLinkHtml(link, active) {
        return '<a href="' + link.href + '" class="nav-link' + (active ? ' active' : '') + '"'
            + (active ? ' aria-current="page"' : '') + '>' + link.label + '</a>';
    }

    function mainNavHtml(options) {
        const opts = options || {};
        const ctx = linkContext(opts.pathname);
        const page = resolvePage(opts.pathname);
        return mainNavLinks(ctx, Boolean(opts.signedIn))
            .map(function (link) { return navLinkHtml(link, isMainNavActive(page, link)); })
            .join('');
    }

    // A bottom-nav tab also lights up for its sibling pages (community covers
    // the forums cluster + organizations; wishes covers the volunteering cluster).
    function isBottomNavActive(page, match) {
        if (page === match) return true;
        if (match === 'community') return COMMUNITY_PAGES.concat('organizations').includes(page);
        if (match === 'wishing-well') return WISHES_PAGES.includes(page);
        return false;
    }

    function bottomNavLinks(ctx) {
        return [
            { label: 'Home', href: ctx.homeHref, match: 'index', iconOutline: ICONS.homeOutline, iconFilled: ICONS.homeFilled },
            { label: 'Wishes', href: ctx.prefix + 'wishing-well.html', match: 'wishing-well', iconOutline: ICONS.starOutline, iconFilled: ICONS.starFilled },
            { label: 'Community', href: ctx.prefix + 'community.html', match: 'community', iconOutline: ICONS.peopleOutline, iconFilled: ICONS.peopleFilled },
            { label: 'Profile', href: ctx.prefix + 'my-applications.html', match: 'my-applications', iconOutline: ICONS.personOutline, iconFilled: ICONS.personFilled }
        ];
    }

    function bottomNavLinkHtml(link, active) {
        return '<a href="' + link.href + '" class="bottom-nav-link' + (active ? ' active' : '') + '"'
            + (active ? ' aria-current="page"' : '') + '>'
            + '<span class="nav-icon">' + (active ? link.iconFilled : link.iconOutline) + '</span>'
            + '<span class="nav-label">' + link.label + '</span></a>';
    }

    // FR-GLOWE-016 AC3 — the "+" create FAB sits at the center of the bottom nav.
    function bottomNavHtml(options) {
        const opts = options || {};
        const ctx = linkContext(opts.pathname);
        const page = resolvePage(opts.pathname);
        const items = bottomNavLinks(ctx).map(function (link) {
            return bottomNavLinkHtml(link, isBottomNavActive(page, link.match));
        });
        const fab = '<button type="button" class="btn btn-fab bottom-nav-create" aria-label="Create" onclick="openCreateMenu()">' + ICONS.plus + '</button>';
        return items.slice(0, 2).join('') + fab + items.slice(2).join('');
    }

    /** App-wide semver from glowe-version.js (FR-GLOWE-025). */
    function versionLabel(version) {
        return (typeof version === 'string' && /^\d+\.\d+\.\d+$/.test(version)) ? 'v' + version : 'v0.0.0-local';
    }

    function footerHtml(options) {
        const opts = options || {};
        const ctx = opts.prefix !== undefined
            ? { prefix: opts.prefix, homeHref: opts.homeHref }
            : linkContext(opts.pathname);
        const p = ctx.prefix;
        const yearPrefix = opts.year ? opts.year + ' ' : '';
        return '<div class="container">'
            + '<div class="footer-grid">'
            + '<div class="footer-section"><h3>GloWe</h3>'
            + '<p>Bridging local solutions to global challenges through shared knowledge, solidarity, and practical action.</p></div>'
            + '<div class="footer-section"><h3>Explore</h3>'
            + '<a href="' + ctx.homeHref + '">Home</a>'
            + '<a href="' + p + 'wishing-well.html">Wishing Well</a>'
            + '<a href="' + p + 'organizations.html">Organizations</a>'
            + '<a href="' + p + 'community.html">Community</a>'
            + '<a href="' + p + 'forums.html">Forums</a>'
            + '<a href="' + p + 'about.html">About</a></div>'
            + '<div class="footer-section"><h3>Participate</h3>'
            + '<a href="' + p + 'my-applications.html">Personal Area</a>'
            + '<a href="' + p + 'community.html#community-composer">Write a post</a>'
            + '<a href="' + p + 'volunteer-network.html">Volunteer Network</a>'
            + '<a href="' + p + 'whats-next.html">What\'s next</a></div>'
            + '<div class="footer-section"><h3>Built With Care</h3>'
            + '<p>An MVP by the GloWe community, with product and implementation support by Topaz.</p>'
            + '<a href="' + p + 'terms.html">Terms &amp; Community Charter</a>'
            + '<a href="' + p + 'privacy.html">Privacy Policy</a>'
            + '<a href="' + p + 'accessibility.html">Accessibility</a></div>'
            + '</div>'
            + '<div class="footer-bottom">'
            + '<p>' + yearPrefix + 'GloWe. Built for shared knowledge, mutual support, and action that lasts.</p>'
            + '<p class="footer-build" translate="no">' + (opts.versionLabel || '') + '</p>'
            + '</div></div>';
    }

    /** Signed-in header cluster: Create + icon actions (Messages, Settings). */
    function userMenuHtml(prefix) {
        const p = prefix || '';
        return '<button class="btn btn-primary btn-small header-create-btn" type="button" onclick="openCreateMenu()">+ Create</button>'
            + '<div class="header-corner-actions">'
            + '<a class="btn btn-icon btn-small header-icon-btn" href="' + p + 'messages.html" aria-label="Messages" title="Messages">' + ICONS.chat + '</a>'
            + '<a class="btn btn-icon btn-small header-icon-btn" href="' + p + 'settings.html" aria-label="Settings" title="Settings">' + ICONS.gear + '</a>'
            + '</div>';
    }

    function authButtonsHtml(label) {
        return '<button class="btn btn-primary btn-small" type="button" onclick="handleGoogleSignIn()">' + (label || 'Sign up / Sign in') + '</button>';
    }

    return {
        ICONS: ICONS,
        PROFILE_PAGES: PROFILE_PAGES,
        resolvePage: resolvePage,
        linkContext: linkContext,
        mainNavLinks: mainNavLinks,
        isMainNavActive: isMainNavActive,
        mainNavHtml: mainNavHtml,
        bottomNavLinks: bottomNavLinks,
        isBottomNavActive: isBottomNavActive,
        bottomNavHtml: bottomNavHtml,
        versionLabel: versionLabel,
        footerHtml: footerHtml,
        userMenuHtml: userMenuHtml,
        authButtonsHtml: authButtonsHtml
    };
});
