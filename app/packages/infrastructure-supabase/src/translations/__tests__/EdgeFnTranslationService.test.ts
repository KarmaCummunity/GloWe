// app/packages/infrastructure-supabase/src/translations/__tests__/EdgeFnTranslationService.test.ts
import { describe, it, expect } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createTranslationRequest } from '@kc/domain';
import { EdgeFnTranslationService } from '../EdgeFnTranslationService';

function fakeClient(invokeResult: { data: unknown; error: unknown }): SupabaseClient {
  return {
    functions: { invoke: async () => invokeResult },
  } as unknown as SupabaseClient;
}

const req = createTranslationRequest({
  contentType: 'post',
  contentId: 'p1',
  field: 'title',
  sourceLanguage: null,
  targetLanguage: 'en',
});

describe('EdgeFnTranslationService', () => {
  it('maps a translated response to CachedTranslation', async () => {
    const svc = new EdgeFnTranslationService(
      fakeClient({
        data: {
          status: 'translated',
          translation: {
            contentType: 'post',
            contentId: 'p1',
            field: 'title',
            targetLanguage: 'en',
            sourceLanguage: 'he',
            translatedText: 'Hello',
            model: 'gemini-1.5-flash',
            confidence: 0.9,
          },
        },
        error: null,
      }),
    );
    const out = await svc.requestTranslation(req, 'שלום');
    expect(out?.translatedText).toBe('Hello');
    expect(out?.sourceLanguage).toBe('he');
  });

  it('returns null on a skipped status (no translation)', async () => {
    const svc = new EdgeFnTranslationService(fakeClient({ data: { status: 'skipped' }, error: null }));
    expect(await svc.requestTranslation(req, '123')).toBeNull();
  });

  it('returns null on invoke error (graceful degradation)', async () => {
    const svc = new EdgeFnTranslationService(fakeClient({ data: null, error: { message: 'boom' } }));
    expect(await svc.requestTranslation(req, 'שלום')).toBeNull();
  });

  it('maps batch results index-aligned with items', async () => {
    const svc = new EdgeFnTranslationService(
      fakeClient({
        data: {
          results: [
            {
              contentType: 'post',
              contentId: 'p1',
              field: 'title',
              status: 'translated',
              translation: {
                contentType: 'post',
                contentId: 'p1',
                field: 'title',
                targetLanguage: 'en',
                sourceLanguage: 'he',
                translatedText: 'Hi',
                model: 'x',
                confidence: null,
              },
            },
            { contentType: 'post', contentId: 'p2', field: 'title', status: 'skipped' },
          ],
        },
        error: null,
      }),
    );
    const out = await svc.requestTranslationsBatch('en', [
      { contentType: 'post', contentId: 'p1', field: 'title' },
      { contentType: 'post', contentId: 'p2', field: 'title' },
    ]);
    expect(out[0]?.translatedText).toBe('Hi');
    expect(out[1]).toBeNull();
  });
});
