// glowe-notify — transactional email for GloWe (migration 0239).
// Invoked by pg_net on INSERT into glowe_email_outbox (and the retry cron).
// Requires: RESEND_API_KEY, GLOWE_FROM_EMAIL (e.g. "GloWe <notify@glowe.app>").

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { type Handler, withTiming } from '../_shared/withTiming.ts';
import { buildGloweEmail, type GloweEmailTemplate } from './templates.ts';
import { sendViaResend } from './resend.ts';

interface OutboxRow {
  email_id: string;
  template: GloweEmailTemplate;
  to_email: string;
  payload: Record<string, unknown>;
  sent_at: string | null;
  attempts: number;
}

interface WebhookPayload {
  type: 'INSERT' | 'RETRY';
  table: string;
  record: OutboxRow;
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const FROM_EMAIL = Deno.env.get('GLOWE_FROM_EMAIL') ?? 'GloWe <onboarding@resend.dev>';
const SITE_URL = Deno.env.get('GLOWE_SITE_URL') ?? 'https://dev.karma-community.pages.dev/glowe';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

async function recordAttempt(emailId: string, sent: boolean, error: string | null) {
  const { data } = await supabase
    .from('glowe_email_outbox')
    .select('attempts')
    .eq('email_id', emailId)
    .maybeSingle();
  const attempts = ((data as { attempts?: number } | null)?.attempts ?? 0) + 1;
  await supabase
    .from('glowe_email_outbox')
    .update({
      attempts,
      last_error: error,
      ...(sent ? { sent_at: new Date().toISOString() } : {}),
    })
    .eq('email_id', emailId);
}

const handler: Handler = async (req) => {
  const auth = req.headers.get('Authorization') ?? '';
  if (auth !== `Bearer ${SERVICE_ROLE_KEY}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const payload = (await req.json()) as WebhookPayload;
  const row = payload.record;
  if (!row?.email_id) return new Response('No record', { status: 400 });
  if (row.sent_at) return new Response('Already sent', { status: 200 });

  if (!RESEND_API_KEY) {
    console.warn('[glowe-notify] RESEND_API_KEY unset — email queued but not sent', row.email_id);
    await recordAttempt(row.email_id, false, 'resend_not_configured');
    return new Response('OK', { status: 200 });
  }

  try {
    const content = buildGloweEmail(row.template, row.payload ?? {}, SITE_URL);
    const result = await sendViaResend({
      apiKey: RESEND_API_KEY,
      from: FROM_EMAIL,
      to: row.to_email,
      subject: content.subject,
      html: content.html,
      text: content.text,
    });

    if (!result.ok) {
      await recordAttempt(row.email_id, false, result.error ?? 'resend_failed');
      return new Response('Send failed', { status: 502 });
    }

    console.log('[glowe-notify] sent', { email_id: row.email_id, template: row.template, resend_id: result.id });
    await recordAttempt(row.email_id, true, null);
    return new Response('OK', { status: 200 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[glowe-notify] handler error', msg);
    await recordAttempt(row.email_id, false, msg);
    return new Response('Error', { status: 500 });
  }
};

Deno.serve(withTiming('glowe-notify', handler));
