import { assertEquals } from 'jsr:@std/assert@1';
import { resolveField, SOURCE } from './gloweSource.ts';

Deno.test('resolveField maps scalar and array-element fields', () => {
  assertEquals(resolveField(SOURCE.glowe_post, 'title'), { column: 'title', index: null });
  assertEquals(resolveField(SOURCE.glowe_opportunity, 'requirements.2'), { column: 'requirements', index: 2 });
});

Deno.test('resolveField rejects unknown / non-array-index fields', () => {
  assertEquals(resolveField(SOURCE.glowe_post, 'author_name'), null);
  assertEquals(resolveField(SOURCE.glowe_post, 'title.0'), null); // title is not an arrayField
  assertEquals(resolveField(SOURCE.glowe_opportunity, 'organization'), null); // name — never translated
});

Deno.test('SOURCE excludes proper names from every content type', () => {
  assertEquals(resolveField(SOURCE.glowe_profile, 'display_name'), null);
  assertEquals(resolveField(SOURCE.glowe_opportunity, 'organization'), null);
});
