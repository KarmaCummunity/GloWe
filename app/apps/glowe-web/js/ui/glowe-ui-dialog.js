// GloWe dialog shell (FR-GLOWE-029 Phase 3 / D-190).
//
// One open/close path for every `.modal` on the site: role/aria wiring, scroll
// lock via body.glowe-modal-open (no inline styles), focus restore, a Tab focus
// trap, Escape and backdrop dismissal, and a promise-based confirm() that
// replaces window.confirm. app.js's openModal/closeModal delegate here.
(function (root, factory) {
    const api = factory(root);
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    root.GloweUiDialog = api;
})(typeof self !== 'undefined' ? self : this, function (root) {
    'use strict';

    const ACTIVE = 'active';
    const BODY_OPEN = 'glowe-modal-open';
    const CONFIRM_ID = 'glowe-confirm-modal';
    const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

    const restoreFocus = new Map();
    let bound = false;

    function doc() { return root && root.document ? root.document : null; }

    function esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function text(key) {
        return typeof root.gloweText === 'function' ? root.gloweText(key) : key;
    }

    function activeModals(d) {
        return Array.from(d.querySelectorAll('.modal.' + ACTIVE));
    }

    function topModal(d) {
        const open = activeModals(d);
        return open.length ? open[open.length - 1] : null;
    }

    function focusables(modal) {
        return Array.from(modal.querySelectorAll(FOCUSABLE))
            .filter(function (el) { return el.offsetParent !== null || el === modal; });
    }

    function ensureSemantics(modal) {
        if (!modal.hasAttribute('role')) modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        if (!modal.hasAttribute('aria-labelledby') && !modal.hasAttribute('aria-label')) {
            const heading = modal.querySelector('h1, h2, h3');
            if (heading) {
                if (!heading.id) heading.id = modal.id + '-title';
                modal.setAttribute('aria-labelledby', heading.id);
            }
        }
    }

    function focusInitial(modal) {
        const preferred = modal.querySelector('[data-autofocus], input:not([type="hidden"]), select, textarea');
        const target = preferred || focusables(modal).find(function (el) { return !el.classList.contains('close-modal'); }) || modal;
        if (target === modal && !modal.hasAttribute('tabindex')) modal.setAttribute('tabindex', '-1');
        try { target.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
    }

    /** Open `#id` (or an element). Idempotent; returns the modal or null. */
    function open(idOrEl) {
        const d = doc();
        if (!d) return null;
        const modal = typeof idOrEl === 'string' ? d.getElementById(idOrEl) : idOrEl;
        if (!modal) return null;
        bind();
        ensureSemantics(modal);
        if (!modal.classList.contains(ACTIVE)) {
            restoreFocus.set(modal, d.activeElement);
            modal.classList.add(ACTIVE);
        }
        d.body.classList.add(BODY_OPEN);
        focusInitial(modal);
        return modal;
    }

    /** Close `#id` (or an element); restores focus and releases the scroll lock. */
    function close(idOrEl) {
        const d = doc();
        if (!d) return;
        const modal = typeof idOrEl === 'string' ? d.getElementById(idOrEl) : idOrEl;
        if (!modal) return;
        modal.classList.remove(ACTIVE);
        if (!activeModals(d).length) d.body.classList.remove(BODY_OPEN);
        const prev = restoreFocus.get(modal);
        restoreFocus.delete(modal);
        if (prev && typeof prev.focus === 'function' && d.contains(prev)) {
            try { prev.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
        }
    }

    function isOpen(id) {
        const d = doc();
        const modal = d && d.getElementById(id);
        return Boolean(modal && modal.classList.contains(ACTIVE));
    }

    function onKeydown(e) {
        const d = doc();
        const modal = d && topModal(d);
        if (!modal) return;
        if (e.key === 'Escape') {
            e.preventDefault();
            close(modal);
            return;
        }
        if (e.key !== 'Tab') return;
        const items = focusables(modal);
        if (!items.length) { e.preventDefault(); return; }
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && (d.activeElement === first || !modal.contains(d.activeElement))) {
            e.preventDefault(); last.focus();
        } else if (!e.shiftKey && d.activeElement === last) {
            e.preventDefault(); first.focus();
        }
    }

    function onClick(e) {
        const t = e.target;
        if (t && t.classList && t.classList.contains('modal') && t.classList.contains(ACTIVE)) close(t);
    }

    function bind() {
        const d = doc();
        if (bound || !d) return;
        bound = true;
        d.addEventListener('keydown', onKeydown);
        d.addEventListener('click', onClick);
    }

    /** Markup for the shared confirm dialog; exported for tests. */
    function confirmHtml(opts) {
        const o = opts || {};
        const danger = o.danger ? ' btn-danger' : ' btn-primary';
        return '<div id="' + CONFIRM_ID + '" class="modal" role="alertdialog" aria-modal="true" aria-labelledby="' + CONFIRM_ID + '-title" aria-describedby="' + CONFIRM_ID + '-message">' +
            '<div class="modal-content modal-confirm">' +
            '<h2 id="' + CONFIRM_ID + '-title">' + esc(o.title || text('Please confirm')) + '</h2>' +
            '<p id="' + CONFIRM_ID + '-message" class="modal-intro">' + esc(o.message || '') + '</p>' +
            '<div class="modal-actions">' +
            '<button type="button" class="btn btn-outline" data-confirm="cancel">' + esc(o.cancelLabel || text('Cancel')) + '</button>' +
            '<button type="button" class="btn' + danger + '" data-confirm="ok" data-autofocus>' + esc(o.confirmLabel || text('Confirm')) + '</button>' +
            '</div></div></div>';
    }

    /**
     * Accessible replacement for window.confirm. Resolves true on confirm, false
     * on cancel / Escape / backdrop. Falls back to window.confirm without a DOM.
     */
    function confirm(opts) {
        const d = doc();
        const o = typeof opts === 'string' ? { message: opts } : (opts || {});
        if (!d || !d.body) {
            return Promise.resolve(typeof root.confirm === 'function' ? root.confirm(o.message || '') : false);
        }
        const stale = d.getElementById(CONFIRM_ID);
        if (stale) stale.remove();
        const host = d.createElement('div');
        host.innerHTML = confirmHtml(o);
        const modal = host.firstElementChild;
        d.body.appendChild(modal);

        return new Promise(function (resolve) {
            let settled = false;
            function finish(result) {
                if (settled) return;
                settled = true;
                close(modal);
                modal.remove();
                observer.disconnect();
                resolve(result);
            }
            modal.addEventListener('click', function (e) {
                const btn = e.target.closest('[data-confirm]');
                if (btn) finish(btn.getAttribute('data-confirm') === 'ok');
            });
            // Escape / backdrop go through close(); observe the class flip.
            const observer = new MutationObserver(function () {
                if (!modal.classList.contains(ACTIVE)) finish(false);
            });
            open(modal);
            observer.observe(modal, { attributes: true, attributeFilter: ['class'] });
        });
    }

    return { open: open, close: close, isOpen: isOpen, confirm: confirm, confirmHtml: confirmHtml, BODY_OPEN_CLASS: BODY_OPEN, CONFIRM_ID: CONFIRM_ID };
});
