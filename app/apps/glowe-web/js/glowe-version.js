// App-wide display version (FR-GLOWE-025 / D-181).
// Source of truth: app/VERSION. Kept in sync by scripts/bump-app-version.mjs
// and re-stamped by app/scripts/web-postbuild.mjs on every web deploy.
(function (root) {
    root.GloweAppVersion = { version: '1.0.30' };
})(typeof self !== 'undefined' ? self : this);
