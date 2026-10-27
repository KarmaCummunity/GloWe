import { assertEquals } from 'jsr:@std/assert@1';
import { translateMany } from './batch.ts';
import type { ProviderInput, ProviderResult, TranslationProvider } from './provider.ts';

class FakeProvider implements TranslationProvider {
  active = 0; peak = 0;
  translate(input: ProviderInput): Promise<ProviderResult> {
    this.active++; this.peak = Math.max(this.peak, this.active);
    return new Promise((res, rej) => setTimeout(() => {
      this.active--;
      if (input.text === 'BOOM') { rej(new Error('x')); return; }
      res({ translatedText: input.text.toUpperCase(), detectedSourceLanguage: 'he', confidence: null, model: 'fake' });
    }, 5));
  }
}

Deno.test('translateMany preserves order and caps concurrency', async () => {
  const p = new FakeProvider();
  const inputs = ['a', 'b', 'c', 'd'].map((t) => ({ text: t, targetLanguage: 'en' }));
  const out = await translateMany(p, inputs, 2);
  assertEquals(out.map((r) => r?.translatedText), ['A', 'B', 'C', 'D']);
  assertEquals(p.peak <= 2, true);
});

Deno.test('translateMany yields null for a failing item', async () => {
  const p = new FakeProvider();
  const inputs = [{ text: 'ok', targetLanguage: 'en' }, { text: 'BOOM', targetLanguage: 'en' }];
  const out = await translateMany(p, inputs, 2);
  assertEquals(out[0]?.translatedText, 'OK');
  assertEquals(out[1], null);
});
