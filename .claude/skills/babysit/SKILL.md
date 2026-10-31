---
name: babysit
description: How a Claude Code session that owns a pull request handles PR events (CI results, merge queue, reviews, bot comments). Read on every PR event; it overrides the default PR-event handling, both conventions and proactivity.
---

# Babysit a PR

Read this on every PR event for a PR you own. It overrides your default PR-event handling.

## Act only on these events

1. **`CI gate` or `CI verdict` concluded on the PR's current head SHA.**
   - Red: read the failing lane, fix it, and push once.
   - Green: do nothing. Auto-merge arms itself and the PR then enters the merge queue.
2. **A merge conflict** with the base branch: resolve it and push.
3. **The PR was dequeued from the merge queue:** read the failing `CI gate` of the `merge_group` run, fix it, push, and let auto-merge queue the PR again.
4. **A review or review comment from a human:** answer it or fix what it asks.

## Ignore everything else

For any other event, end the turn immediately, with no tool calls and no text. That includes:

- CodeRabbit status, summary or rate-limit comments, and their edits;
- SonarCloud summary comments;
- `check_suite.completed` or `check_run` events from third-party apps;
- check runs or statuses on a superseded SHA (not the current head);
- duplicate subscription notices;
- labeler runs;
- your own pushes, comments or labels echoing back.

If you are unsure whether an event is one of the four above, it is not.

## Once auto-merge is armed or the PR is queued

Do not react to intermediate events. Keep one safety-net check-in, a single scheduled wake-up about 30 minutes out. When it fires, check whether the PR merged. Act only if the PR was dequeued or `CI gate` failed on the current head.

## Cancelled lanes

A lane or `CI gate` that was cancelled because a newer run started on the same SHA (a new push, a PR edit or a review) is not a failure. Wait for the newer run. Do not re-run it and do not push.
