// supabase/functions/_shared/translation/kcSource.ts — FR-TRANSLATE-002 / 006 (KC).
//
// KC UGC source registry + field resolver for the `translate` Edge Function.
// Anti-poisoning: text is always re-read from these rows server-side, never
// from the request body. Proper names (display_name, share_handle) are absent.

export interface SourceEntry {
  table: string;
  pk: string;
  fields: Record<string, string>;
  arrayFields?: Set<string>;
}

export const SOURCE: Record<string, SourceEntry> = {
  post: {
    table: 'posts',
    pk: 'post_id',
    fields: { title: 'title', description: 'description' },
  },
  message: {
    table: 'messages',
    pk: 'message_id',
    fields: { body: 'body' },
  },
  ride_listing: {
    table: 'ride_listings',
    pk: 'ride_id',
    fields: { title: 'title', description: 'description' },
  },
  user: {
    table: 'users',
    pk: 'user_id',
    fields: { biography: 'biography' },
  },
};

export function resolveField(
  src: SourceEntry | undefined,
  field: string,
): { column: string; index: number | null } | null {
  if (!src) return null;
  const dot = field.lastIndexOf('.');
  if (dot === -1) {
    return src.fields[field] ? { column: src.fields[field], index: null } : null;
  }
  const base = field.slice(0, dot);
  const idx = field.slice(dot + 1);
  if (!/^\d+$/.test(idx)) return null;
  if (!src.arrayFields?.has(base) || !src.fields[base]) return null;
  return { column: src.fields[base], index: Number(idx) };
}
