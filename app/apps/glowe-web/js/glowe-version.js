// App-wide display version (FR-GLOWE-025 / D-181).
// Source of truth: app/VERSION. Kept in sync by scripts/bump-app-version.mjs,
// scripts/stamp-glowe-version.mjs (local dev), and web-postbuild on deploy.
(function (root) {
    root.GloweAppVersion = { version: '1.5.0' };
})(typeof self !== 'undefined' ? self : this);
