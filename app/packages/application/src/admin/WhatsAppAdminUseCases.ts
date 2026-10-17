import type {
  WhatsAppAdminOverview,
  WhatsAppChannelConfig,
  WhatsAppConsentRow,
  WhatsAppConversationRow,
  WhatsAppMatchSentRow,
  WhatsAppOutboundRow,
  WhatsAppRateHit,
} from '@kc/domain';
import type {
  IWhatsAppAdminRepository,
  WhatsAppOutboundListFilters,
} from './IWhatsAppAdminRepository';

export class GetWhatsAppAdminOverviewUseCase {
  constructor(private readonly repo: IWhatsAppAdminRepository) {}
  execute(): Promise<WhatsAppAdminOverview> { return this.repo.overview(); }
}

export class GetWhatsAppChannelUseCase {
  constructor(private readonly repo: IWhatsAppAdminRepository) {}
  execute(): Promise<WhatsAppChannelConfig> { return this.repo.getChannel(); }
}

export class SetWhatsAppChannelEnabledUseCase {
  constructor(private readonly repo: IWhatsAppAdminRepository) {}
  execute(enabled: boolean): Promise<WhatsAppChannelConfig> {
    return this.repo.setChannelEnabled(enabled);
  }
}

export class ListWhatsAppConsentUseCase {
  constructor(private readonly repo: IWhatsAppAdminRepository) {}
  execute(limit?: number, offset?: number): Promise<{ rows: WhatsAppConsentRow[]; totalCount: number }> {
    return this.repo.listConsent(limit, offset);
  }
}

export class ListWhatsAppOutboundUseCase {
  constructor(private readonly repo: IWhatsAppAdminRepository) {}
  execute(filters: WhatsAppOutboundListFilters = {}): Promise<{ rows: WhatsAppOutboundRow[]; totalCount: number }> {
    return this.repo.listOutbound(filters);
  }
}

export class ListWhatsAppRateHitsUseCase {
  constructor(private readonly repo: IWhatsAppAdminRepository) {}
  execute(limit?: number): Promise<WhatsAppRateHit[]> { return this.repo.listRateHits(limit); }
}

export class ListWhatsAppRecentMatchesUseCase {
  constructor(private readonly repo: IWhatsAppAdminRepository) {}
  execute(limit?: number): Promise<WhatsAppMatchSentRow[]> { return this.repo.listRecentMatches(limit); }
}

export class ListWhatsAppConversationsUseCase {
  constructor(private readonly repo: IWhatsAppAdminRepository) {}
  execute(limit?: number): Promise<WhatsAppConversationRow[]> { return this.repo.listConversations(limit); }
}

export class ResendWhatsAppOutboundUseCase {
  constructor(private readonly repo: IWhatsAppAdminRepository) {}
  execute(outboundId: string): Promise<string> { return this.repo.resend(outboundId); }
}

export class BlockWhatsAppUserUseCase {
  constructor(private readonly repo: IWhatsAppAdminRepository) {}
  execute(userId: string): Promise<void> { return this.repo.blockUser(userId); }
}
