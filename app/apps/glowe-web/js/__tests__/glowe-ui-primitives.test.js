import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import P from '../ui/glowe-ui-primitives.js';

const siteDir = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel) => readFileSync(resolve(siteDir, rel), 'utf8');

describe('GloweUiPrimitives — buttonHtml', () => {
    it('emits the .btn family with variant and size', () => {
        expect(P.buttonHtml({ label: 'Save', variant: 'outline', size: 'small' }))
            .toBe('<button type="button" class="btn btn-outline btn-small">Save</button>');
    });

    it('falls back to primary for unknown variants and drops unknown sizes', () => {
        const html = P.buttonHtml({ label: 'Go', variant: 'fancy', size: 'sm' });
        expect(html).toContain('class="btn btn-primary"');
        expect(html).not.toContain('btn-sm');
    });

    it('escapes labels and attribute values', () => {
        const html = P.buttonHtml({ label: '<b>x</b>', onclick: 'go("a")' });
        expect(html).toContain('&lt;b&gt;x&lt;/b&gt;');
        expect(html).toContain('onclick="go(&quot;a&quot;)"');
    });

    it('renders an anchor when href is given', () => {
        const html = P.buttonHtml({ label: 'Open', href: 'pages/x.html', block: true });
        expect(html.startsWith('<a ')).toBe(true);
        expect(html).toContain('class="btn btn-primary btn-block"');
        expect(html).toContain('href="pages/x.html"');
    });

    it('supports submit buttons, disabled state and extra attrs', () => {
        const html = P.buttonHtml({ label: 'Post', type: 'submit', disabled: true, attrs: { 'data-id': '7', hidden: false } });
        expect(html).toContain('type="submit"');
        expect(html).toContain(' disabled');
        expect(html).toContain('data-id="7"');
        expect(html).not.toContain('hidden');
    });
});

describe('GloweUiPrimitives — iconButtonHtml', () => {
    it('is a small ghost .btn-icon with an accessible name', () => {
        const html = P.iconButtonHtml({ icon: '<svg></svg>', label: 'Settings' });
        expect(html).toContain('class="btn btn-ghost btn-small btn-icon"');
        expect(html).toContain('aria-label="Settings"');
        expect(html).toContain('title="Settings"');
        expect(html).toContain('<svg></svg>');
        expect(html).not.toContain('>Settings<');
    });
});

describe('GloweUiPrimitives — emptyStateHtml / loadingStateHtml', () => {
    it('keeps the legacy empty-state structure the i18n observer localizes', () => {
        expect(P.emptyStateHtml({ title: 'No wishes yet', body: 'Be first.' }))
            .toBe('<div class="empty-state"><h3>No wishes yet</h3><p>Be first.</p></div>');
    });

    it('adds icon, compact class and an action from a button bag', () => {
        const html = P.emptyStateHtml({ icon: 'No results', title: 'T', compact: true, className: 'x', action: { label: 'Reset', onclick: 'reset()' } });
        expect(html).toContain('class="empty-state compact-empty x"');
        expect(html).toContain('<div class="empty-state-icon">No results</div>');
        expect(html).toContain('<button type="button" class="btn btn-primary btn-small" onclick="reset()">Reset</button>');
    });

    it('accepts prebuilt action HTML verbatim', () => {
        const html = P.emptyStateHtml({ title: 'T', action: '<a class="btn btn-outline" href="a.html">Back</a>' });
        expect(html).toContain('<a class="btn btn-outline" href="a.html">Back</a>');
    });

    it('loading state exposes role=status and the .loading-state hook', () => {
        expect(P.loadingStateHtml('Loading…'))
            .toBe('<div class="empty-state loading-state" role="status" aria-busy="true"><p class="muted-note">Loading…</p></div>');
    });
});

describe('GloweUiPrimitives — badgeHtml / menuItemHtml', () => {
    it('badge tones map to design-system classes', () => {
        expect(P.badgeHtml({ label: 3 })).toBe('<span class="badge">3</span>');
        expect(P.badgeHtml({ label: 'new', tone: 'neutral' })).toContain('class="badge badge-neutral"');
    });

    it('menu items are buttons by default, anchors with href, danger opt-in', () => {
        expect(P.menuItemHtml({ label: 'Report', onclick: 'r()' }))
            .toBe('<button type="button" class="menu__item" onclick="r()">Report</button>');
        expect(P.menuItemHtml({ label: 'Delete', danger: true })).toContain('menu__item menu__item--danger');
        expect(P.menuItemHtml({ label: 'Open', href: 'x.html' })).toMatch(/^<a class="menu__item" href="x.html">Open<\/a>$/);
    });
});

describe('GloweUiPrimitives — wiring', () => {
    it('loads before app.js on every page via the shared scripts partial', () => {
        const partial = read('partials/scripts-core.html');
        const prim = partial.indexOf('js/ui/glowe-ui-primitives.js');
        const app = partial.indexOf('js/app.js');
        expect(prim).toBeGreaterThan(-1);
        if (app > -1) expect(prim).toBeLessThan(app);
    });

    it('app.js no longer hand-writes loading placeholders', () => {
        const app = read('js/app.js');
        expect(app).not.toMatch(/<div class="empty-state loading-state"/);
    });
});
