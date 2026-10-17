import { describe, expect, it, vi } from 'vitest';
import {
  BlockWhatsAppUserUseCase,
  GetWhatsAppAdminOverviewUseCase,
  ListWhatsAppConsentUseCase,
  ListWhatsAppOutboundUseCase,
  ResendWhatsAppOutboundUseCase,
  SetWhatsAppChannelEnabledUseCase,
} from '../WhatsAppAdminUseCases';
import type { IWhatsAppAdminRepository } from '../IWhatsAppAdminRepository';

function makeRepo(): IWhatsAppAdminRepository {
  return {
    getChannel: vi.fn(async () => ({ isEnabled: false, phoneNumberId: null, graphApiVersion: null, updatedAt: null })),
    setChannelEnabled: vi.fn(async (enabled: boolean) => ({
      isEnabled: enabled, phoneNumberId: null, graphApiVersion: 'v21.0', updatedAt: new Date(),
    })),
    overview: vi.fn(async () => ({
      channelEnabled: false, since: new Date(), outboundQueued: 0, outboundSent: 0,
      outboundFailed: 0, outboundSkipped: 0, consentOptedIn: 1, consentOptedOut: 0,
      sessions7d: 0, matchesSent7d: 0, rateHits7d: 0,
    })),
    listConsent: vi.fn(async () => ({ rows: [], totalCount: 0 })),
    listOutbound: vi.fn(async () => ({ rows: [], totalCount: 0 })),
    listRateHits: vi.fn(async () => []),
    listRecentMatches: vi.fn(async () => []),
    listConversations: vi.fn(async () => []),
    resend: vi.fn(async () => 'queued'),
    blockUser: vi.fn(async () => undefined),
  };
}

describe('WhatsApp admin use cases', () => {
  it('overview and list consent pass through', async () => {
    const repo = makeRepo();
    await new GetWhatsAppAdminOverviewUseCase(repo).execute();
    await new ListWhatsAppConsentUseCase(repo).execute(10, 0);
    expect(repo.overview).toHaveBeenCalled();
    expect(repo.listConsent).toHaveBeenCalledWith(10, 0);
  });

  it('list outbound forwards filters', async () => {
    const repo = makeRepo();
    await new ListWhatsAppOutboundUseCase(repo).execute({ status: 'failed', limit: 5 });
    expect(repo.listOutbound).toHaveBeenCalledWith({ status: 'failed', limit: 5 });
  });

  it('kill switch / resend / block forward args', async () => {
    const repo = makeRepo();
    await new SetWhatsAppChannelEnabledUseCase(repo).execute(true);
    await new ResendWhatsAppOutboundUseCase(repo).execute('o1');
    await new BlockWhatsAppUserUseCase(repo).execute('u1');
    expect(repo.setChannelEnabled).toHaveBeenCalledWith(true);
    expect(repo.resend).toHaveBeenCalledWith('o1');
    expect(repo.blockUser).toHaveBeenCalledWith('u1');
  });
});
