import { assertEquals } from 'jsr:@std/assert@1';
import { resolveField, SOURCE } from './kcSource.ts';

Deno.test('resolveField maps scalar fields for KC content types', () => {
  assertEquals(resolveField(SOURCE.post, 'title'), { column: 'title', index: null });
  assertEquals(resolveField(SOURCE.message, 'body'), { column: 'body', index: null });
  assertEquals(resolveField(SOURCE.ride_listing, 'description'), { column: 'description', index: null });
  assertEquals(resolveField(SOURCE.user, 'biography'), { column: 'biography', index: null });
});

Deno.test('resolveField rejects proper names and unknown fields', () => {
  assertEquals(resolveField(SOURCE.post, 'display_name'), null);
  assertEquals(resolveField(SOURCE.user, 'display_name'), null);
  assertEquals(resolveField(SOURCE.ride_listing, 'owner_id'), null);
});

Deno.test('every registered KC content type resolves documented fields', () => {
  const expected: Record<string, string[]> = {
    post: ['title', 'description'],
    message: ['body'],
    ride_listing: ['title', 'description'],
    user: ['biography'],
  };
  for (const [type, fields] of Object.entries(expected)) {
    const src = SOURCE[type];
    assertEquals(!!src, true, `missing content type ${type}`);
    for (const f of fields) {
      assertEquals(resolveField(src, f) !== null, true, `${type}.${f} should resolve`);
    }
  }
});
