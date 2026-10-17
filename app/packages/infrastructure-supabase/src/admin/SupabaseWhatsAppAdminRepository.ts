import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  IWhatsAppAdminRepository,
  WhatsAppOutboundListFilters,
} from '@kc/application';
import {
  WhatsAppAdminError,
  type WhatsAppAdminOverview,
  type WhatsAppChannelConfig,
  type WhatsAppConsentRow,
  type WhatsAppConversationRow,
  type WhatsAppMatchSentRow,
  type WhatsAppOutboundRow,
  type WhatsAppRateHit,
} from '@kc/domain';

function toError(err: { message?: string; code?: string } | null): WhatsAppAdminError {
  const msg = err?.message ?? '';
  if (err?.code === '42501' || msg === 'forbidden') return new WhatsAppAdminError('forbidden');
  if (err?.code === 'P0002' || msg.includes('not_found') || msg.includes('missing')) {
    return new WhatsAppAdminError('not_found', msg);
  }
  if (msg === 'invalid_status') return new WhatsAppAdminError('invalid_status');
  if (msg === 'not_resendable') return new WhatsAppAdminError('not_resendable');
  return new WhatsAppAdminError('unknown', msg);
}

function asDate(v: string | null | undefined): Date | null {
  return v ? new Date(v) : null;
}

function mapChannel(raw: Record<string, unknown>): WhatsAppChannelConfig {
  return {
    isEnabled: Boolean(raw.is_enabled),
    phoneNumberId: (raw.phone_number_id as string | null) ?? null,
    graphApiVersion: (raw.graph_api_version as string | null) ?? null,
    updatedAt: asDate(raw.updated_at as string | null),
  };
}

export class SupabaseWhatsAppAdminRepository implements IWhatsAppAdminRepository {
  constructor(private readonly client: SupabaseClient) {}

  async getChannel(): Promise<WhatsAppChannelConfig> {
    const { data, error } = await this.client.rpc('api_whatsapp_admin_get_channel');
    if (error) throw toError(error);
    return mapChannel((data ?? {}) as Record<string, unknown>);
  }

  async setChannelEnabled(enabled: boolean): Promise<WhatsAppChannelConfig> {
    const { data, error } = await this.client.rpc('api_whatsapp_admin_set_channel_enabled', {
      p_enabled: enabled,
    });
    if (error) throw toError(error);
    return mapChannel((data ?? {}) as Record<string, unknown>);
  }

  async overview(): Promise<WhatsAppAdminOverview> {
    const { data, error } = await this.client.rpc('api_whatsapp_admin_overview');
    if (error) throw toError(error);
    const r = (data ?? {}) as Record<string, unknown>;
    return {
      channelEnabled: Boolean(r.channel_enabled),
      since: new Date(String(r.since)),
      outboundQueued: Number(r.outbound_queued ?? 0),
      outboundSent: Number(r.outbound_sent ?? 0),
      outboundFailed: Number(r.outbound_failed ?? 0),
      outboundSkipped: Number(r.outbound_skipped ?? 0),
      consentOptedIn: Number(r.consent_opted_in ?? 0),
      consentOptedOut: Number(r.consent_opted_out ?? 0),
      sessions7d: Number(r.sessions_7d ?? 0),
      matchesSent7d: Number(r.matches_sent_7d ?? 0),
      rateHits7d: Number(r.rate_hits_7d ?? 0),
    };
  }

  async listConsent(limit = 50, offset = 0): Promise<{ rows: WhatsAppConsentRow[]; totalCount: number }> {
    const { data, error } = await this.client.rpc('api_whatsapp_admin_list_consent', {
      p_limit: limit, p_offset: offset,
    });
    if (error) throw toError(error);
    const rows = (Array.isArray(data) ? data : []) as Record<string, unknown>[];
    return {
      totalCount: rows.length ? Number(rows[0]?.total_count ?? 0) : 0,
      rows: rows.map((r) => ({
        userId: (r.user_id as string | null) ?? null,
        waIdMasked: (r.wa_id_masked as string | null) ?? null,
        consentStatus: String(r.consent_status ?? 'unknown'),
        optedIn: Boolean(r.opted_in),
        optedInAt: asDate(r.opted_in_at as string | null),
        optedOutAt: asDate(r.opted_out_at as string | null),
        preferredLanguage: (r.preferred_language as string | null) ?? null,
        lastInboundAt: asDate(r.last_inbound_at as string | null),
        updatedAt: new Date(String(r.updated_at)),
      })),
    };
  }

