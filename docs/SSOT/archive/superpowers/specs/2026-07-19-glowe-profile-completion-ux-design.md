# GloWe profile completion + type-aware edit UX

**Date:** 2026-07-19  
**Status:** Approved for implementation (PM 2026-07-19)  
**Approach:** B — Personal Area polish + public profile alignment  
**Maps to:** FR-GLOWE-002, FR-GLOWE-011, FR-GLOWE-024, FR-TRANSLATE-005  
**Decisions:** soft incomplete status (MVP-gentle); separate Individual vs Organization edit forms; avatar camera modal

## Problem

1. **Misleading `Draft` pill** — `profile_status` defaults to `'Draft'` and is unrelated to `onboarding_complete`. Owners who finished Google onboarding still see "Draft".
2. **One oversized Edit Profile form** — same long questionnaire-style modal for individuals and orgs; labels swap but fields do not.
3. **Bio / short line not consistently translated** on own Personal Area hero (and public profile prose gaps beyond existing mission field).
4. **Avatar "Change"** opens the full edit modal; no focused, professional photo flow.
5. **HTML `required` on edit fields** blocks saving a partial profile (focuses MVP drop-off).
6. **English display name** sometimes missing for individuals despite FR-GLOWE-024 auto-generate path.
7. **Project card Edit/Delete** are text buttons; should be corner icons (owner Personal Area only).

## Goals (MVP-gentle)

- Nudge completion without scaring users: soft CTA, no red alarm language, **no browse/create hard-block** from this slice.
- Cleaner hero: status only when action is needed.
- Clear Individual vs Organization edit surfaces.
- Fast, trustworthy avatar update.
- Partial profile saves always succeed (minimal name still present from onboarding / Google).
- Auto English name; user may override.
- Owner project actions as icon affordances.

## Non-goals

- Full Personal Area visual redesign / new color system.
- Blocking content creation until profile is "complete".
- Translating proper names (stays FR-GLOWE-024).
- KC mobile profile screens.
- Changing org admin approval RPCs (`approval_status` remains source of truth for review).

---

## Design

### A. Profile status (replace Draft)

**Completeness (Individual + approved Org):**

```
isProfileSparse(profile) =
  !trim(about || story || shortLine || orgDescription) &&
  !trim(focus || orgField)
```

Badge **"Complete profile"** / **"השלם פרופיל"** shows only when sparse.  
Disappears when **bio OR focus** is non-empty (one is enough).

**Priority of status chip (owner surfaces):**

| Priority | Condition | Chip | Click |
|----------|-----------|------|-------|
| 1 | `!onboardingComplete` | Complete profile (emphasized) | Open onboarding modal |
| 2 | Org + `approval_status=pending` | Pending review | No navigation (informational) |
| 3 | Org + `rejected` | Needs changes (soft) | Open Organization edit form |
| 4 | `isProfileSparse` | Complete profile | Open type-aware edit form |
| — | else | **No chip** | — |

- Stop rendering raw `profile_status` / `"Draft"` in UI.
- Stop defaulting new writes to `'Draft'` in the client path when unused; leave DB column alone for this slice (no migration required) unless we later retire it.
- Chip styling: accent/emphasized, button-like (`role="button"` or `<button>`), not a muted tag.
- **Public profile (`profile.html`):** same chip logic **only for the owner viewing their own public page**. Visitors never see "Complete profile". Visitors may see org pending/rejected only if product already surfaces review state publicly; default = hide incomplete CTA from non-owners.

### B. Two edit forms

Replace the single long `#edit-profile-modal` body with two mutually exclusive field sets (same modal shell OK).

**Individual (short):**

- Display name*
- Name in English (optional; helper: "Generated automatically — change if you like")
- Bio / about (textarea, optional)
- Interest areas / focus (optional)
- Country / region (optional)
- Website / public link (optional)

**Organization:**

- Organization name*
- Organization name in English (optional + auto)
- Field / sector (`org_field`)
- Description (`org_description` / about)
- Website
- Country
- Size (optional)
- Contact name / email / phone (optional for edit; onboarding already collected)

Hide questionnaire fields (values, community, problem, solution, methods, SDGs, media, short-line-as-required, etc.) from both MVP forms. Values already in `raw_profile` remain readable in "Profile From Questionnaire" collapse if present; not required for save.

Submit label: **"Save profile"** (not "Save Profile Draft").

