// app/packages/infrastructure-supabase/src/translations/EdgeFnTranslationService.ts
import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  BatchTranslationItem,
  CachedTranslation,
  ITranslationService,
} from '@kc/application';
import type { TranslationRequest } from '@kc/domain';

interface SingleEdgeResponse {
  status: 'translated' | 'cached' | 'skipped';
  translation?: CachedTranslation;
}

interface BatchEdgeResponse {
  results?: Array<{
    contentType: string;
    contentId: string;
    field: string;
    status: string;
    translation?: CachedTranslation;
  }>;
}

export class EdgeFnTranslationService implements ITranslationService {
  constructor(private readonly client: SupabaseClient) {}

  async requestTranslation(
    request: TranslationRequest,
    sourceText: string,
  ): Promise<CachedTranslation | null> {
    const { data, error } = await this.client.functions.invoke<SingleEdgeResponse>('translate', {
      body: {
        contentType: request.contentType,
        contentId: request.contentId,
        field: request.field,
        targetLanguage: request.targetLanguage,
        sourceText,
      },
    });
    if (error || !data || !data.translation) return null;
    return data.translation;
  }

  async requestTranslationsBatch(
    targetLanguage: string,
    items: BatchTranslationItem[],
  ): Promise<(CachedTranslation | null)[]> {
    if (items.length === 0) return [];
    const { data, error } = await this.client.functions.invoke<BatchEdgeResponse>('translate', {
      body: {
        targetLanguage,
        items: items.map((it) => ({
          contentType: it.contentType,
          contentId: it.contentId,
          field: it.field,
        })),
      },
    });
    if (error || !data?.results) {
      return items.map(() => null);
    }
    return data.results.map((r) =>
      r.translation && (r.status === 'translated' || r.status === 'cached') ? r.translation : null,
    );
  }
}
