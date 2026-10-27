# GloWe community translate + card UI — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** EN community authors/comments/tags translate; org cards share one layout; Show original lives in a global `.tr-slot`; header is less crowded.

**Architecture:** Extend `glowe-translate` SOURCE + cache CHECKs; nest comment cards; reuse `ensureProfileEnglishNames` for feed authors; centralize UI slot in `glowe-ui-conventions.js`.

**Tech Stack:** GloWe static JS, Supabase migrations + Edge Functions, vitest, CSS.

---

### Task 1: Migration 0231

**Files:** `supabase/migrations/0231_glowe_comment_tags_translate.sql`

- Add `glowe_comments.author_name_en`
- Extend `glowe_ct_type_chk` with `glowe_comment`
- Extend `glowe_ct_field_chk` with `tags.N` pattern + keep `text`
- Purge triggers for comment text edits + post tags edits

### Task 2: Edge `glowe-translate`

**Files:** `supabase/functions/glowe-translate/index.ts`

- `glowe_comment` SOURCE entry
- `glowe_post.arrayFields` includes `tags`

### Task 3: Conventions + toggle slot

**Files:** `app/apps/glowe-web/js/glowe-ui-conventions.js` (new), `glowe-translate.js`, `styles.css`, script tags on pages that already load translate

### Task 4: FE names + comments + tags + org cards + header

**Files:** `app.js`, `glowe-posts.js`, tests, `styles.css`, SSOT updates

### Task 5: Verify + PR to `dev`
