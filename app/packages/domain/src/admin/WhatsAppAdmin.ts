export type WhatsAppChannelConfig = {
  isEnabled: boolean;
  phoneNumberId: string | null;
  graphApiVersion: string | null;
  updatedAt: Date | null;
};

export type WhatsAppAdminOverview = {
  channelEnabled: boolean;
  since: Date;
  outboundQueued: number;
  outboundSent: number;
  outboundFailed: number;
  outboundSkipped: number;
  consentOptedIn: number;
  consentOptedOut: number;
  sessions7d: number;
  matchesSent7d: number;
  rateHits7d: number;
};

export type WhatsAppConsentRow = {
  userId: string | null;
  waIdMasked: string | null;
  consentStatus: string;
  optedIn: boolean;
  optedInAt: Date | null;
  optedOutAt: Date | null;
  preferredLanguage: string | null;
  lastInboundAt: Date | null;
  updatedAt: Date;
};

export type WhatsAppOutboundRow = {
  outboundId: string;
  userId: string | null;
  waIdMasked: string | null;
  kind: string;
  templateName: string | null;
  language: string;
  status: string;
  attempts: number;
  lastError: string | null;
  createdAt: Date;
  sentAt: Date | null;
  nextAttemptAt: Date | null;
};

export type WhatsAppRateHit = {
  bucket: string;
  windowStart: Date;
  hits: number;
};

export type WhatsAppMatchSentRow = {
  outboundId: string;
  userId: string | null;
  waIdMasked: string | null;
  language: string;
  status: string;
  payload: Record<string, unknown>;
  createdAt: Date;
  sentAt: Date | null;
};

export type WhatsAppConversationRow = {
  sessionId: string;
  waIdMasked: string | null;
  userId: string | null;
  state: string;
  listingId: string | null;
  updatedAt: Date;
  createdAt: Date;
};

export class WhatsAppAdminError extends Error {
  constructor(
    public readonly code:
      | 'forbidden'
      | 'not_found'
      | 'invalid_status'
      | 'not_resendable'
      | 'unknown',
    message?: string,
  ) {
    super(message ?? code);
    this.name = 'WhatsAppAdminError';
  }
}

export function isWhatsAppAdminError(e: unknown): e is WhatsAppAdminError {
  return e instanceof WhatsAppAdminError;
}
