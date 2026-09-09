// GloWe UI primitives (FR-GLOWE-029 Phase 3 / D-190).
//
// Tiny HTML builders for the design-system atoms so page code never writes a
// `<button class="btn …">` or `<div class="empty-state">` literal by hand. Every
// builder escapes text, emits only design-system classes and keeps the exact
// markup the i18n MutationObserver and the E2E selectors already rely on.
(function (root, factory) {
    const api = factory(root);
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    root.GloweUiPrimitives = api;
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    const VARIANTS = ['primary', 'secondary', 'outline', 'ghost', 'danger', 'link'];
    const SIZES = ['small', 'large'];

    function esc(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function classes() {
        const out = [];
        for (let i = 0; i < arguments.length; i++) {
            const part = arguments[i];
            if (!part) continue;
            String(part).split(/\s+/).forEach(function (c) { if (c && out.indexOf(c) === -1) out.push(c); });
        }
        return out.join(' ');
    }

    // Serialize an attribute bag: { 'data-id': 'x', disabled: true, hidden: false }.
    function attrs(bag) {
        if (!bag) return '';
        return Object.keys(bag).reduce(function (acc, key) {
            const v = bag[key];
            if (v === false || v == null) return acc;
            if (v === true) return acc + ' ' + key;
            return acc + ' ' + key + '="' + esc(v) + '"';
        }, '');
    }

    function btnClass(opts) {
        const variant = VARIANTS.indexOf(opts.variant) === -1 ? 'primary' : opts.variant;
        return classes(
            'btn',
            'btn-' + variant,
            SIZES.indexOf(opts.size) === -1 ? '' : 'btn-' + opts.size,
            opts.block ? 'btn-block' : '',
            opts.pill ? 'btn-pill' : '',
            opts.icon && !opts.label ? 'btn-icon' : '',
            opts.className
        );
    }

    // buttonHtml({ label, variant, size, block, pill, icon, href, onclick, type,
    //              ariaLabel, title, disabled, className, attrs })
    // `label` and `ariaLabel` are escaped; `icon` is trusted SVG markup.
    function buttonHtml(opts) {
        const o = opts || {};
        const inner = (o.icon || '') + (o.label ? esc(o.label) : '');
        const common = attrs({
            class: btnClass(o),
            'aria-label': o.ariaLabel || (o.icon && !o.label ? o.label : null),
            title: o.title,
            onclick: o.onclick
        }) + attrs(o.attrs);
        if (o.href) {
            return '<a' + common + attrs({ href: o.href, 'aria-disabled': o.disabled ? 'true' : null }) + '>' + inner + '</a>';
        }
        return '<button' + attrs({ type: o.type || 'button', disabled: !!o.disabled }) + common + '>' + inner + '</button>';
    }

    // Icon-only control; requires an accessible name.
    function iconButtonHtml(opts) {
        const o = Object.assign({ variant: 'ghost', size: 'small' }, opts || {});
        const label = o.ariaLabel || o.label || '';
        return buttonHtml(Object.assign({}, o, { label: '', icon: o.icon || '', ariaLabel: label, title: o.title || label, className: classes('btn-icon', o.className) }));
    }

    // emptyStateHtml({ title, body, action, icon, className, compact })
    // `action` may be raw button HTML (from buttonHtml) or a buttonHtml options bag.
    function emptyStateHtml(opts) {
        const o = opts || {};
        const action = !o.action ? '' : (typeof o.action === 'string' ? o.action : buttonHtml(Object.assign({ size: 'small' }, o.action)));
        return '<div class="' + classes('empty-state', o.compact ? 'compact-empty' : '', o.className) + '">'
            + (o.icon ? '<div class="empty-state-icon">' + esc(o.icon) + '</div>' : '')
            + (o.title ? '<h3>' + esc(o.title) + '</h3>' : '')
            + (o.body ? '<p>' + esc(o.body) + '</p>' : '')
            + action
            + '</div>';
    }

    // Board placeholder while data loads; the E2E journeys wait on `.loading-state`.
    function loadingStateHtml(message) {
        return '<div class="empty-state loading-state" role="status" aria-busy="true"><p class="muted-note">' + esc(message) + '</p></div>';
    }

    // badgeHtml({ label, tone: 'danger' | 'neutral', className })
    function badgeHtml(opts) {
        const o = opts || {};
        return '<span class="' + classes('badge', o.tone === 'neutral' ? 'badge-neutral' : '', o.className) + '"' + attrs(o.attrs) + '>' + esc(o.label) + '</span>';
    }

    // menuItemHtml({ label, onclick, href, danger, className, attrs }) → one row of a .menu__panel
    function menuItemHtml(opts) {
        const o = opts || {};
        const cls = classes('menu__item', o.danger ? 'menu__item--danger' : '', o.className);
        const common = attrs({ class: cls, onclick: o.onclick }) + attrs(o.attrs);
        if (o.href) return '<a' + common + attrs({ href: o.href }) + '>' + esc(o.label) + '</a>';
        return '<button type="button"' + common + '>' + esc(o.label) + '</button>';
    }

    return {
        esc: esc,
        classes: classes,
        attrs: attrs,
        buttonHtml: buttonHtml,
        iconButtonHtml: iconButtonHtml,
        emptyStateHtml: emptyStateHtml,
        loadingStateHtml: loadingStateHtml,
        badgeHtml: badgeHtml,
        menuItemHtml: menuItemHtml,
        VARIANTS: VARIANTS,
        SIZES: SIZES
    };
});
