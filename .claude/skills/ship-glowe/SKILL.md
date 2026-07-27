---
name: ship-glowe
description: Use when a GloWe (app/apps/glowe-web/**) change is code-complete and ready to go out — runs pre-push gates, opens/updates the PR to dev, watches CI to merge, and verifies the change is actually live on dev.karma-community.pages.dev/glowe before declaring done. Not for mid-implementation work.
---

# Ship a GloWe change

Encodes CLAUDE.md §6 (Git & PR workflow) + the Quick Start item 6 deployment-verification rule, specifically for GloWe. Follow every step — do not skip the live-verification step because CI is green; green CI and "merged" are not the same claim as "the user can see this now."

## 1. Pre-flight

- `git status` — confirm you're not on `main`, and there's nothing uncommitted you didn't mean to include.
- Confirm the branch follows `<type>/<FR-id-or-scope>-<slug>` (CLAUDE.md §6).
- Confirm `app/VERSION` (+ `app/apps/glowe-web/js/glowe-version.js`) was bumped PATCH (or MINOR/MAJOR per the banner rules) in this change-set. If not, run `node scripts/bump-app-version.mjs` now.

## 2. Local gates — all three must be green before anything is pushed

```bash
cd app
pnpm typecheck && pnpm test && pnpm lint
```

If any GloWe UI/UX behavior changed, verify it visually now (local static server or the Browser tool) — see [[feedback_verify_ui_before_claiming_done]] memory. Don't rely on tests alone for feature correctness.

If this task ran long, checkpoint-committed along the way per [[feedback_checkpoint_long_sessions]] — this step is just the final one, not the first commit of the session.

## 3. Open / update the PR

```bash
git push -u origin HEAD
gh pr create --base dev --head "$(git branch --show-current)" \
  --title "<type>(glowe): <subject>" \
  --body-file .github/.pr-body.md \
  --label "FR-GLOWE" --assignee "@me"
gh pr merge --auto --squash --delete-branch
```

Use the PR body template in CLAUDE.md §6 (must include a `Mapped to spec` line). If the PR shows `BEHIND dev`, update the branch immediately — don't wait.

## 4. Watch CI to actual merge

```bash
gh pr checks --watch
```

If it fails, fix and push a new commit on the same branch — don't force-push, don't skip hooks. Repeat until green and merged. Confirm the merge actually happened (`gh pr view --json state,mergedAt`) before moving on — don't assume `--auto --squash` landed just because you called it.

## 5. Verify live — the step most often skipped

This is GloWe's production front door, not staging (`docs/SSOT/ENVIRONMENTS.md` D-182). After merge:

1. Wait for the `dev` deploy to finish (Cloudflare Pages build on push to `dev`).
2. Open `https://dev.karma-community.pages.dev/glowe` (or the specific page/route that changed) — via the Browser tool, not by assuming.
3. Confirm the actual change is visible: the new copy renders, the fixed bug no longer reproduces, the version footer shows the bumped version.
4. If it's a translation-affecting change, spot-check under `?gloweLang=he` (or the relevant locale) too.

Only after this step passes do you report the task as done. If you can't verify (no way to reach the deployed URL from this session), say so explicitly instead of claiming success.

## 6. SSOT + tech debt

- `docs/SSOT/BACKLOG.md` — flip the item to ✅ (or 🟡 if partial).
- `docs/SSOT/spec/17_glowe_frontend.md` — update the status header if all ACs for the touched domain are done.
- `docs/SSOT/TECH_DEBT.md` — close resolved TDs, add any newly discovered ones (don't fix them inline — CLAUDE.md's "Propose and Proceed" rule).

## 7. Report to the user

State: what merged (PR link), what you verified live and how (URL + what you checked), and what's still open (SSOT status, any new TD rows). Don't just say "done" — say what you saw.
