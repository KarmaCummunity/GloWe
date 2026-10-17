import { assertEquals } from 'jsr:@std/assert@1';
import { buildPayload, classifyFailure, type FetchFn, sendMessage } from './meta.ts';

const cfg = { token: 'test-token-not-real', phoneNumberId: '1234567890', graphVersion: 'v21.0' };

function mockFetch(status: number, body: unknown, calls: { url: string; init?: RequestInit }[] = []): FetchFn {
  return (url, init) => {
    calls.push({ url, init });
    return Promise.resolve(new Response(JSON.stringify(body), { status }));
  };
}

Deno.test('sendMessage posts a session text to the Graph messages endpoint', async () => {
  const calls: { url: string; init?: RequestInit }[] = [];
  const res = await sendMessage(cfg, { kind: 'session', to: '972500000001', body: 'hi' },
    mockFetch(200, { messages: [{ id: 'wamid.X' }] }, calls));
  assertEquals(res, { ok: true, waMessageId: 'wamid.X' });
  assertEquals(calls[0].url, 'https://graph.facebook.com/v21.0/1234567890/messages');
  assertEquals((calls[0].init?.headers as Record<string, string>).Authorization, 'Bearer test-token-not-real');
  const sent = JSON.parse(String(calls[0].init?.body));
  assertEquals(sent.type, 'text');
  assertEquals(sent.text.body, 'hi');
});

Deno.test('buildPayload renders template name, language and ordered params', () => {
  const p = buildPayload({ kind: 'template', to: '9725', templateName: 'match_found_v1', language: 'en', params: ['Items', 'Open app'] });
  assertEquals(p.type, 'template');
  assertEquals(p.template, {
    name: 'match_found_v1',
    language: { code: 'en' },
    components: [{ type: 'body', parameters: [{ type: 'text', text: 'Items' }, { type: 'text', text: 'Open app' }] }],
  });
});

Deno.test('429 / 5xx / throttling codes are retryable, outside-window is not', async () => {
  const r429 = await sendMessage(cfg, { kind: 'session', to: '1', body: 'x' },
    mockFetch(429, { error: { code: 130429, message: 'Rate limit hit' } }));
  assertEquals(r429.ok, false);
  if (!r429.ok) assertEquals(r429.retryable, true);

  const r400 = await sendMessage(cfg, { kind: 'session', to: '1', body: 'x' },
    mockFetch(400, { error: { code: 131047, message: 'Re-engagement message' } }));
  assertEquals(r400.ok, false);
  if (!r400.ok) {
    assertEquals(r400.retryable, false);
    assertEquals(r400.error.includes('131047'), true);
    assertEquals(r400.error.includes('test-token-not-real'), false);
  }

  assertEquals(classifyFailure(503, null), true);
  assertEquals(classifyFailure(400, 131026), false);
  assertEquals(classifyFailure(400, 131056), true);
});

Deno.test('network errors are retryable', async () => {
  const res = await sendMessage(cfg, { kind: 'session', to: '1', body: 'x' },
    () => Promise.reject(new TypeError('connection reset')));
  assertEquals(res, { ok: false, error: 'network: connection reset', retryable: true });
});
