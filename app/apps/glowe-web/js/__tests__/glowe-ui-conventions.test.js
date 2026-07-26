import { describe, it, expect } from 'vitest';
import GloweUiConventions from '../glowe-ui-conventions.js';

describe('GloweUiConventions', () => {
    it('exposes a reserved translation toggle slot', () => {
        expect(GloweUiConventions.translationToggleSlotHtml()).toContain('tr-slot');
    });

    it('uses a stable card-actions class', () => {
        expect(GloweUiConventions.cardActionsClass()).toContain('card-actions--consistent');
    });

    it('shortens save labels', () => {
        expect(GloweUiConventions.saveLabelFor('profile')).toBe('Save');
        expect(GloweUiConventions.SAVE_LABELS.saved).toBe('Saved');
    });

    it('dedupes meta chips case-insensitively', () => {
        expect(GloweUiConventions.uniqueMeta(['Israel', 'israel', 'Global']))
            .toEqual(['Israel', 'Global']);
        expect(GloweUiConventions.uniqueMeta(['Health', 'Health', '']))
            .toEqual(['Health']);
    });

    it('builds a shared directory card shell for org + opportunity + wish', () => {
        expect(GloweUiConventions.directoryCardClass()).toContain('directory-card');
        const html = GloweUiConventions.directoryCardHtml({
            href: 'pages/profile?id=1',
            ariaLabel: 'Open Heart',
            trType: 'glowe_profile',
            trId: '1',
            moreMenuHtml: '<details class="card-more-menu directory-card-more"></details>',
            avatarHtml: GloweUiConventions.avatarWrapHtml('<span class="entity-mark">LP</span>', { verified: true }),
            titleHtml: '<h3>Open Heart</h3>',
            descriptionHtml: '<p>Mission</p>',
            detailsHtml: '<div class="opportunity-details">Israel</div>',
            skillsHtml: '',
            actionsHtml: '<div class="directory-card-actions">Reach Out</div>'
        });
        expect(html).toContain('directory-card-stretch-link');
        expect(html).toContain('directory-verified-tick');
        expect(html).toContain('data-tr-type="glowe_profile"');
        expect(html).toContain('Open Heart');
        expect(html).toContain('directory-card-header-actions');
        expect(html).toContain('directory-card-more');
        expect(html).not.toContain('View Profile');
        expect(html).not.toContain('save-icon-btn');
        // ⋯ menu is inside the header (opposite avatar), not a corner sibling.
        const headerIdx = html.indexOf('opportunity-header');
        const moreIdx = html.indexOf('directory-card-more');
        expect(moreIdx).toBeGreaterThan(headerIdx);
    });

    it('supports stretch-link onclick for modal surfaces (wish detail)', () => {
        const html = GloweUiConventions.directoryCardHtml({
            href: 'wishing-well?wish=9',
            ariaLabel: 'Need mentors',
            stretchOnclick: "event.preventDefault(); openWishDetail('9')",
            moreMenuHtml: '<details class="card-more-menu directory-card-more"></details>',
            avatarHtml: GloweUiConventions.avatarWrapHtml('<span class="entity-mark">AB</span>'),
            titleHtml: '<h3>Need mentors</h3>',
            actionsHtml: '<div class="directory-card-actions">Offer Support</div>'
        });
        expect(html).toContain("openWishDetail('9')");
        expect(html).toContain('directory-card-stretch-link');
        expect(html).not.toContain('heart-button');
        expect(html).not.toContain('wish-save-desktop');
        expect(html).not.toContain('post-share-button');
    });

    it('omits the verified tick when not requested', () => {
        const html = GloweUiConventions.avatarWrapHtml('<span class="entity-mark">HF</span>', { verified: false });
        expect(html).toContain('directory-avatar-wrap');
        expect(html).not.toContain('directory-verified-tick');
    });
});
