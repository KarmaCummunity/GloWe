# Home Feed — Filter Sheet Text Search, Auto-Apply & Compact Layout

> **Status:** Approved (PM, 2026-05-26)
> **Spec targets:** `docs/SSOT/spec/06_feed_and_search.md` — `FR-FEED-003` (revive), `FR-FEED-004`, `FR-FEED-005`, `FR-FEED-008`
> **Scope class:** Small feature — mostly UI wiring + one filter dimension on an existing feed pipeline
> **Implementation plan:** Keep short (single plan doc, ~1 session); not a multi-PR program unless CI forces a BE/FE split

---

## 1. Goal

Improve Home Feed discovery without sending users to the Search tab:

1. Add **free-text search** to the existing filter/sort bottom sheet (`PostFilterSheet`).
2. **Remove "החל" (Apply)** — every control commits immediately; the feed refreshes in place.
3. Make the sheet **more compact** (~half screen max height) while keeping the same section order and options.

---

## 2. Product decisions (locked)

| Topic | Decision |
|-------|----------|
| Text persistence | Saved in `filterStore` (AsyncStorage) with other feed filters |
| Search contract | Same as Universal Search posts (`FR-FEED-016`): **300 ms debounce**, runs only at **≥ 2 characters**; matches **title, description, category** (`ilike`) |
| &lt; 2 characters while typing | Text filter **inactive** — feed uses post-shape filters only; badge does **not** count search |
| Active filter badge | `searchQuery` with ≥ 2 trimmed chars counts as **+1** on `FeedFilterIcon` |
| Feed refresh timing | **Immediate** while sheet is open (chips instant; text after debounce) |
| Clear all | Resets text + all other dimensions; feed updates immediately |
| Apply button | **Removed** — closing sheet (X / backdrop) does not discard changes |
| Compact layout | Density pass only (smaller spacing/typography/chips, `maxHeight` ~55–60%); **no accordion** |
| SSOT | PM approved updating `06_feed_and_search.md` to reverse P1.2 exclusions for Home Feed text search and Apply |

---

## 3. UX specification

### 3.1 Sheet layout (top → bottom)

1. Header: title `סינון ומיון` · `נקה הכל` · close
2. **Search field** (new) — RTL `TextInput`, clear affordance when non-empty
3. Sort → Type → Category → Condition (Give only) → Status → Source → Location

### 3.2 Interaction matrix

| User action | Feed | Badge | Persist |
|-----------|------|-------|---------|
| Toggle chip | Refetch immediately | Updates immediately | Immediate |
| Type in search (1 char) | No text filter applied | No search +1 | Saves raw text |
| Type in search (≥ 2 after debounce) | Refetch with text filter | +1 if no other change | Immediate |
| Clear search field | Refetch without text | −1 if was active | Immediate |
| נקה הכל | Reset to defaults | 0 | Immediate |

### 3.3 Loading & scroll

- While refetching: reuse existing feed loading/refetch indicators (no new modal).
- Do **not** force scroll-to-top on every chip tap; only reset scroll when user taps "new posts" banner or pull-to-refresh (existing behavior).

### 3.4 Empty state

- Unchanged copy path (`FR-FEED-008`): when `activeCount > 0` and zero posts, show filter-driven empty state + "נקה פילטרים".

### 3.5 i18n keys (Hebrew module `filters`)

- `sectionSearch` — section label (optional if placeholder is enough)
- `searchPlaceholder` — e.g. `חיפוש בכותרת, תיאור או קטגוריה…`
- Remove or stop rendering `apply` in Home sheet (key may remain for Search tab until that sheet is also updated)

---

## 4. What is reused vs new work

### 4.1 Reuse (copy patterns, not copy-paste files)

| Existing asset | Reuse |
|----------------|-------|
| `app/(tabs)/search.tsx` | Debounce constants (`300 ms`), ≥2-char gate, trim behavior |
| `searchQueryHelpers.searchPosts` | **Matching semantics** (`escapeIlike` + `title/description/category` OR) — extract shared helper or duplicate 3 lines in feed query builder |
| `PostFilterSheet` + sections | Layout, chips, `CityPicker`, location radius |
| `filterStore` + `useQuery(['feed', …])` | Persistence + refetch on filter change |
| `FeedFilterIcon` + `activeCount()` | Extend counting rules |

### 4.2 Not reusable as-is (why this is not "Search tab copy")

