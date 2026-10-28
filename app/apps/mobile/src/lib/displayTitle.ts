/** Strips seed/test prefixes like "[DEMO]" from user-facing titles. */
export function cleanDisplayTitle(raw: string | null | undefined): string {
  if (!raw) return '';
  return raw.replace(/^\s*(\[(demo|test|seed)\]\s*)+/i, '').trim();
}
