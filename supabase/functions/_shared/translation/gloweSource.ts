// supabase/functions/_shared/translation/gloweSource.ts — FR-TRANSLATE-006.
//
// GLOWE content source registry + field resolver, shared by the single and
// batch paths of the `glowe-translate` Edge Function. Extracted from
// glowe-translate/index.ts so both paths reuse ONE allow-list (duplication
// gate). Anti-poisoning: the text to translate is always re-read from these
// source rows server-side, never taken from the request body. Proper names
// (author_name, organization, display_name) are deliberately absent — never
// translated (FR-GLOWE-024 / D-179 handle names via bilingual columns).

export interface SourceEntry {
  table: string;
  pk: string;
  fields: Record<string, string>;
  // Columns stored as text[]; a per-element request field ("requirements.0")
  // caches each element independently.
  arrayFields?: Set<string>;
}

export const SOURCE: Record<string, SourceEntry> = {
  glowe_post: {
    table: 'glowe_posts',
    pk: 'id',
    fields: { title: 'title', text: 'text', tags: 'tags' },
    arrayFields: new Set(['tags']),
  },
  glowe_comment: {
    table: 'glowe_comments',
    pk: 'id',
    fields: { text: 'text' },
  },
  glowe_opportunity: {
    table: 'glowe_opportunities',
    pk: 'id',
    fields: {
      title: 'title', description: 'description',
      requirements: 'requirements', responsibilities: 'responsibilities',
    },
    arrayFields: new Set(['requirements', 'responsibilities']),
  },
  glowe_project: {
    table: 'glowe_projects',
    pk: 'id',
    fields: { title: 'title', description: 'description' },
  },
  glowe_profile: {
    table: 'glowe_profiles',
    pk: 'id',
    fields: {
      about: 'about', focus: 'focus', needs: 'needs',
      org_description: 'org_description', org_field: 'org_field',
    },
  },
};

// Resolve a request field to its source column + optional array index. A scalar
// field ("title") → { column, index: null }. An array element ("requirements.3")
// → { column: 'requirements', index: 3 } iff the base is a declared arrayField.
// Returns null for anything not in the allow-list.
export function resolveField(
  src: SourceEntry,
  field: string,
): { column: string; index: number | null } | null {
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
