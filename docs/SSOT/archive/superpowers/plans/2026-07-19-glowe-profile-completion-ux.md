# GloWe Profile Completion UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Soft “Complete profile” status (no Draft), type-aware Individual/Organization edit forms, avatar camera modal, partial saves, EN name backfill, bio translation on Personal Area + public profile, and icon project actions — per approved design `docs/SSOT/archive/superpowers/specs/2026-07-19-glowe-profile-completion-ux-design.md`.

**Architecture:** Pure helpers live in a new small module `js/glowe-profile-ux.js` (status chip + sparse check + bio field resolution). UI wiring stays in `js/app.js` (modals, Personal Area hero, public profile owner chrome, project card). Avatar upload reuses existing `validateAvatarFile` + `uploadProfileImage` + `upsertProfile`. Translation reuses FR-TRANSLATE-005 `data-tr-*` attributes. No DB migration.

**Tech Stack:** GloWe vanilla JS (`app/apps/glowe-web`), Vitest unit tests, Supabase Storage `glowe-avatars`, Edge `glowe-generate-name-en` (existing), Hebrew chrome dictionary in `app.js`.

## Global Constraints

- Branch from latest `origin/dev`: `feat/FR-GLOWE-011-profile-completion-ux` (do **not** commit onto `chore/INFRA-OSS-security-tooling`).
- Soft MVP: never hard-block browse/create from incompleteness in this slice.
- Completeness: chip gone when **bio OR focus** non-empty (bio = about|story|shortLine|orgDescription; focus = focus|orgField).
- Docs language: English for SSOT/spec/plan; UI strings EN source + HE dictionary keys.
- File size: keep new module ≤300 lines; prefer helpers over growing `app.js` further when possible.
- Pre-push from `app/`: `pnpm typecheck && pnpm test && pnpm lint` (glowe vitest suite must include new tests).
- PR targets `dev` with Mapped to spec line.

## File map

| File | Role |
|------|------|
| `app/apps/glowe-web/js/glowe-profile-ux.js` | **Create** — `isProfileSparse`, `profileStatusChip`, `profileBioSource`, `cameraIconSvg`, `projectActionIconsHtml` |
| `app/apps/glowe-web/js/__tests__/glowe-profile-ux.test.js` | **Create** — unit tests |
| `app/apps/glowe-web/js/app.js` | Edit modal dual forms, avatar modal, hero/status, project card, public profile owner chrome, HE keys, EN backfill on personal load |
| `app/apps/glowe-web/js/backend.js` | Stop forcing `'Draft'` as client default in `profilePayload` when unset (use `null` or omit); keep column if present |
| `app/apps/glowe-web/js/auth.js` | Stop defaulting `profileStatus: 'Draft'` for session user mapping |
| `app/apps/glowe-web/css/styles.css` | Camera button, status CTA chip, project corner icons, avatar modal |
| `app/apps/glowe-web/pages/my-applications.html` | Script include for `glowe-profile-ux.js` |
| `app/apps/glowe-web/pages/profile.html` | Script include for `glowe-profile-ux.js` |
| `docs/SSOT/spec/17_glowe_frontend.md` | FR-GLOWE-011 AC additions |
| `docs/SSOT/BACKLOG.md` | New GLOWE row → Done on ship |
| `docs/SSOT/TECH_DEBT.md` | Narrow TD-135 residual after hero bio wired |

---

### Task 1: Pure helpers + unit tests

**Files:**
- Create: `app/apps/glowe-web/js/glowe-profile-ux.js`
- Create: `app/apps/glowe-web/js/__tests__/glowe-profile-ux.test.js`

**Interfaces:**
- Produces:
  - `isProfileSparse(profile): boolean`
  - `profileStatusChip(profile, { isOwner: boolean }): null | { kind, label, action }`
  - `profileBioSource(profile): { text: string, field: 'about' | 'org_description' | null }`
  - `CAMERA_ICON_SVG` string constant (inline SVG, 16–18px)
  - `projectOwnerActionsHtml(projectId): string` (escaped id via caller `jsString` before pass, or escape inside)