| Gap | Reason |
|-----|--------|
| Universal Search use case | `GetUniversalSearchUseCase` + `ISearchRepository` — different API, multi-entity results |
| Home Feed use case | `GetFeedUseCase` + `IPostRepository.getFeed` — paginated feed, visibility predicate, two SQL paths |
| Ranked feed RPC | `feed_ranked_ids` has no text param today — needs migration when distance / radius / followers-only path is active **with** text search |
| `PostFilterSheet` state | Today uses local **draft** + Apply — must become **direct store writes** |
| Search tab filter sheet | Still has its own Apply/draft (`SearchFilterSheet`) — out of scope unless PM asks parity later |

**Honest sizing:** ~**small** implementation — roughly **1 focused PR** (or **2** if BE migration is split: contract+RPC, then FE). Estimate **~0.5–1.5 dev days**, not a platform initiative.

---

## 5. Architecture (minimal)

### 5.1 Contract

Add optional `searchQuery?: string` to `PostFeedFilter` (`IPostRepository.ts`). `GetFeedUseCase.normalizeFilter` drops blank/whitespace-only strings.

### 5.2 Backend

- **Simple path** (`buildFeedQuery`): append `.or(title.ilike…,description.ilike…,category.ilike…)` when `searchQuery` length ≥ 2 (after normalize).
- **Ranked path** (`feed_ranked_ids`): add `p_filter_search_query text default null`; same `ilike` predicate inside RPC `WHERE` clause.
- Reuse `escapeIlike` from `searchUtils` — do not invent a second escaper.

### 5.3 Mobile

- `filterStore`: `searchQuery: string`, `setSearchQuery`, include in `partialize`, `activeCount`, `clearAll`, bump persist `version`.
- `PostFilterSheet`: remove draft/Apply; controlled search input with debounced `setSearchQuery`; compact styles in sheet + `Chip`.
- `index.tsx` (Home): pass `searchQuery` into `feedFilter` memo + query key.

### 5.4 Shared debounce hook (recommended, tiny)

Extract `useDebouncedValue(text, 300)` from search screen logic to `app/apps/mobile/src/hooks/useDebouncedValue.ts` so Home and Search stay aligned — optional but avoids a third divergent debounce.

---

## 6. SSOT changes (required in same delivery)

### `FR-FEED-003` — Revive for Home Feed scope

- Status: **Active** (Home Feed filter sheet only).
- ACs: 300 ms debounce; ≥ 2 chars; fields title/description/category; visibility-aware via existing feed predicate; composes AND with `FR-FEED-004` filters.

### `FR-FEED-004` — Amend

- AC1: add **Search** field at top of sheet.
- AC3: replace "Apply commits" with **auto-commit on change** (chips immediate, text debounced). "Clear all" still immediate.
- Note compact `maxHeight` ~55–60% and density tokens.

### `FR-FEED-005` — Amend

- AC: `searchQuery` persisted in `filterStore` per user; included in schema version bump.

### `FR-FEED-008` — Clarify

- `activeCount > 0` includes active text search.

---

## 7. Testing

| Layer | Cases |
|-------|-------|
| `filterStore` | `activeCount` +1 for 2+ char query; 0 for 1 char; clearAll resets text |
| `GetFeedUseCase` | normalizes blank `searchQuery` away |
| `buildFeedQuery` / RPC | text filter AND-composes with type/category (unit or integration) |
| Manual | chip change updates feed with sheet open; debounced text; badge; persist after kill app; ranked path (distance + text together) |

---

## 8. Out of scope

- Removing Apply from **Search** tab filter sheet (`SearchFilterSheet`)
- Searching owner name / biography on Home Feed
- Changing Universal Search tab UX
- Guest feed (`FR-FEED-012`) — filters remain blocked

---

## 9. Risks

| Risk | Mitigation |
|------|------------|
| Feed flicker while sheet open | Debounce text; use `isRefetching` not full-screen loader |
| Ranked path missing text filter | Ship RPC migration in same PR as `searchQuery` |
| Spec drift | SSOT update in same PR as code |

---

## 10. Implementation plan shape (for `writing-plans`)

Suggested task order (small):

1. SSOT edits (`06_feed_and_search.md`)
2. Contract: `PostFeedFilter.searchQuery` + normalize
3. BE: `buildFeedQuery` + `feed_ranked_ids` migration + tests
4. FE: `filterStore` + debounce hook + `PostFilterSheet` refactor + compact styles + Home wire-up
5. Manual QA checklist from §7

No separate "search tab migration" task unless PM expands scope.
