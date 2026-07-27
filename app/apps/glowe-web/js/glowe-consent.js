// GloWe essential-storage consent banner (launch Wave 3 legal/SEO).
// Choice persists in localStorage; banner is non-blocking and links to privacy.html.
(function (root) {
    const STORAGE_KEY = 'glowe-consent-v1';
    const BANNER_ID = 'glowe-consent-banner';

    function privacyHref() {
        const inPages = (root.location && root.location.pathname || '').includes('/pages/');
        return inPages ? 'privacy.html' : 'pages/privacy.html';
    }

    function readChoice() {
        try {
            return root.localStorage.getItem(STORAGE_KEY);
        } catch (_err) {
            return 'accepted';
        }
    }

    function writeChoice(value) {
        try {
            root.localStorage.setItem(STORAGE_KEY, value);
        } catch (_err) {
            /* private mode — treat as accepted for this session */
        }
    }

    function dismiss(value) {
        writeChoice(value || 'accepted');
        const el = root.document.getElementById(BANNER_ID);
        if (el) el.remove();
    }

    function ensure() {
        const doc = root.document;
        if (!doc || !doc.body) return;
        if (readChoice()) return;
        if (doc.getElementById(BANNER_ID)) return;

        const banner = doc.createElement('div');
        banner.id = BANNER_ID;
        banner.className = 'glowe-consent-banner';
        banner.setAttribute('role', 'dialog');
        banner.setAttribute('aria-label', 'Cookie and storage notice');
        banner.innerHTML = `
            <p class="glowe-consent-banner__text">
                We use essential storage to keep you signed in and remember your preferences.
                <a class="glowe-consent-banner__link" href="${privacyHref()}">Privacy Policy</a>
            </p>
            <button type="button" class="btn btn-primary btn-small glowe-consent-banner__accept">Got it</button>
        `;
        banner.querySelector('.glowe-consent-banner__accept').addEventListener('click', function () {
            dismiss('accepted');
        });
        doc.body.appendChild(banner);
    }

    root.GloweConsent = {
        ensure: ensure,
        dismiss: dismiss,
        storageKey: STORAGE_KEY
    };

    if (docReady(root.document)) ensure();
    else root.document.addEventListener('DOMContentLoaded', ensure);

    function docReady(doc) {
        return doc && (doc.readyState === 'interactive' || doc.readyState === 'complete');
    }
})(typeof self !== 'undefined' ? self : this);
