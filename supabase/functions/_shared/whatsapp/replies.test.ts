import { assertEquals, assertNotEquals } from 'jsr:@std/assert@1';
import { isKeywordAction, keywordReply, replyKind } from './replies.ts';

Deno.test('keyword replies exist in he and en and default to he', () => {
  for (const a of ['opt_out', 'opt_in', 'help'] as const) {
    assertNotEquals(keywordReply(a, 'he'), keywordReply(a, 'en'));
    assertEquals(keywordReply(a, null), keywordReply(a, 'he'));
  }
  assertEquals(keywordReply('opt_out', 'en').includes('START'), true);
});

Deno.test('consent changes use the consent_confirmation reply kind', () => {
  assertEquals(replyKind('opt_out'), 'consent_confirmation');
  assertEquals(replyKind('opt_in'), 'consent_confirmation');
  assertEquals(replyKind('help'), 'help');
  assertEquals(isKeywordAction('stop'), false);
  assertEquals(isKeywordAction(null), false);
});
