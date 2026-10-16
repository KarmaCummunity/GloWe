// Content/field taxonomy for UGC translation. Posts carry title/description;
// messages carry body. See design §4. FR-TRANSLATE-002.

export const CONTENT_TYPES = ['post', 'message', 'ride_listing', 'user'] as const;
export type ContentType = (typeof CONTENT_TYPES)[number];

export const TRANSLATION_FIELDS = ['title', 'description', 'body', 'biography'] as const;
export type TranslationField = (typeof TRANSLATION_FIELDS)[number];

export function isContentType(v: unknown): v is ContentType {
  return typeof v === 'string' && (CONTENT_TYPES as readonly string[]).includes(v);
}

export function isTranslationField(v: unknown): v is TranslationField {
  return typeof v === 'string' && (TRANSLATION_FIELDS as readonly string[]).includes(v);
}
