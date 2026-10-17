import { describe, it, expect } from 'vitest';
import { ReportListingUseCase } from '../ReportListingUseCase';
import { FakeReportRepository } from './fakeReportRepository';

describe('ReportListingUseCase', () => {
  it('submits with targetType="listing" and forwards listingId, reason, note', async () => {
    const repo = new FakeReportRepository();
    await new ReportListingUseCase(repo).execute({
      reporterId: 'u_reporter',
      listingId: 'l_target',
      reason: 'Spam',
      note: 'looks like spam',
    });
    expect(repo.lastSubmit!.reporterId).toBe('u_reporter');
    expect(repo.lastSubmit!.input).toEqual({
      targetType: 'listing',
      targetId: 'l_target',
      reason: 'Spam',
      note: 'looks like spam',
    });
  });
});
