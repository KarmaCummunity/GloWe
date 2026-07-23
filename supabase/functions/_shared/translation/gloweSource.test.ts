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

// Guard: every content type the spec (FR-TRANSLATE-005 AC4) mandates must stay
// registered with its documented fields, so a future edit/extraction cannot
// silently drop one (as happened to glowe_forum_thread/reply before).
Deno.test('every spec-mandated content type resolves its documented fields', () => {
  const expected: Record<string, string[]> = {
    glowe_post: ['title', 'text', 'tags.0'],
    glowe_comment: ['text'],
    glowe_opportunity: ['title', 'description', 'requirements.0', 'responsibilities.0'],
    glowe_project: ['title', 'description'],
    glowe_profile: ['about', 'focus', 'needs', 'org_description', 'org_field'],
    glowe_forum_thread: ['title', 'body'],
    glowe_forum_reply: ['body'],
  };
  for (const [type, fields] of Object.entries(expected)) {
    const src = SOURCE[type];
    assertEquals(!!src, true, `missing content type ${type}`);
    for (const f of fields) {
      assertEquals(resolveField(src, f) !== null, true, `${type}.${f} should resolve`);
    }
  }
});