### C. Partial save

- Remove `required` from bio, focus, and other optional edit fields.
- Keep display name (and org name for orgs) as the only hard client requirements if empty.
- `persistPersonalProfile` / `upsertProfile` must accept empty optional strings.
- Success toast stays calm: "Profile saved".

### D. Avatar quick edit

- Replace text **"Change"** with a **camera icon** control on the avatar (Personal Area hero + owner public profile if edit chrome exists).
- Click opens **small avatar-only modal**: current preview, Replace (file input), Remove (clear `avatar_url`), Save / Cancel.
- Reuse `validateAvatarFile` + `uploadProfileImage` / `glowe-avatars`.
- On Save: upload then `upsertProfile({ avatarUrl })` without touching other fields.
- Accessible: `aria-label="Change profile photo"` / Hebrew equivalent via chrome dictionary.

### E. Bio translation (Personal Area + public profile)

- Hero bio element (`shortLine || about || story` for individuals; `org_description || about` for orgs) marked as a translate card field:
  - Prefer a single source field for `data-tr-field`: `about` or `org_description` (match existing public profile mission pattern).
  - If hero shows `shortLine` that is not a DB column, either (1) persist shortLine into `about` when shortLine is the only prose, or (2) translate `about` and keep shortLine as display-only without toggle until written to `about`. **Prefer (1) on save:** map Individual "Bio" → `about` column.
- Wire Personal Area hero into FR-TRANSLATE-005 (`data-tr-card` / `glowe_profile` / id) same as public profile mission.
- Closes residual TD-135 for hero bio / `about` on own profile; composite questionnaire prose remains out of scope.

### F. English name auto-generate

- Ensure paths that set Hebrew `display_name` without `display_name_en` call `resolveEnglishName` (already in `upsertProfile` / `completeOnboarding` / `ensureProfileFromGoogle`).
- On Personal Area load (owner): if name is non-Latin and `nameEn` empty, call existing backfill helper (`ensureProfileEnglishNames` or equivalent) once and refresh cache.
- Edit form never requires English; empty on save regenerates when primary name changed.

### G. Project card owner actions

- Owner-only actions: pencil + trash **icon buttons** in the card corner (logical start/end for RTL — top corner opposite the status badge).
- `aria-label` Edit / Delete; keep confirm on delete.
- Public viewers: no action icons (unchanged).

### H. Public profile alignment (Approach B)

On `pages/profile.html` for the viewed profile:

| Surface | Behavior |
|---------|----------|
| Bio / mission | Translate toggle when translation applies (already partial — extend to match hero field choice) |
| Owner chrome | Camera icon → avatar modal; Complete-profile chip per §A; Edit opens type-aware form |
| Type | Show Individual vs Organization clearly; org review chips for owner only |
| Visitor | Clean identity + bio + projects; no Draft; no complete-profile nag |

---

## Implementation notes (for plan)

- Primary files: `app/apps/glowe-web/js/app.js`, `css/styles.css`, `js/backend.js` (Draft default / payload), `js/glowe-translate.js` if needed, Hebrew keys in `GLOWE_TRANSLATIONS.he`.
- Pure helpers (unit-test): `isProfileSparse`, `profileStatusChip(profile, { isOwner })`, form field visibility by `accountType`.
- SSOT: extend FR-GLOWE-011 ACs for type-aware edit + soft completion chip; note FR-TRANSLATE-005 residual TD-135 narrow further; BACKLOG item under GLOWE.

## Risks

- Existing users with rich `raw_profile` questionnaire data: still visible in collapsed questionnaire card; not wiped.
- Org pending users editing: allow profile field edits; do not let client set `approval_status`.
- Camera icon discoverability: keep hover/focus ring; optional tooltip via `title`.

## Acceptance checklist

- [ ] No "Draft" visible on Personal Area or public profile for normal Individual after onboarding.
- [ ] Sparse profile shows clickable Complete profile → correct form; filling bio **or** focus removes chip.
- [ ] Individual form short; Organization form org-specific; partial save works.
- [ ] Camera icon → avatar modal upload works against `glowe-avatars`.
- [ ] EN name auto-fills for Hebrew individual when missing.
- [ ] Bio translates on Personal Area hero + public profile with Show original when applied.
- [ ] Project Edit/Delete are corner icons for owner only.
- [ ] Hebrew chrome keys for new strings.
`)