- [ ] **Step 1: Write failing tests**

```js
import { describe, it, expect } from 'vitest';
import {
    isProfileSparse,
    profileStatusChip,
    profileBioSource
} from '../glowe-profile-ux.js';

describe('isProfileSparse', () => {
    it('true when no bio and no focus', () => {
        expect(isProfileSparse({ about: '', focus: '' })).toBe(true);
        expect(isProfileSparse({})).toBe(true);
    });
    it('false when about OR focus present', () => {
        expect(isProfileSparse({ about: 'Hello', focus: '' })).toBe(false);
        expect(isProfileSparse({ about: '', focus: 'Education' })).toBe(false);
        expect(isProfileSparse({ shortLine: 'One line', focus: '' })).toBe(false);
        expect(isProfileSparse({ orgDescription: 'Org', orgField: '' })).toBe(false);
        expect(isProfileSparse({ about: '', orgField: 'Health' })).toBe(false);
    });
});

describe('profileStatusChip', () => {
    it('null for non-owner', () => {
        expect(profileStatusChip({ onboardingComplete: false }, { isOwner: false })).toBe(null);
    });
    it('onboarding incomplete wins', () => {
        const c = profileStatusChip({ onboardingComplete: false, about: 'x', focus: 'y' }, { isOwner: true });
        expect(c.kind).toBe('complete_profile');
        expect(c.action).toBe('onboarding');
    });
    it('org pending before sparse', () => {
        const c = profileStatusChip({
            onboardingComplete: true,
            accountType: 'organization',
            approvalStatus: 'pending',
            about: '',
            focus: ''
        }, { isOwner: true });
        expect(c.kind).toBe('pending_review');
        expect(c.action).toBe('none');
    });
    it('sparse complete profile', () => {
        const c = profileStatusChip({
            onboardingComplete: true,
            accountType: 'individual',
            about: '',
            focus: ''
        }, { isOwner: true });
        expect(c.kind).toBe('complete_profile');
        expect(c.action).toBe('edit');
    });
    it('null when complete individual', () => {
        expect(profileStatusChip({
            onboardingComplete: true,
            about: 'Bio',
            focus: ''
        }, { isOwner: true })).toBe(null);
    });
});

describe('profileBioSource', () => {
    it('org prefers org_description', () => {
        expect(profileBioSource({
            accountType: 'organization',
            orgDescription: 'We plant trees',
            about: 'fallback'
        })).toEqual({ text: 'We plant trees', field: 'org_description' });
    });
    it('individual uses about', () => {
        expect(profileBioSource({
            accountType: 'individual',
            about: 'Hello',
            shortLine: 'ignored for field'
        })).toEqual({ text: 'Hello', field: 'about' });
    });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
cd app && pnpm exec vitest run apps/glowe-web/js/__tests__/glowe-profile-ux.test.js
```

Expected: FAIL (module missing).

- [ ] **Step 3: Implement module**

