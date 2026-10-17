import type { ExternalBodyOption } from '@kc/domain';
import type { Database } from '../database.types';

export type ExternalBodyRow = Database['public']['Functions']['search_external_bodies']['Returns'][number];

export function mapExternalBody(row: ExternalBodyRow): ExternalBodyOption {
  return {
    bodyId: row.body_id,
    slug: row.slug,
    worldSlug: row.world_slug,
    labelHe: row.label_he,
    labelEn: row.label_en,
    bodyType: row.body_type,
    contactUrl: row.contact_url ?? null,
  };
}
