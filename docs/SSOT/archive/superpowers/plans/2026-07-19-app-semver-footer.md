# App semver footer — Implementation Plan

> **For agentic workers:** implement task-by-task. Steps use checkbox syntax.

**Goal:** App-wide `MAJOR.MINOR.PATCH` in `app/VERSION`; auto patch-bump on every `dev` push; show `vX.Y.Z` in GloWe footer.

**Architecture:** `app/VERSION` SSOT → bump workflow + `glowe-version.js` mirror → footer via `ensureGlobalFooter`; `web-postbuild` re-stamps on deploy.

**Tech Stack:** GitHub Actions, Node bump script, static GloWe JS/CSS.

## Tasks

- [ ] Add `app/VERSION` (`1.0.0`), `glowe-version.js`, `scripts/bump-app-version.mjs` + unit test
- [ ] Add `.github/workflows/bump-app-version.yml` (concurrency, `[skip version]`)
- [ ] Wire footer + CSS; include script on pages; stamp in `web-postbuild.mjs`
- [ ] SSOT: FR-GLOWE-025, D-181, BACKLOG, bold CLAUDE.md rule
- [ ] PR to `dev`
