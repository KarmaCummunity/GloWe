// Verified external organisations (public.external_bodies) that routed-world
// listings (medical / animals / environment) must be published through (0266, 0353).

export interface ExternalBodyOption {
  readonly bodyId: string;
  readonly slug: string;
  readonly worldSlug: string;
  readonly labelHe: string;
  readonly labelEn: string;
  readonly bodyType: string;
  readonly contactUrl: string | null;
}

/** Display label for the active UI language (falls back to the other label). */
export function externalBodyLabel(body: ExternalBodyOption, language: string): string {
  const he = body.labelHe.trim();
  const en = body.labelEn.trim();
  return language.startsWith('he') ? he || en : en || he;
}

/** Case-insensitive match on he/en labels and slug, for client-side picker filtering. */
export function matchExternalBody(body: ExternalBodyOption, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    body.labelHe.toLowerCase().includes(q) ||
    body.labelEn.toLowerCase().includes(q) ||
    body.slug.toLowerCase().includes(q)
  );
}
