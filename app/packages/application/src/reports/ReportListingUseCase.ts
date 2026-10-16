/** FR-MOD-001 — report a marketplace listing. */
import type { ReportReason, ReportSubmission } from '@kc/domain';
import type { IReportRepository } from '../ports/IReportRepository';

export interface ReportListingInput {
  reporterId: string;
  listingId: string;
  reason: ReportReason;
  note?: string;
}

export class ReportListingUseCase {
  constructor(private readonly repo: IReportRepository) {}

  async execute(input: ReportListingInput): Promise<void> {
    const submission: ReportSubmission = {
      targetType: 'listing',
      targetId: input.listingId,
      reason: input.reason,
      note: input.note,
    };
    await this.repo.submit(input.reporterId, submission);
  }
}