  async listOutbound(filters: WhatsAppOutboundListFilters): Promise<{ rows: WhatsAppOutboundRow[]; totalCount: number }> {
    const { data, error } = await this.client.rpc('api_whatsapp_admin_list_outbound', {
      p_status: filters.status ?? null,
      p_limit: filters.limit ?? 50,
      p_offset: filters.offset ?? 0,
    });
    if (error) throw toError(error);
    const rows = (Array.isArray(data) ? data : []) as Record<string, unknown>[];
    return {
      totalCount: rows.length ? Number(rows[0]?.total_count ?? 0) : 0,
      rows: rows.map((r) => ({
        outboundId: String(r.outbound_id),
        userId: (r.user_id as string | null) ?? null,
        waIdMasked: (r.wa_id_masked as string | null) ?? null,
        kind: String(r.kind ?? 'template'),
        templateName: (r.template_name as string | null) ?? null,
        language: String(r.language ?? 'he'),
        status: String(r.status),
        attempts: Number(r.attempts ?? 0),
        lastError: (r.last_error as string | null) ?? null,
        createdAt: new Date(String(r.created_at)),
        sentAt: asDate(r.sent_at as string | null),
        nextAttemptAt: asDate(r.next_attempt_at as string | null),
      })),
    };
  }

  async listRateHits(limit = 50): Promise<WhatsAppRateHit[]> {
    const { data, error } = await this.client.rpc('api_whatsapp_admin_list_rate_hits', { p_limit: limit });
    if (error) throw toError(error);
    return ((Array.isArray(data) ? data : []) as Record<string, unknown>[]).map((r) => ({
      bucket: String(r.bucket),
      windowStart: new Date(String(r.window_start)),
      hits: Number(r.hits ?? 0),
    }));
  }

  async listRecentMatches(limit = 50): Promise<WhatsAppMatchSentRow[]> {
    const { data, error } = await this.client.rpc('api_whatsapp_admin_list_recent_matches', { p_limit: limit });
    if (error) throw toError(error);
    return ((Array.isArray(data) ? data : []) as Record<string, unknown>[]).map((r) => ({
      outboundId: String(r.outbound_id),
      userId: (r.user_id as string | null) ?? null,
      waIdMasked: (r.wa_id_masked as string | null) ?? null,
      language: String(r.language ?? 'he'),
      status: String(r.status),
      payload: (r.payload as Record<string, unknown>) ?? {},
      createdAt: new Date(String(r.created_at)),
      sentAt: asDate(r.sent_at as string | null),
    }));
  }

  async listConversations(limit = 50): Promise<WhatsAppConversationRow[]> {
    const { data, error } = await this.client.rpc('api_whatsapp_admin_list_conversations', { p_limit: limit });
    if (error) throw toError(error);
    return ((Array.isArray(data) ? data : []) as Record<string, unknown>[]).map((r) => ({
      sessionId: String(r.session_id),
      waIdMasked: (r.wa_id_masked as string | null) ?? null,
      userId: (r.user_id as string | null) ?? null,
      state: String(r.state),
      listingId: (r.listing_id as string | null) ?? null,
      updatedAt: new Date(String(r.updated_at)),
      createdAt: new Date(String(r.created_at)),
    }));
  }

  async resend(outboundId: string): Promise<string> {
    const { data, error } = await this.client.rpc('api_whatsapp_admin_resend', { p_outbound_id: outboundId });
    if (error) throw toError(error);
    return String(data ?? 'queued');
  }

  async blockUser(userId: string): Promise<void> {
    const { error } = await this.client.rpc('api_whatsapp_admin_block_user', { p_user_id: userId });
    if (error) throw toError(error);
  }
}
