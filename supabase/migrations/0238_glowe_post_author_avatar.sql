-- 0238_glowe_post_author_avatar.sql
-- Snapshot the author's profile avatar on community post publish so feed cards
-- can render the photo without a per-card profile lookup (FR-GLOWE-008 AC9).
--
-- Mapped to spec: FR-GLOWE-008, FR-GLOWE-011 AC3.

set search_path = public;

alter table public.glowe_posts
  add column if not exists author_avatar_url text;

comment on column public.glowe_posts.author_avatar_url is
  'Public URL of the author glowe_profiles.avatar_url at publish time; optional legacy rows fall back to live profile lookup.';
