// GloWe → Karma Community shared backend.
// Points the GloWe frontend at the SAME Supabase project as the KC app, so a
// single Supabase Auth identity (auth.users) is shared across both frontends.
// The publishable key is safe to ship in the browser (that is its purpose).
// GloWe's own data lives under the `glowe_*` table prefix to avoid colliding
// with KC's native tables (see ./backend.js, migration 0204_glowe_schema.sql).
//
// Wave 2.5: supabase-js is vendored (pinned) under js/vendor/ — no jsDelivr.
(function () {
    const LOCAL_SUPABASE_URL = 'http://127.0.0.1:54321';
    const LOCAL_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

    // Pinned UMD build — keep in sync with js/vendor/README.md
    const SUPABASE_JS_VENDOR = 'js/vendor/supabase-js-2.105.3.js';

    function isLocalDevPage() {
        if (typeof location === 'undefined') return false;
        const host = String(location.hostname || '').toLowerCase();
        if (host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '[::1]') return true;
        // GloWe static dev server default (pnpm --filter @kc/glowe-web dev).
        return location.port === '4321';
    }

    function supabaseClientUrl() {
        if (typeof location === 'undefined') return SUPABASE_JS_VENDOR;
        const path = String(location.pathname || '');
        // pages/*.html sit one level below the site root.
        if (path.includes('/pages/')) return `../${SUPABASE_JS_VENDOR}`;
        return SUPABASE_JS_VENDOR;
    }

    const supabaseCdn = supabaseClientUrl();

    window.GLOWE_BACKEND_CONFIG = isLocalDevPage() ? {
        supabaseUrl: LOCAL_SUPABASE_URL,
        supabaseAnonKey: LOCAL_ANON_KEY,
        supabaseCdn: supabaseCdn
    } : {
        supabaseUrl: 'https://roeefqpdbftlndzsvhfj.supabase.co',
        supabaseAnonKey: 'sb_publishable_Pt0rSTIj4-1YpARJqKztFw_PaaZjMa-',
        supabaseCdn: supabaseCdn
    };
})();
