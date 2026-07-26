// supabase/functions/glowe-translate/cache.ts
// Service-role get/insert over glowe_content_translations. content_id is TEXT.

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

export interface CacheKey {
  contentType: string;
  contentId: string;
  field: string;
  targetLanguage: string;
}
export interface CacheRow extends CacheKey {
  sourceLanguage: string | null;
  translatedText: string;
  model: string | null;
  confidence: number | null;
}

const COLUMNS =
  'content_type, content_id, field, target_language, source_language, translated_text, model, confidence';

export async function getCached(svc: SupabaseClient, key: CacheKey): Promise<CacheRow | null> {
  const { data, error } = await svc
    .from('glowe_content_translations')
    .select(COLUMNS)
    .eq('content_type', key.contentType)
    .eq('content_id', key.contentId)
    .eq('field', key.field)
    .eq('target_language', key.targetLanguage)
    .maybeSingle();
  if (error) throw new Error(`getCached: ${error.message}`);
  return data ? mapRow(data) : null;
}

/** Returns true if this call inserted; false if a row already existed (23505). */
export async function putIfAbsent(svc: SupabaseClient, row: CacheRow): Promise<boolean> {
  const { error } = await svc.from('glowe_content_translations').insert({
    content_type: row.contentType,
    content_id: row.contentId,
    field: row.field,
    target_language: row.targetLanguage,
    source_language: row.sourceLanguage,
    translated_text: row.translatedText,
    model: row.model,
    confidence: row.confidence,
  });
  if (!error) return true;
  if ((error as { code?: string }).code === '23505') return false;
  throw new Error(`putIfAbsent: ${error.message}`);
}

/** Drop a cache row so a fresh translate can insert (poison / identical-text recovery). */
export async function deleteCached(svc: SupabaseClient, key: CacheKey): Promise<void> {
  const { error } = await svc
    .from('glowe_content_translations')
    .delete()
    .eq('content_type', key.contentType)
    .eq('content_id', key.contentId)
    .eq('field', key.field)
    .eq('target_language', key.targetLanguage);
  if (error) throw new Error(`deleteCached: ${error.message}`);
}

function mapRow(d: Record<string, unknown>): CacheRow {
  return {
    contentType: d.content_type as string,
    contentId: d.content_id as string,
    field: d.field as string,
    targetLanguage: d.target_language as string,
    sourceLanguage: (d.source_language as string | null) ?? null,
    translatedText: d.translated_text as string,
    model: (d.model as string | null) ?? null,
    confidence: (d.confidence as number | null) ?? null,
  };
}