```js
// app/apps/glowe-web/js/glowe-profile-ux.js
(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.GloweProfileUx = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {
    function trim(v) {
        return String(v == null ? '' : v).trim();
    }

    function bioText(p) {
        return trim(p.about) || trim(p.story) || trim(p.shortLine) || trim(p.orgDescription);
    }

    function focusText(p) {
        return trim(p.focus) || trim(p.orgField);
    }

    function isProfileSparse(profile) {
        const p = profile || {};
        return !bioText(p) && !focusText(p);
    }

    function profileStatusChip(profile, options) {
        const isOwner = Boolean(options && options.isOwner);
        if (!isOwner) return null;
        const p = profile || {};
        if (p.onboardingComplete !== true) {
            return {
                kind: 'complete_profile',
                label: 'Complete profile',
                action: 'onboarding'
            };
        }
        if (p.accountType === 'organization' && p.approvalStatus === 'pending') {
            return { kind: 'pending_review', label: 'Pending review', action: 'none' };
        }
        if (p.accountType === 'organization' && p.approvalStatus === 'rejected') {
            return { kind: 'needs_changes', label: 'Needs changes', action: 'edit' };
        }
        if (isProfileSparse(p)) {
            return {
                kind: 'complete_profile',
                label: 'Complete profile',
                action: 'edit'
            };
        }
        return null;
    }

    function profileBioSource(profile) {
        const p = profile || {};
        const isOrg = p.accountType === 'organization';
        if (isOrg && trim(p.orgDescription)) {
            return { text: trim(p.orgDescription), field: 'org_description' };
        }
        if (trim(p.about) || trim(p.story)) {
            return { text: trim(p.about) || trim(p.story), field: 'about' };
        }
        if (isOrg) {
            return { text: '', field: 'org_description' };
        }
        // Prefer about column for translate even if only shortLine is shown later
        return { text: trim(p.shortLine), field: 'about' };
    }

    const CAMERA_ICON_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>';

    const PENCIL_ICON_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>';

    const TRASH_ICON_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/></svg>';

    function projectOwnerActionsHtml(escapedProjectId) {
        return (
            '<div class="project-card-actions project-card-actions--icons">' +
            '<button type="button" class="project-icon-action" aria-label="Edit" onclick="openEditPersonalProjectModal(\'' + escapedProjectId + '\')">' +
            PENCIL_ICON_SVG + '</button>' +
            '<button type="button" class="project-icon-action project-icon-action--danger" aria-label="Delete" onclick="deletePersonalProject(\'' + escapedProjectId + '\')">' +
            TRASH_ICON_SVG + '</button>' +
            '</div>'
        );
    }

    return {
        isProfileSparse: isProfileSparse,
        profileStatusChip: profileStatusChip,
        profileBioSource: profileBioSource,
        CAMERA_ICON_SVG: CAMERA_ICON_SVG,
        projectOwnerActionsHtml: projectOwnerActionsHtml
    };
}));
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
cd app && pnpm exec vitest run apps/glowe-web/js/__tests__/glowe-profile-ux.test.js
```

- [ ] **Step 5: Add script tags**

In `pages/my-applications.html` and `pages/profile.html`, add before `app.js`:

```html
<script src="../js/glowe-profile-ux.js"></script>
```

- [ ] **Step 6: Commit**

```bash
git add app/apps/glowe-web/js/glowe-profile-ux.js \
  app/apps/glowe-web/js/__tests__/glowe-profile-ux.test.js \
  app/apps/glowe-web/pages/my-applications.html \
  app/apps/glowe-web/pages/profile.html
git commit -m "$(cat <<'EOF'
feat(glowe): add profile completion UX helpers

Pure sparse/status/bio helpers for FR-GLOWE-011 soft completion chip.
EOF
)"
```

---

### Task 2: Stop Draft in UI + status chip on Personal Area

**Files:**
- Modify: `app/apps/glowe-web/js/backend.js` (`profilePayload` ~line 107)
- Modify: `app/apps/glowe-web/js/auth.js` (~line 80)
- Modify: `app/apps/glowe-web/js/app.js` (`renderPersonalArea` hero ~6751–6778)
- Modify: `app/apps/glowe-web/css/styles.css` (`.profile-status-pill` / new `.profile-status-cta`)
- Modify: `app/apps/glowe-web/js/app.js` HE dictionary keys

**Interfaces:**
- Consumes: `GloweProfileUx.profileStatusChip`, `profileBioSource`
- Produces: `handleProfileStatusChipClick(action)` global

- [ ] **Step 1: backend/auth — no Draft default**

In `profilePayload`, change:

```js
profile_status: profile.profileStatus || profile.profile_status || null,
```

In `auth.js` user→profile mapping, change:

```js
profileStatus: user.profileStatus || '',
```

(Do not invent Draft.)

- [ ] **Step 2: Hero chip + bio translate markup**

Replace the Draft pill + bio `<p>` in Personal Area hero with:

