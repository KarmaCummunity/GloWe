// whatsapp-webhook — Issues #843 / #937 / #938. Logic lives in handler.ts (unit-tested).

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { createWebhookHandler } from './handler.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

serve(createWebhookHandler({
  rpc: async (fn, args) => {
    const { data, error } = await supabase.rpc(fn, args);
    return { data, error: error ? { message: error.message } : null };
  },
  verifyToken: Deno.env.get('WHATSAPP_VERIFY_TOKEN') ?? '',
  appSecret: Deno.env.get('WHATSAPP_APP_SECRET') ?? '',
  skipSignatureVerify: Deno.env.get('WHATSAPP_SKIP_SIGNATURE_VERIFY') === 'true',
}));
