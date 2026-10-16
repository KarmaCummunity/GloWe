// whatsapp-webhook — Issue #843 (Meta verify + signature + idempotent ingest)

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const VERIFY_TOKEN = Deno.env.get('WHATSAPP_VERIFY_TOKEN') ?? '';
const APP_SECRET = Deno.env.get('WHATSAPP_APP_SECRET') ?? '';

async function hmacSha256Hex(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

async function verifySignature(rawBody: string, header: string | null): Promise<boolean> {
  if (!APP_SECRET) return Deno.env.get('WHATSAPP_SKIP_SIGNATURE_VERIFY') === 'true';
  if (!header?.startsWith('sha256=')) return false;
  const expected = await hmacSha256Hex(APP_SECRET, rawBody);
  return timingSafeEqual(header.slice('sha256='.length), expected);
}

serve(async (req) => {
  const url = new URL(req.url);

  if (req.method === 'GET') {
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');
    if (mode === 'subscribe' && token === VERIFY_TOKEN && challenge) {
      return new Response(challenge, { status: 200 });
    }
    return new Response('forbidden', { status: 403 });
  }

  if (req.method !== 'POST') {
    return new Response('method not allowed', { status: 405 });
  }

  const rawBody = await req.text();
  const sigHeader = req.headers.get('x-hub-signature-256');
  if (!(await verifySignature(rawBody, sigHeader))) {
    return new Response('invalid signature', { status: 401 });
  }

  const body = JSON.parse(rawBody);
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
  const entries = body.entry ?? [];

  const ingested: string[] = [];
  for (const entry of entries) {
    for (const change of entry.changes ?? []) {
      const value = change.value;
      for (const msg of value?.messages ?? []) {
        const messageId = String(msg.id ?? '');
        if (!messageId) continue;
        const { data, error } = await supabase.rpc('api_whatsapp_ingest_inbound', {
          p_message_id: messageId,
          p_payload: { message: msg, metadata: value?.metadata ?? {} },
        });
        if (error) {
          return new Response(JSON.stringify({ ok: false, error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        ingested.push(data as string);
      }
    }
  }

  return new Response(JSON.stringify({ ok: true, record_ids: ingested }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