```js
const ux = (typeof GloweProfileUx !== 'undefined') ? GloweProfileUx : null;
const chip = ux ? ux.profileStatusChip(profile, { isOwner: true }) : null;
const bioSrc = ux ? ux.profileBioSource(profile) : { text: profile.shortLine || profile.about || '', field: 'about' };
const bioText = bioSrc.text || profile.shortLine || profile.about || profile.story || 'Your GloWe profile is ready to be completed.';
const chipHtml = chip
    ? `<button type="button" class="profile-status-cta profile-status-cta--${chip.kind}" onclick="handleProfileStatusChipClick('${chip.action}')">${escapeHtml(chip.label)}</button>`
    : '';
// in tags row: type span + chipHtml (no profile.profileStatus)
// bio:
`<p data-tr-card data-tr-type="glowe_profile" data-tr-id="${escapeHtml(profile.id || '')}" data-tr-field="${bioSrc.field || 'about'}">${escapeHtml(bioText)}</p>`
```

Note: if nesting `data-tr-card` on `<p>` conflicts with translate driver expecting a wrapper, use a small wrapper `<div class="social-profile-bio" data-tr-card …><p data-tr-field="…">`.

Add:

```js
function handleProfileStatusChipClick(action) {
    if (action === 'onboarding') {
        if (typeof openOnboardingModal === 'function') openOnboardingModal();
        else if (typeof maybeShowOnboarding === 'function') maybeShowOnboarding();
        return;
    }
    if (action === 'edit') openEditProfile();
}
```

Wire camera later in Task 4; for now leave Change or replace with stub that still opens edit — Task 4 replaces it.

- [ ] **Step 3: CSS for CTA**

```css
.profile-status-cta {
    border: 1px solid var(--primary);
    background: var(--primary-light);
    color: var(--primary-dark);
    font: inherit;
    font-size: 0.75rem;
    font-weight: 800;
    padding: 4px 10px;
    border-radius: 999px;
    cursor: pointer;
}
.profile-status-cta--pending_review {
    border-color: var(--border-color);
    background: var(--bg-soft, #f5f5f5);
    cursor: default;
}
```

- [ ] **Step 4: Hebrew keys** in `GLOWE_TRANSLATIONS.he`:

```js
'Complete profile': 'השלם פרופיל',
'Pending review': 'ממתין לאישור',
'Needs changes': 'דרושים שינויים',
'Save profile': 'שמירת פרופיל',
'Change profile photo': 'שינוי תמונת פרופיל',
'Remove photo': 'הסרת תמונה',
'Save photo': 'שמירת תמונה',
```

- [ ] **Step 5: Manual / unit smoke** — vitest still green; commit

```bash
git commit -m "$(cat <<'EOF'
feat(glowe): replace Draft pill with soft complete-profile CTA

Owner-only status chip; stop client Draft defaults.
EOF
)"
```

---

### Task 3: Dual edit forms + partial save

**Files:**
- Modify: `app/apps/glowe-web/js/app.js` — `#edit-profile-modal` markup in `ensureGlobalUI`, `openEditProfile`, `handleProfileEdit`

- [ ] **Step 1: Replace modal form body** with two panels:

```html
<div id="edit-profile-fields-individual">…name, nameEn, about, focus, country, publicLink…</div>
<div id="edit-profile-fields-organization" hidden>…orgName, orgNameEn, orgField, orgDescription, website, country, size, contact…</div>
```

No `required` on about/focus. Name (individual) / org name (org) keep `required`.  
Submit button text: `Save profile`.  
Remove avatar file input from this modal (Task 4 owns avatar).

- [ ] **Step 2: `openEditProfile`**

```js
const isOrg = profile.accountType === 'organization';
document.getElementById('edit-profile-fields-individual').hidden = isOrg;
document.getElementById('edit-profile-fields-organization').hidden = !isOrg;
// fill matching fields; for individual map about ← about||story||shortLine
```

- [ ] **Step 3: `handleProfileEdit`**

Build draft from visible panel only. Individual:

```js
{
  name, nameEn,
  about: aboutValue,
  story: aboutValue,
  shortLine: aboutValue.slice(0, 160), // optional: keep shortLine in sync for hero fallbacks
  focus, country, publicLink,
  type: 'Individual'
}
```

Organization:

