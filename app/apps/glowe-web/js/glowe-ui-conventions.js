// GloWe UI conventions — shared card chrome (FR-TRANSLATE-005 / FR-GLOWE-*).
//
// Keep visual contracts in one place so every surface (org, post, wish,
// opportunity, comment) places translation toggles and action rows the same way.
(function (root, factory) {
    const api = factory();
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    root.GloweUiConventions = api;
})(typeof self !== 'undefined' ? self : this, function () {
    const VERIFIED_TICK_SVG = '<svg viewBox="0 0 16 16" width="10" height="10" aria-hidden="true" focusable="false"><path fill="currentColor" d="M6.2 11.4 2.8 8l1.1-1.1 2.3 2.3 5-5L12.3 5.3z"/></svg>';

    // Reserved slot for the "Show original" / "Show translation" control.
    // Place immediately under the card header / author row, before title/body.
    function translationToggleSlotHtml() {
        return '<div class="tr-slot" aria-live="polite"></div>';
    }

    // Stable action-row class: CSS grid keeps View / primary / Save aligned
    // whether the save label is "Save" or "Saved".
    function cardActionsClass() {
        return 'card-actions card-actions--consistent';
    }

    // Directory listing cards (org + opportunity + wish) share one chrome class.
    function directoryCardClass() {
        return 'opportunity-card directory-card';
    }

    function directoryActionsClass() {
        return 'card-actions directory-card-actions';
    }

    // Short save labels so org/opportunity footers share one layout.
    const SAVE_LABELS = {
        profile: 'Save',
        post: 'Save',
        opportunity: 'Save',
        wish: 'Save',
        saved: 'Saved'
    };

    function saveLabelFor(kind) {
        return SAVE_LABELS[kind] || 'Save';
    }

    // Drop duplicate adjacent meta chips (e.g. location === scope → "Israel Israel").
    function uniqueMeta(values) {
        const seen = {};
        const out = [];
        (values || []).forEach(function (raw) {
            const v = String(raw == null ? '' : raw).trim();
            if (!v) return;
            const key = v.toLowerCase();
            if (seen[key]) return;
            seen[key] = true;
            out.push(v);
        });
        return out;
    }

    function escapeAttr(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    // Tiny verified tick for approved org avatars (replaces a text "Verified" pill).
    function verifiedTickHtml() {
        return '<span class="directory-verified-tick" role="img" aria-label="Verified">' + VERIFIED_TICK_SVG + '</span>';
    }

    // Wrap an entity-mark / avatar with an optional verified tick.
    function avatarWrapHtml(innerHtml, options) {
        const opts = options || {};
        const verified = Boolean(opts.verified);
        const title = verified ? ' title="Verified"' : '';
        return '<span class="directory-avatar-wrap"' + title + '>'
            + (innerHtml || '')
            + (verified ? verifiedTickHtml() : '')
            + '</span>';
    }

    // Full-card hit target. Interactive chrome must sit above (z-index) this link.
    // Optional onclick (already trusted JS) for modal surfaces like wish detail.
    function stretchLinkHtml(href, ariaLabel, options) {
        const opts = options || {};
        const on = opts.onclick
            ? ' onclick="' + escapeAttr(opts.onclick) + '"'
            : '';
        return '<a class="directory-card-stretch-link" href="' + escapeAttr(href || '#')
            + '" aria-label="' + escapeAttr(ariaLabel || '') + '"' + on + '></a>';
    }

    // Shared header row: avatar (+ optional tick) | trailing chrome (⋯ menu).
    // Trailing sits opposite the avatar via flex space-between (RTL-safe).
    function directoryHeaderHtml(avatarHtml, trailingHtml) {
        return '<div class="opportunity-header">'
            + '<div class="opportunity-org">' + (avatarHtml || '') + '</div>'
            + '<div class="directory-card-header-actions">' + (trailingHtml || '') + '</div>'
            + '</div>';
    }

    // Assemble a directory listing card (org / opportunity / wish) from named slots.
    // Callers supply already-escaped / trusted HTML for each slot.
    // moreMenuHtml lands in the header (opposite the avatar) — not corner-absolute.
    function directoryCardHtml(spec) {
        const s = spec || {};
        const trAttrs = (s.trType && s.trId != null)
            ? ' data-tr-card data-tr-type="' + escapeAttr(s.trType) + '" data-tr-id="' + escapeAttr(String(s.trId)) + '"'
            : '';
        const trailing = (s.headerActionsHtml || '') + (s.moreMenuHtml || '');
        return '<article class="' + directoryCardClass() + '"' + trAttrs + '>'
            + stretchLinkHtml(s.href, s.ariaLabel, { onclick: s.stretchOnclick })
            + directoryHeaderHtml(s.avatarHtml, trailing)
            + translationToggleSlotHtml()
            + (s.titleHtml || '')
            + (s.descriptionHtml || '')
            + (s.detailsHtml || '')
            + (s.skillsHtml || '')
            + (s.actionsHtml || '')
            + '</article>';
    }

    return {
        translationToggleSlotHtml: translationToggleSlotHtml,
        cardActionsClass: cardActionsClass,
        directoryCardClass: directoryCardClass,
        directoryActionsClass: directoryActionsClass,
        saveLabelFor: saveLabelFor,
        uniqueMeta: uniqueMeta,
        SAVE_LABELS: SAVE_LABELS,
        verifiedTickHtml: verifiedTickHtml,
        avatarWrapHtml: avatarWrapHtml,
        stretchLinkHtml: stretchLinkHtml,
        directoryHeaderHtml: directoryHeaderHtml,
        directoryCardHtml: directoryCardHtml
    };
});
