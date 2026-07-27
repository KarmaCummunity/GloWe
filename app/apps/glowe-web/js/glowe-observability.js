// GloWe launch observability (Wave 3) — Sentry + lightweight product analytics.
//
// Both sinks are opt-in via window globals set before this script loads
// (or via meta tags). Without config the helpers are no-ops so local/dev
// stays quiet. Aligns with D-48 (Sentry as the observability sink).
(function (root) {
    const SENTRY_DSN =
        (root.GLOWE_SENTRY_DSN)
        || (typeof document !== 'undefined'
            && document.querySelector('meta[name="glowe-sentry-dsn"]')
            && document.querySelector('meta[name="glowe-sentry-dsn"]').content)
        || '';
    const ANALYTICS_ENDPOINT =
        (root.GLOWE_ANALYTICS_ENDPOINT)
        || (typeof document !== 'undefined'
            && document.querySelector('meta[name="glowe-analytics-endpoint"]')
            && document.querySelector('meta[name="glowe-analytics-endpoint"]').content)
        || '';

    let sentryReady = false;

    function loadScript(src) {
        return new Promise(function (resolve, reject) {
            const s = document.createElement('script');
            s.src = src;
            s.async = true;
            s.onload = resolve;
            s.onerror = reject;
            document.head.appendChild(s);
        });
    }

    async function initSentry() {
        if (!SENTRY_DSN || sentryReady || typeof document === 'undefined') return;
        try {
            await loadScript('https://browser.sentry-cdn.com/8.47.0/bundle.tracing.min.js');
            if (!root.Sentry || typeof root.Sentry.init !== 'function') return;
            root.Sentry.init({
                dsn: SENTRY_DSN,
                integrations: root.Sentry.browserTracingIntegration
                    ? [root.Sentry.browserTracingIntegration()]
                    : [],
                tracesSampleRate: 0.1,
                environment: root.GLOWE_ENVIRONMENT || 'production'
            });
            sentryReady = true;
        } catch (_e) {
            // Observability must never break the product surface.
        }
    }

    function captureError(error, context) {
        if (sentryReady && root.Sentry && typeof root.Sentry.captureException === 'function') {
            root.Sentry.captureException(error, context ? { extra: context } : undefined);
            return;
        }
        if (typeof console !== 'undefined' && console.warn) {
            console.warn('[glowe-observability]', error, context || '');
        }
    }

    function track(eventName, props) {
        const name = String(eventName || '').trim();
        if (!name) return;
        const payload = {
            event: name,
            props: props || {},
            ts: Date.now(),
            path: (typeof location !== 'undefined') ? location.pathname : '',
            lang: (typeof localStorage !== 'undefined' && localStorage.getItem('gloweLang')) || 'en'
        };
        if (!ANALYTICS_ENDPOINT) return;
        try {
            const body = JSON.stringify(payload);
            if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
                navigator.sendBeacon(ANALYTICS_ENDPOINT, body);
                return;
            }
            fetch(ANALYTICS_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: body,
                keepalive: true
            }).catch(function () { /* ignore */ });
        } catch (_e) {
            /* ignore */
        }
    }

    function installGlobalHandlers() {
        if (typeof window === 'undefined') return;
        window.addEventListener('error', function (ev) {
            captureError(ev.error || ev.message || 'window.error');
        });
        window.addEventListener('unhandledrejection', function (ev) {
            captureError(ev.reason || 'unhandledrejection');
        });
    }

    function init() {
        installGlobalHandlers();
        initSentry();
        track('page_view', { title: document.title || '' });
    }

    if (typeof document !== 'undefined') {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init);
        } else {
            init();
        }
    }

    root.GloweObservability = {
        init: init,
        track: track,
        captureError: captureError
    };
})(typeof self !== 'undefined' ? self : this);
