# Test health — flaky / slow suites (issue #943)

Measured locally 2026-10-17 on `dev` (vitest JSON reporter). Wall time of a suite is dominated by **transform/import**, not assertion ms.

## Top slowest mobile tests (assertion duration)

| ms | File | Case |
| --- | --- | --- |
| 74 | `skeletons.test.tsx` | PostGridSkeleton 2-column |
| 73 | `useTranslatedPosts.test.ts` | cache hit |
| 55 | `useTranslatedPosts.test.ts` | miss → null materialization |
| 43 | `Screen.deviceMatrix.test.tsx` | iPhone SE inset |
| 27 | `skeletons.test.tsx` | dense 3-column |
| 19 | `skeletons.test.tsx` | InboxListSkeleton default |
| 18 | `AppShell.snapshot.test.tsx` | mobile invariant |
| 17 | `AdminGate.test.tsx` | admin role children |
| 16 | `Screen.nativeHeader.test.tsx` | hasNativeHeader |
| 16 | `skeletons.test.tsx` | InboxListSkeleton count |

Mobile suite: **559 tests ~4.6s** local (CI often ~45–50s with cold cache / coverage).

## Top slowest infra files (before fix)

| Wall ms | File | Notes |
| --- | --- | --- |
| ~55 | `SupabaseCityRepository.test.ts` | MAX_PAGES truncation built a **100k-row** fake array |
| ~37 | `SupabaseStreetRepository.test.ts` | same pattern |
| ~59 | `withTiming.test.ts` | real Date.now; not sleeping — import of Edge shared module |
| ~56 | `client.test.ts` | fetch wrapping |

## Fixes in this change

1. **`queryPersist` unit test** — import `isPersistableQueryKey` from `queryPersistKeys.ts` so the suite does not need `idb-keyval` at module load (was failing locally with `ERR_MODULE_NOT_FOUND` when the dep was not linked).
2. **City / Street MAX_PAGES tests** — inject `{ pageSize, maxPages }` and stop allocating 100k-row fixtures (keeps the truncation guard, drops the pathological alloc).

## Flaky / cancelled runs

- Most “failures” in recent frontend CI were **dependabot** typecheck/Sonar or **architecture lint**, not assertion flakes.
- `cancelled` runs are expected from `concurrency: cancel-in-progress` on PR pushes — not flaky tests.
- No remaining known flaky assertion suite after the `queryPersist` isolation; track new flakes as separate issues tagged `flaky-test`.

## How to re-measure

```bash
cd app/apps/mobile && pnpm exec vitest run --reporter=json --outputFile=/tmp/mobile-vitest.json
cd app/packages/infrastructure-supabase && pnpm exec vitest run --reporter=json --outputFile=/tmp/infra-vitest.json
```