```js
{
  name: orgName || existing.name,
  orgName, orgNameEn, orgField,
  orgDescription, about: orgDescription,
  orgWebsite: website, country, orgCountry: country,
  orgSize: size,
  orgContactName, orgContactEmail, orgContactPhone,
  type: 'Organization', focus: orgField
}
```

Call `persistPersonalProfile(profileDraft)` — no avatar branch here.

- [ ] **Step 4: Commit**

```bash
git commit -m "$(cat <<'EOF'
feat(glowe): split edit profile into individual and org forms

Allow partial saves; drop required bio/focus for MVP.
EOF
)"
```

---

### Task 4: Avatar camera modal

**Files:**
- Modify: `app/apps/glowe-web/js/app.js` (`ensureGlobalUI` add modal; helpers; hero button)
- Modify: `app/apps/glowe-web/css/styles.css`

- [ ] **Step 1: Inject `#avatar-edit-modal`**

Contents: preview `<img id="avatar-edit-preview">`, hidden file input, buttons Replace / Remove / Save / Cancel, status `<small id="avatar-edit-status">`.

- [ ] **Step 2: Functions**

```js
function openAvatarEditModal() { /* set preview from getPersonalProfile().avatarUrl; openModal */ }
async function handleAvatarEditSave() { /* validate → uploadProfileImage → persistPersonalProfile({ avatarUrl }) */ }
function handleAvatarEditRemove() { /* clear preview; flag remove → persist avatarUrl: '' on save */ }
```

Hero control:

```html
<button type="button" class="social-avatar-change social-avatar-change--icon"
  aria-label="Change profile photo" onclick="openAvatarEditModal()">
  ${GloweProfileUx.CAMERA_ICON_SVG}
</button>
```

- [ ] **Step 3: CSS** — square icon button (40px), centered SVG; modal preview circle 120px.

- [ ] **Step 4: Commit**

```bash
git commit -m "$(cat <<'EOF'
feat(glowe): add camera icon avatar edit modal

Quick profile photo replace/remove without full edit form.
EOF
)"
```

---

### Task 5: EN name backfill on Personal Area load

**Files:**
- Modify: `app/apps/glowe-web/js/app.js` — after `syncPersonalDataFromBackend` / `initMyApplicationsPage` profile load

- [ ] **Step 1:** When owner profile has non-empty `name`, empty `nameEn`, and signed-in backend:

```js
const patches = await gloweBackend.ensureProfileEnglishNames([profile.id]);
// merge into local cache via existing GloweLocalizedName.applyProfilePatches or setPersonalProfile
```

Reuse the same merge pattern as `withEnsuredEnglishNames` in `app.js` (~3914).

- [ ] **Step 2: Commit**

```bash
git commit -m "$(cat <<'EOF'
fix(glowe): backfill missing individual English names on personal area

FR-GLOWE-024 — call ensureProfileEnglishNames when nameEn empty.
EOF
)"
```

---

### Task 6: Project card corner icons

**Files:**
- Modify: `app/apps/glowe-web/js/app.js` `renderProjectCard`
- Modify: `app/apps/glowe-web/css/styles.css`

- [ ] **Step 1:** When `deletable`, use `GloweProfileUx.projectOwnerActionsHtml(jsString(project.id))` instead of text Edit/Delete.

- [ ] **Step 2: CSS**

```css
.project-card { position: relative; }
.project-card-actions--icons {
    position: absolute;
    inset-block-start: 10px;
    inset-inline-end: 10px;
    display: flex;
    gap: 6px;
}
.project-icon-action {
    width: 32px;
    height: 32px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 1px solid var(--border-color);
    border-radius: 8px;
    background: var(--white);
    cursor: pointer;
}
```

Status badge stays inset-inline-start; icons opposite corner in RTL.

- [ ] **Step 3: Commit**

```bash
git commit -m "$(cat <<'EOF'
feat(glowe): use icon actions on owner project cards

Pencil/trash in card corner for Personal Area projects.
EOF
)"
```

---

### Task 7: Public profile alignment (Approach B)

