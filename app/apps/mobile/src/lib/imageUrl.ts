// Builds Supabase Storage public URLs.
//
// Two helpers:
//   - getSupabasePublicImageUrl  — full-size object URL
//   - getSupabaseImageThumbUrl   — derives the sibling -thumb path
//
// Background: the `/storage/v1/render/image/` transform endpoint
// (`?width=N&quality=N`) returns 404 or hangs on the `post-images` bucket on
// the dev Supabase project (likely a transform-quota / config issue at the
// Storage tier). PR #397 reverted Wave 1's transform-based resize. The
// replacement path (PERF-4) generates a sibling `<path>-thumb.<ext>` at
// upload time and serves that for small surfaces (feed thumb, avatar circle).
// No transform endpoint, no CDN required.
//
// The transform endpoint stays in the code behind
// `EXPO_PUBLIC_USE_STORAGE_TRANSFORM=1` so a future CDN wave can re-enable it
// alongside an edge that guarantees the pipeline works.

import { getSupabasePublicEnv } from './supabasePublicConfig';

type Args = { bucket: string; path: string; width?: number; quality?: number };
type ThumbArgs = { bucket: string; path: string };

function getSupabaseBaseUrl(): string | null {
  const env = getSupabasePublicEnv();
  if (!env) return null;
  return env.url.replace(/\/$/, '');
}

const USE_TRANSFORM = process.env.EXPO_PUBLIC_USE_STORAGE_TRANSFORM === '1';

export function getSupabasePublicImageUrl({ bucket, path, width, quality }: Args): string {
  if (!path) return '';
  const base = getSupabaseBaseUrl();
  if (!base) return '';
  const wantsTransform =
    USE_TRANSFORM && (typeof width === 'number' || typeof quality === 'number');
  if (!wantsTransform) {
    return `${base}/storage/v1/object/public/${bucket}/${path}`;
  }
  const params = new URLSearchParams();
  if (typeof width === 'number') params.set('width', String(width));
  if (typeof quality === 'number') params.set('quality', String(quality));
  return `${base}/storage/v1/render/image/public/${bucket}/${path}?${params.toString()}`;
}

/** `a/b/c.jpg` → `a/b/c-thumb.jpg`. Returns the input unchanged if no extension. */
export function deriveThumbPath(path: string): string {
  if (!path) return path;
  const dotIdx = path.lastIndexOf('.');
  const slashIdx = path.lastIndexOf('/');
  if (dotIdx === -1 || dotIdx < slashIdx) return `${path}-thumb`;
  return `${path.slice(0, dotIdx)}-thumb${path.slice(dotIdx)}`;
}

/** Public URL for the sibling `-thumb` object alongside the full image. */
export function getSupabaseImageThumbUrl({ bucket, path }: ThumbArgs): string {
  if (!path) return '';
  return getSupabasePublicImageUrl({ bucket, path: deriveThumbPath(path) });
}

/**
 * Given a full Supabase Storage public URL (optionally with a `?v=` cache-bust
 * suffix from the avatar pipeline), return the URL pointing at the sibling
 * `-thumb` object. Returns the input unchanged if it isn't a Supabase Storage
 * URL we recognise (e.g., a Google OAuth avatar).
 */
export function deriveThumbUrl(fullUrl: string): string {
  if (!fullUrl) return fullUrl;
  if (!fullUrl.includes('/storage/v1/object/public/')) return fullUrl;
  try {
    const url = new URL(fullUrl);
    url.pathname = deriveThumbPath(url.pathname);
    return url.toString();
  } catch {
    return fullUrl;
  }
}
