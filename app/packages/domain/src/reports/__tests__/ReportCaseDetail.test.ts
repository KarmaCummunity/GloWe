import { describe, expect, it } from 'vitest';
import { parseReportCaseDetail } from '../ReportCaseDetail';

describe('parseReportCaseDetail', () => {
  it('returns null for non-objects and invalid target_type', () => {
    expect(parseReportCaseDetail(null)).toBeNull();
    expect(parseReportCaseDetail('x')).toBeNull();
    expect(parseReportCaseDetail({ target_type: 'org', target_id: '1' })).toBeNull();
    expect(parseReportCaseDetail({ target_type: 'post' })).toBeNull();
  });

  it('parses a full case with reporters and timeline', () => {
    const detail = parseReportCaseDetail({
      target_type: 'post',
      target_id: 'p1',
      target: { title: 'hi' },
      reporters: [
        {
          report_id: 'r1',
          reporter_id: 'u1',
          reporter_name: 'A',
          reason: 'spam',
          note: 'n',
          status: 'open',
          created_at: '2026-01-01T00:00:00Z',
          resolved_at: null,
          resolved_by: null,
        },
        { report_id: 1 }, // skipped — bad types
        null,
      ],
      timeline: [
        {
          event_id: 'e1',
          actor_id: 'admin',
          action: 'opened',
          metadata: { k: 1 },
          created_at: '2026-01-01T00:00:00Z',
        },
        { event_id: 2 }, // skipped
      ],
    });
    expect(detail).not.toBeNull();
    expect(detail!.targetType).toBe('post');
    expect(detail!.targetId).toBe('p1');
    expect(detail!.target).toEqual({ title: 'hi' });
    expect(detail!.reporters).toHaveLength(1);
    expect(detail!.reporters[0].reportId).toBe('r1');
    expect(detail!.reporters[0].status).toBe('open');
    expect(detail!.timeline).toHaveLength(1);
    expect(detail!.timeline[0].action).toBe('opened');
  });

  it('defaults reporter status to open when unknown and empty arrays when missing', () => {
    const detail = parseReportCaseDetail({
      target_type: 'user',
      target_id: 'u9',
      reporters: [
        {
          report_id: 'r2',
          reporter_id: 'u2',
          status: 'weird',
        },
      ],
    });
    expect(detail!.reporters[0].status).toBe('open');
    expect(detail!.reporters[0].reason).toBe('');
    expect(detail!.timeline).toEqual([]);
  });
});