**Files:**
- Modify: `app/apps/glowe-web/js/app.js` — `_adaptDbProfile`, `_renderProfileContent`, `initProfilePage`

- [ ] **Step 1: Pass owner + account fields through adapt**

```js
// in _adaptDbProfile return also:
accountType, onboardingComplete, approvalStatus, about, orgDescription, focus, orgField,
avatarUrl: p.avatarUrl,
_raw: p, // or explicit fields needed for chip
isOwnerView: false // set in initProfilePage
```

In `initProfilePage`, after fetch:

```js
const me = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
const adapted = _adaptDbProfile(dbProfile, projects);
adapted.isOwnerView = Boolean(me && me.id === dbProfile.id);
_renderProfileContent(adapted, container);
```

- [ ] **Step 2: Hero chrome for owner**

- Camera button if `isOwnerView` → `openAvatarEditModal`
- Status chip via `profileStatusChip(db-shaped profile, { isOwner: isOwnerView })` — build chip input from adapted/`_raw`
- Hide misleading `trustStatus` Draft/`profileStatus`; for visitors show type only; for orgs visitors keep neutral type label (no pending leak unless already public — **hide pending/rejected from non-owners**)
- Edit profile in menu: only if `isOwnerView` (or keep but gate); prefer show Edit only for owner
- Mission/bio: ensure individual profiles set `mission` from `about` so translate field works:

```js
mission: isOrg ? (p.orgDescription || p.about || '') : (p.about || ''),
```

(Fix current bug where individual `mission` is always `''`.)

- [ ] **Step 3: Commit**

```bash
git commit -m "$(cat <<'EOF'
feat(glowe): align public profile owner chrome with completion UX

Owner chip + avatar; fix individual mission translate field.
EOF
)"
```

---

### Task 8: SSOT + verification

**Files:**
- Modify: `docs/SSOT/spec/17_glowe_frontend.md` FR-GLOWE-011
- Modify: `docs/SSOT/BACKLOG.md`
- Modify: `docs/SSOT/TECH_DEBT.md` TD-135

- [ ] **Step 1: Spec ACs** — append under FR-GLOWE-011:

```
- AC14. Soft completion chip (owner): Complete profile when onboarding incomplete OR (onboarded and sparse: no bio and no focus). Org pending/rejected chips take priority. No Draft label. Click → onboarding or type-aware edit.
- AC15. Dual edit forms (Individual short vs Organization). Partial save allowed; Save profile label.
- AC16. Avatar camera modal on Personal Area (+ owner public profile).
- AC17. Personal Area hero bio participates in FR-TRANSLATE-005 via about/org_description.
```

- [ ] **Step 2: BACKLOG** — add row `GLOWE.PROFILE-UX` ✅ Done with link to design + this plan.

- [ ] **Step 3: TD-135** — note hero/`about` wired; residual remains composite questionnaire prose only.

- [ ] **Step 4: Run gates**

```bash
cd app && pnpm exec vitest run apps/glowe-web/js/__tests__/glowe-profile-ux.test.js
cd app && pnpm typecheck && pnpm test && pnpm lint
```

- [ ] **Step 5: Manual checklist** (dev deploy or local static)

1. Individual sparse → chip → edit → save only bio → chip gone  
2. Org pending → Pending review, not Draft  
3. Camera upload  
4. Project icons  
5. HE UI strings  
6. Public own profile shows chip; visitor does not  

- [ ] **Step 6: PR to `dev`**

Title: `feat(glowe): profile completion UX and type-aware edit`

Body includes Mapped to spec: FR-GLOWE-011 AC14–17, FR-GLOWE-024, FR-TRANSLATE-005.

---

## Spec coverage check

| Design section | Task |
|----------------|------|
| A Status / no Draft | 1, 2 |
| B Dual forms | 3 |
| C Partial save | 3 |
| D Avatar modal | 4 |
| E Bio translation | 2, 7 |
| F EN name | 5 |
| G Project icons | 6 |
| H Public profile | 7 |
| SSOT | 8 |

## Placeholder scan

None intentional. Implementers must not leave `required` on bio/focus or reintroduce Draft defaults.
`)