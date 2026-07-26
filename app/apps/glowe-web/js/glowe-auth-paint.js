// Early paint guards (FR-GLOWE-016 AC2 + FR-GLOWE-005).
// Synced in <head> before first paint so:
//  1) signed-in members never flash the guest marketing home on Home nav
//  2) non-English locales never flash English chrome (or LTR) on tab switches
(function (root) {
    const USER_KEY = 'gloweUser';
    const SESSION_KEY = 'glowe-auth-v1';
    const LANG_KEY = 'gloweLang';
    const MEMBER_CLASS = 'glowe-expect-member';
    const I18N_PENDING_CLASS = 'glowe-i18n-pending';
    const SUPPORTED_LANGS = ['en', 'he', 'ru', 'ar', 'am'];
    const RTL_LANGS = ['he', 'ar'];
    const I18N_REVEAL_FALLBACK_MS = 2500;

    function sessionLooksSignedIn(raw) {
        if (!raw) return false;
        try {
            const parsed = JSON.parse(raw);
            if (!parsed || typeof parsed !== 'object') return false;
            return Boolean(
                parsed.access_token
                || (parsed.user && parsed.user.id)
                || (parsed.currentSession && parsed.currentSession.access_token)
            );
        } catch (e) {
            return false;
        }
    }

    function hasCachedMember(storage) {
        const store = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
        if (!store) return false;
        try {
            if (store.getItem(USER_KEY)) return true;
            return sessionLooksSignedIn(store.getItem(SESSION_KEY));
        } catch (e) {
            return false;
        }
    }

    function readStoredLanguage(storage) {
        const store = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
        if (!store) return 'en';
        try {
            const stored = store.getItem(LANG_KEY);
            return SUPPORTED_LANGS.indexOf(stored) >= 0 ? stored : 'en';
        } catch (e) {
            return 'en';
        }
    }

    function applyExpectMemberPaint(doc, storage) {
        const d = doc || (typeof document !== 'undefined' ? document : null);
        if (!d || !d.documentElement) return false;
        if (!hasCachedMember(storage)) {
            d.documentElement.classList.remove(MEMBER_CLASS);
            return false;
        }
        d.documentElement.classList.add(MEMBER_CLASS);
        return true;
    }

    function clearExpectMemberPaint(doc) {
        const d = doc || (typeof document !== 'undefined' ? document : null);
        if (!d || !d.documentElement) return;
        d.documentElement.classList.remove(MEMBER_CLASS);
    }

    function applyLanguagePaint(doc, storage) {
        const d = doc || (typeof document !== 'undefined' ? document : null);
        if (!d || !d.documentElement) return 'en';
        const lang = readStoredLanguage(storage);
        const rtl = RTL_LANGS.indexOf(lang) >= 0;
        d.documentElement.setAttribute('lang', lang);
        d.documentElement.setAttribute('dir', rtl ? 'rtl' : 'ltr');
        // Hide English source chrome until initGloweI18n() finishes translating.
        // English stays visible immediately (HTML is already English).
        if (lang !== 'en') {
            d.documentElement.classList.add(I18N_PENDING_CLASS);
        } else {
            d.documentElement.classList.remove(I18N_PENDING_CLASS);
        }
        return lang;
    }

    function clearI18nPendingPaint(doc) {
        const d = doc || (typeof document !== 'undefined' ? document : null);
        if (!d || !d.documentElement) return;
        d.documentElement.classList.remove(I18N_PENDING_CLASS);
    }

    function boot(doc, storage) {
        applyLanguagePaint(doc, storage);
        applyExpectMemberPaint(doc, storage);
        // Safety: never leave the UI blank if app.js fails to load.
        if (typeof setTimeout === 'function') {
            setTimeout(function () { clearI18nPendingPaint(doc); }, I18N_REVEAL_FALLBACK_MS);
        }
    }

    if (typeof document !== 'undefined') {
        boot(document);
    }

    const api = {
        KEY: USER_KEY,
        SESSION_KEY,
        LANG_KEY,
        CLASS: MEMBER_CLASS,
        I18N_PENDING_CLASS,
        hasCachedMember,
        readStoredLanguage,
        applyExpectMemberPaint,
        clearExpectMemberPaint,
        applyLanguagePaint,
        clearI18nPendingPaint,
        boot
    };
    root.GloweAuthPaint = api;
    root.GloweBootPaint = api;
})(typeof self !== 'undefined' ? self : this);
