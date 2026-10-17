import type {
  WhatsAppAdminOverview,
  WhatsAppChannelConfig,
  WhatsAppConsentRow,
  WhatsAppConversationRow,
  WhatsAppMatchSentRow,
  WhatsAppOutboundRow,
  WhatsAppRateHit,
} from '@kc/domain';

export type WhatsAppOutboundListFilters = {
  status?: string;
  limit?: number;
  offset?: number;
};

export interface IWhatsAppAdminRepository {
  getChannel(): Promise<WhatsAppChannelConfig>;
  setChannelEnabled(enabled: boolean): Promise<WhatsAppChannelConfig>;
  overview(): Promise<WhatsAppAdminOverview>;
  listConsent(limit?: number, offset?: number): Promise<{ rows: WhatsAppConsentRow[]; totalCount: number }>;
  listOutbound(filters: WhatsAppOutboundListFilters): Promise<{ rows: WhatsAppOutboundRow[]; totalCount: number }>;
  listRateHits(limit?: number): Promise<WhatsAppRateHit[]>;
  listRecentMatches(limit?: number): Promise<WhatsAppMatchSentRow[]>;
  listConversations(limit?: number): Promise<WhatsAppConversationRow[]>;
  resend(outboundId: string): Promise<string>;
  blockUser(userId: string): Promise<void>;
}
