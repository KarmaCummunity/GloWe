// App-wide display version (FR-GLOWE-025 / D-181).
// Source of truth: app/VERSION. Kept in sync by scripts/bump-app-version.mjs
// and re-stamped by app/scripts/web-postbuild.mjs on every web deploy.
(function (root) {
    var version = '1.3.0';
    root.GloweAppVersion = { version: version };
    try {
        var scripts = document.querySelectorAll('script[src*="app.js"]');
        scripts.forEach(function (script) {
            var src = script.getAttribute('src') || '';
            if (!src || src.indexOf('v=') !== -1) return;
            var sep = src.indexOf('?') >= 0 ? '&' : '?';
            script.setAttribute('src', src + sep + 'v=' + encodeURIComponent(version));
        });
    } catch (_e) { /* ignore */ }
})(typeof self !== 'undefined' ? self : this);
