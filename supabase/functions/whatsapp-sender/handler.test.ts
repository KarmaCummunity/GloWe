import { assertEquals } from 'jsr:@std/assert@1';
import type { FetchFn } from '../_shared/whatsapp/meta.ts';
import type { RpcFn } from '../_shared/whatsapp/sender.ts';
import { createSenderHandler, type SenderDeps } from './handler.ts';

const post = (h: (r: Request) => Promise<Response>) =>
  h(new Request('https://x/functions/v1/whatsapp-sender', { method: 'POST', body: '{}' }));

function base(over: Partial<SenderDeps> = {}, fetchCalls: string[] = []): SenderDeps {
  const rpc: RpcFn = (fn, args) => {
    if (fn === 'api_whatsapp_outbound_claim') {
      return Promise.resolve({ data: [{
        outbound_id: 'o1', kind: 'template', to_wa_id: '972500000001', language: 'he',
        template_name: 'match_found_v1', body: null, payload: {},
      }], error: null });
    }
    return Promise.resolve({ data: args.p_ok ? 'sent' : 'queued', error: null });
  };
  const fetchFn: FetchFn = (url) => {
    fetchCalls.push(url);
    return Promise.resolve(new Response(JSON.stringify({ messages: [{ id: 'wamid.ok' }] }), { status: 200 }));
  };
  return {
    rpc,
    loadChannelConfig: () => Promise.resolve({ is_enabled: true, phone_number_id: null, graph_api_version: 'v21.0' }),
    token: 'fake-token',
    phoneNumberId: '555',
    graphVersion: '',
    fetchFn,
    ...over,
  };
}

Deno.test('disabled channel (the default) sends nothing', async () => {
  const calls: string[] = [];
  const res = await post(createSenderHandler(base({
    loadChannelConfig: () => Promise.resolve({ is_enabled: false, phone_number_id: null, graph_api_version: null }),
  }, calls)));
  assertEquals(await res.json(), { ok: true, skipped: 'channel_disabled' });
  assertEquals(calls.length, 0);
});

Deno.test('missing token → not_configured, nothing sent', async () => {
  const calls: string[] = [];
  const res = await post(createSenderHandler(base({ token: '' }, calls)));
  assertEquals(await res.json(), { ok: true, skipped: 'not_configured' });
  assertEquals(calls.length, 0);
});

Deno.test('enabled + configured: claims and sends through the (mocked) Graph API', async () => {
  const calls: string[] = [];
  const res = await post(createSenderHandler(base({}, calls)));
  assertEquals(await res.json(), { ok: true, claimed: 1, sent: 1, retried: 0, failed: 0 });
  assertEquals(calls, ['https://graph.facebook.com/v21.0/555/messages']);
});
