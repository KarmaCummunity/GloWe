export interface ResendSendResult {
  ok: boolean;
  id?: string;
  error?: string;
}

export async function sendViaResend(opts: {
  apiKey: string;
  from: string;
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<ResendSendResult> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${opts.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: opts.from,
      to: [opts.to],
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
    }),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = (body as { message?: string }).message || res.statusText;
    console.error('[glowe-notify] Resend error', res.status, msg);
    return { ok: false, error: msg };
  }

  const id = (body as { id?: string }).id;
  return { ok: true, id };
}
