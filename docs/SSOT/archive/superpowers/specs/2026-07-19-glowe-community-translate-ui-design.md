# GloWe community translation + card UI consistency

**Date:** 2026-07-19  
**Status:** Approved for implementation (PM: tags yes)  
**Maps to:** FR-TRANSLATE-005 (extend), FR-GLOWE-024, FR-GLOWE-004 AC6, FR-GLOWE-008

## Problem

1. Org EN names work; community post/comment author names stay Hebrew when `author_name_en` is null.
2. Org directory cards wrap differently when Save label is long vs short.
3. Comments have no UGC translate path.
4. "Show original" placement varies by card type.
5. Signed-in header feels crowded.
6. PM also wants **post tags** translated (previously TD-135 / AC4 exclusion).

## Design

### A. Names (FR-GLOWE-024)

- After loading community posts + comments, call existing `ensureProfileEnglishNames` for author profile IDs missing Latin EN names.
- Patch in-memory `authorNameEn` on posts/comments from returned profile patches (org → `orgNameEn`, person → `displayNameEn`).
- Stamp `author_name_en` on new comments (same pair helper as posts).
- Add `glowe_comments.author_name_en` column (snapshot, not UGC translate).

### B. Comment + tag translation (FR-TRANSLATE-005)

- New content type `glowe_comment` → table `glowe_comments`, field `text`.
- Post tags: `glowe_post.tags` as `arrayFields` with `tags.N` (same pattern as opportunity requirements).
- Each comment is its **own** `data-tr-card` (nesting guard already scopes fields to nearest card).
- Tags render as `<span data-tr-field="tags.i">`.

### C. Global toggle convention

- Every UGC card reserves `<div class="tr-slot" aria-live="polite"></div>` immediately under the card header / author row (before title/body).
- `glowe-translate.js` injects `.tr-toggle` into `.tr-slot` first; fallback keeps current proximity logic.
- Document + helper HTML in `js/glowe-ui-conventions.js` (single source for slot markup + card-action class names).

### D. Org card layout

- `.card-actions` → fixed CSS grid `1fr auto 1fr` (or three equal columns) with `flex-wrap: nowrap`; shorten Save label to `Save` / `Saved` so widths match.
- Dedupe meta: skip `scope` when equal to `location`; skip `impactArea` skill when equal to `type`/`org_field`.

### E. Header

- Truncate greeting; icon-only Settings + Admin from ≤992px (Messages already icon-only); keep desktop labels above that; ship pending nav-density CSS.

## Out of scope

- Forum replies translation (separate FR later).
- Category badge on posts (`Post | …`) — still chrome/source hybrid; not in this slice.
- KC mobile frontend.
