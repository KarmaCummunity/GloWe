import { assertEquals, assertRejects } from 'jsr:@std/assert@1';
import type { OutboundMessage, SendResult } from './meta.ts';
import { type RpcFn, runSenderBatch, toOutboundMessage } from './sender.ts';

type Call = { fn: string; args: Record<string, unknown> };

function fakeRpc(rows: unknown[], calls: Call[]): RpcFn {
  return (fn, args) => {
    calls.push({ fn, args });
    if (fn === 'api_whatsapp_outbound_claim') return Promise.resolve({ data: rows, error: null });
    if (fn === 'api_whatsapp_outbound_result') {
      const status = args.p_ok ? 'sent' : args.p_retryable ? 'queued' : 'failed';
      return Promise.resolve({ data: status, error: null });
    }
    return Promise.resolve({ data: null, error: { message: `unexpected ${fn}` } });
  };
}

const row = (id: string, extra: Record<string, unknown> = {}) => ({
  outbound_id: id, kind: 'session', to_wa_id: '972500000001', language: 'he',
  template_name: null, body: 'hello', payload: {}, ...extra,
});

Deno.test('runSenderBatch sends each claimed row and reports sent / retry / fail', async () => {
  const calls: Call[] = [];
  const sent: OutboundMessage[] = [];
  const results: SendResult[] = [
    { ok: true, waMessageId: 'wamid.1' },
    { ok: false, error: 'HTTP 429', retryable: true },
    { ok: false, error: 'HTTP 400 code 131047', retryable: false },
  ];
  const summary = await runSenderBatch({
    rpc: fakeRpc([row('a'), row('b'), row('c')], calls),
    send: (m) => { sent.push(m); return Promise.resolve(results[sent.length - 1]); },
    batch: 5,
  });
  assertEquals(summary, { claimed: 3, sent: 1, retried: 1, failed: 1 });
  assertEquals(calls[0], { fn: 'api_whatsapp_outbound_claim', args: { p_batch: 5, p_visibility_seconds: 60 } });
  const resultArgs = calls.filter((c) => c.fn === 'api_whatsapp_outbound_result').map((c) => c.args);
  assertEquals(resultArgs[0], { p_outbound_id: 'a', p_ok: true, p_wa_message_id: 'wamid.1', p_error: null, p_retryable: false });
  assertEquals(resultArgs[1].p_retryable, true);
  assertEquals(resultArgs[2].p_retryable, false);
});

Deno.test('malformed rows are failed without calling Meta', async () => {
  const calls: Call[] = [];
  let sends = 0;
  const summary = await runSenderBatch({
    rpc: fakeRpc([row('x', { to_wa_id: null })], calls),
    send: () => { sends++; return Promise.resolve({ ok: true, waMessageId: null }); },
  });
  assertEquals(sends, 0);
  assertEquals(summary.failed, 1);
});

Deno.test('nothing claimed (caps exhausted) → no sends', async () => {
  let sends = 0;
  const summary = await runSenderBatch({
    rpc: fakeRpc([], []),
    send: () => { sends++; return Promise.resolve({ ok: true, waMessageId: null }); },
  });
  assertEquals(summary, { claimed: 0, sent: 0, retried: 0, failed: 0 });
  assertEquals(sends, 0);
});

Deno.test('claim errors propagate', async () => {
  await assertRejects(() => runSenderBatch({
    rpc: () => Promise.resolve({ data: null, error: { message: 'boom' } }),
    send: () => Promise.resolve({ ok: true, waMessageId: null }),
  }), Error, 'claim failed: boom');
});

Deno.test('toOutboundMessage maps template rows with params', () => {
  assertEquals(
    toOutboundMessage(row('t', { kind: 'template', template_name: 'match_found_v1', language: 'en', payload: { params: ['a', 2] } }) as never),
    { kind: 'template', to: '972500000001', templateName: 'match_found_v1', language: 'en', params: ['a', '2'] },
  );
});
