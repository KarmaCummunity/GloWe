import { buildKcSupportOptions, type KcSupportChannel, type KcSupportOptions } from '@kc/domain';
import type { IKcSupportChannelsRepository } from '../ports/IKcSupportChannelsRepository';

/**
 * FR-DONATE-011 — resolves how a donor can support KC directly.
 *
 * Server-configured channels win (D20: provider swappable without a release).
 * When they cannot be loaded (offline, outage), the compiled `fallback`
 * channels are used so the donor is never left without a way to give.
 */
export class GetKcSupportOptionsUseCase {
  constructor(
    private readonly repo: IKcSupportChannelsRepository,
    private readonly fallback: readonly KcSupportChannel[],
  ) {}

  async execute(): Promise<KcSupportOptions> {
    try {
      return buildKcSupportOptions(await this.repo.listActiveChannels());
    } catch {
      return buildKcSupportOptions(this.fallback);
    }
  }
}
