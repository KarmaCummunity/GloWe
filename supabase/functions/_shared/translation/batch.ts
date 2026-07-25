// supabase/functions/_shared/translation/batch.ts
// Order-preserving, bounded-concurrency fan-out over a TranslationProvider.
// The default GoogleFreeProvider translates one string per request, so a batch
// of N misses becomes N concurrent provider calls behind ONE Edge round-trip.
// A per-item failure resolves to null (caller renders source) — never throws.
import type { ProviderInput, ProviderResult, TranslationProvider } from './provider.ts';

export async function translateMany(
  provider: TranslationProvider,
  inputs: ProviderInput[],
  concurrency: number,
): Promise<(ProviderResult | null)[]> {
  const out = new Array<ProviderResult | null>(inputs.length).fill(null);
  let next = 0;
  const workers: Promise<void>[] = [];
  const n = Math.max(1, Math.min(concurrency, inputs.length));
  const worker = async () => {
    while (next < inputs.length) {
      const i = next++;
      try { out[i] = await provider.translate(inputs[i]); }
      catch { out[i] = null; }
    }
  };
  for (let w = 0; w < n; w++) workers.push(worker());
  await Promise.all(workers);
  return out;
}
