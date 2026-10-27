// app/packages/application/src/ports/ITranslationService.ts
import type { ContentType, TranslationField, TranslationRequest } from '@kc/domain';
import type { CachedTranslation } from './ITranslationCacheRepository';

/** One cache-miss item for batched materialization (no client source text). */
export interface BatchTranslationItem {
  readonly contentType: ContentType;
  readonly contentId: string;
  readonly field: TranslationField;
}

/**
 * FR-TRANSLATE-002 (Phase 1b) — client-facing seam to the server-owned
 * translate pipeline. Consumed by Phase 1c's read path on a cache miss.
 */
export interface ITranslationService {
  /**
   * Request a single translation for `request`, passing the original source text.
   * Returns the cached/produced translation, or `null` when nothing was produced
   * (untranslatable, same language, or any failure — caller shows the original).
   */
  requestTranslation(request: TranslationRequest, sourceText: string): Promise<CachedTranslation | null>;

  /**
   * Batch miss resolution (FR-TRANSLATE-006 on KC `translate`). Results are
   * index-aligned with `items`; null entries mean skip/failure for that slot.
   */
  requestTranslationsBatch(
    targetLanguage: string,
    items: BatchTranslationItem[],
  ): Promise<(CachedTranslation | null)[]>;
}
