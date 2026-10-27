# App semver + GloWe footer version — design

**Date:** 2026-07-19  
**Status:** Approved (PM)  
**Decision:** D-181 · Spec: FR-GLOWE-025

## Goal

Show a normal `MAJOR.MINOR.PATCH` app version in the GloWe footer (small text under the tagline) so operators can tell which build is live on `dev.karma-community.pages.dev`. The version is **app-wide** (not web-only).

## Rules

1. Source of truth: `app/VERSION` (semver string, one line).
2. Every push to `dev` auto-increments **PATCH** via GitHub Actions and commits with `[skip version]` (no bump loop).
3. **MAJOR / MINOR** are manual only (breaking change / significant feature). Agents must bump them in the PR when appropriate — see bold rule in `CLAUDE.md`.
4. GloWe footer reads `js/glowe-version.js` (kept in sync with `app/VERSION`) and renders `vX.Y.Z`.
5. `web-postbuild.mjs` re-stamps `glowe-version.js` from `app/VERSION` on every web deploy so Pages never ships a stale stamp.

## Out of scope

- Showing the version in KC mobile UI (same `app/VERSION` is ready for a later FR).
- Auto major/minor.
