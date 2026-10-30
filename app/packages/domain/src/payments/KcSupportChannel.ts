// Direct financial support for KC itself — FR-DONATE-011 · D20.
// The app never processes these payments: every channel is a licensed provider's
// hosted page (Bit, PayBox, Grow) opened in the external browser, so card and bank
// details never reach KC. This module holds the pure rules for which channels
// may be shown and in what order.

export const KC_SUPPORT_CHANNEL_KINDS = [
  'bit',
  'paybox',
  'card_one_time',
  'card_standing_order',
] as const;

export type KcSupportChannelKind = (typeof KC_SUPPORT_CHANNEL_KINDS)[number];

export interface KcSupportChannel {
  readonly kind: KcSupportChannelKind;
  readonly url: string;
  /** Provider name shown to the donor for transparency (e.g. "Grow"). */
  readonly providerLabel: string;
}

/** What the donor can choose: instant one-time transfers and an optional monthly standing order. */
export interface KcSupportOptions {
  readonly oneTime: readonly KcSupportChannel[];
  readonly standingOrder: KcSupportChannel | null;
}

/** Display order of one-time channels: instant-transfer apps first, card page last. */
const ONE_TIME_ORDER: readonly KcSupportChannelKind[] = ['bit', 'paybox', 'card_one_time'];

/**
 * HTTPS host with optional port, path, query or fragment — and nothing else.
 * Rejects `http:`, `javascript:`, embedded credentials (`user:pass@host`) and
 * whitespace. Mirrors the CHECK constraint in migration 0447 so a bad row can
 * never be opened even if the constraint is ever relaxed.
 */
const SECURE_SUPPORT_URL = /^https:\/\/[a-z0-9.-]+(:\d+)?([/?#]\S*)?$/i;

export function isKcSupportChannelKind(value: string): value is KcSupportChannelKind {
  return (KC_SUPPORT_CHANNEL_KINDS as readonly string[]).includes(value);
}

export function isSecureSupportUrl(url: string): boolean {
  return SECURE_SUPPORT_URL.test(url);
}

/**
 * Builds the donor-facing options from raw channels: drops insecure URLs,
 * keeps the first channel per kind, and orders one-time channels.
 */
export function buildKcSupportOptions(channels: readonly KcSupportChannel[]): KcSupportOptions {
  const byKind = new Map<KcSupportChannelKind, KcSupportChannel>();
  for (const channel of channels) {
    if (!isSecureSupportUrl(channel.url) || byKind.has(channel.kind)) continue;
    byKind.set(channel.kind, channel);
  }
  const oneTime = ONE_TIME_ORDER.flatMap((kind) => {
    const channel = byKind.get(kind);
    return channel ? [channel] : [];
  });
  return { oneTime, standingOrder: byKind.get('card_standing_order') ?? null };
}

/** True when there is at least one way to support KC. */
export function hasKcSupportOptions(options: KcSupportOptions): boolean {
  return options.oneTime.length > 0 || options.standingOrder !== null;
}
