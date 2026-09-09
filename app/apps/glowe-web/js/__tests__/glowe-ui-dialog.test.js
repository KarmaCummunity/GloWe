import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import GloweUiDialog from '../ui/glowe-ui-dialog.js';

const siteDir = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel) => readFileSync(resolve(siteDir, rel), 'utf8');

describe('GloweUiDialog — confirm markup', () => {
    it('renders an alertdialog wired to its title and message', () => {
        const html = GloweUiDialog.confirmHtml({ title: 'Delete post', message: 'Sure?' });
        expect(html).toContain('role="alertdialog"');
        expect(html).toContain('aria-labelledby="glowe-confirm-modal-title"');
        expect(html).toContain('aria-describedby="glowe-confirm-modal-message"');
        expect(html).toContain('<h2 id="glowe-confirm-modal-title">Delete post</h2>');
        expect(html).toContain('Sure?');
    });

    it('uses the shared modal shell and .btn family only', () => {
        const html = GloweUiDialog.confirmHtml({});
        expect(html).toContain('class="modal"');
        expect(html).toContain('class="modal-content modal-confirm"');
        expect(html).toContain('class="btn btn-outline" data-confirm="cancel"');
        expect(html).toContain('class="btn btn-primary" data-confirm="ok"');
        expect(html).not.toMatch(/style=/);
    });

    it('switches the primary action to the danger variant and escapes copy', () => {
        const html = GloweUiDialog.confirmHtml({ danger: true, message: '<b>x</b> & "y"', confirmLabel: 'Delete' });
        expect(html).toContain('class="btn btn-danger" data-confirm="ok"');
        expect(html).toContain('&lt;b&gt;x&lt;/b&gt; &amp; &quot;y&quot;');
        expect(html).toContain('>Delete</button>');
    });
});

describe('GloweUiDialog — no-DOM fallback', () => {
    it('resolves false without a document or window.confirm', async () => {
        await expect(GloweUiDialog.confirm('anything')).resolves.toBe(false);
    });

    it('exposes the body scroll-lock class used by components/modal.css', () => {
        expect(GloweUiDialog.BODY_OPEN_CLASS).toBe('glowe-modal-open');
        expect(read('css/components/modal.css')).toContain('body.glowe-modal-open');
    });
});

describe('GloWe modals — call sites', () => {
    it('no window.confirm remains outside the dialog fallback', () => {
        for (const rel of ['js/app.js', 'js/glowe-follow-ui.js']) {
            const src = read(rel).split('\n');
            const offenders = src.filter((line) => /window\.confirm\(/.test(line) && !/Promise\.resolve|GloweUiDialog/.test(line));
            expect(offenders, rel).toEqual([]);
        }
    });

    it('close controls are real buttons with an accessible name', () => {
        for (const rel of ['js/app.js', 'js/glowe-guest.js', 'js/glowe-dev-auth.js', 'index.html']) {
            expect(read(rel), rel).not.toMatch(/<span class="close-modal"/);
        }
        expect(read('js/app.js')).toMatch(/<button type="button" class="close-modal" aria-label="Close"/);
    });

    it('every page loads the dialog module with the shell', () => {
        expect(read('partials/scripts-core.html')).toMatch(/js\/ui\/glowe-ui-dialog\.js/);
    });
});
