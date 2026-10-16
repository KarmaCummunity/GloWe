import type { ReportTargetType } from '../value-objects';

export const AUTO_REMOVE_THRESHOLD = 3 as const;

/**
 * Subset of {@link ReportTargetType} that may appear in the admin inbox / case
 * detail surfaces. The wire protocol from `reports_open_inbox` and
 * `reports_case_detail` never emits `'none'`, so the inbox/parser layer narrows
 * to these three values. Kept as a re-exported alias rather than a fresh type
 * to avoid two parallel enums diverging.
 */
export type AdminReportTargetType = Exclude<ReportTargetType, 'none'>;

export interface ReportThresholdProgress {
  readonly count: number;
  readonly threshold: number;
  readonly pct: number;  // 0..1
}

export function thresholdProgress(count: number): ReportThresholdProgress {
  const capped = Math.min(count, AUTO_REMOVE_THRESHOLD);
  return {
    count,
    threshold: AUTO_REMOVE_THRESHOLD,
    pct: capped / AUTO_REMOVE_THRESHOLD,
  };
}

export interface ReportInboxRow {
  readonly targetType: AdminReportTargetType;
  readonly targetId: string;
  readonly reporterCount: number;
  readonly oldestAt: string;       // ISO timestamp
  readonly latestReporterId: string | null;
  readonly target: Readonly<Record<string, unknown>>;
}

export interface ReportInboxCursor {
  readonly oldestAt: string;
  readonly targetType: AdminReportTargetType;
  readonly targetId: string;
}

export interface ReportInboxPage {
  readonly rows: readonly ReportInboxRow[];
  readonly nextCursor: ReportInboxCursor | null;
}

function isTargetType(v: unknown): v is AdminReportTargetType {
  return v === 'post' || v === 'user' || v === 'chat' || v === 'listing';
}

export function parseReportInboxPage(input: unknown): ReportInboxPage {
  if (!input || typeof input !== 'object') return { rows: [], nextCursor: null };
  const obj = input as Record<string, unknown>;
  const rowsRaw = obj['rows'];
  const rows: ReportInboxRow[] = [];
  if (Array.isArray(rowsRaw)) {
    for (const raw of rowsRaw) {
      if (!raw || typeof raw !== 'object') continue;
      const r = raw as Record<string, unknown>;
      if (!isTargetType(r['target_type']) || typeof r['target_id'] !== 'string') continue;
      rows.push({
        targetType:        r['target_type'],
        targetId:          r['target_id'],
        reporterCount:     typeof r['reporter_count'] === 'number' ? r['reporter_count'] : 0,
        oldestAt:          typeof r['oldest_at'] === 'string' ? r['oldest_at'] : '',
        latestReporterId:  typeof r['latest_reporter_id'] === 'string' ? r['latest_reporter_id'] : null,
        target:            (r['target'] && typeof r['target'] === 'object') ? r['target'] as Record<string, unknown> : {},
      });
    }
  }
  const cursorRaw = obj['next_cursor'];
  let nextCursor: ReportInboxCursor | null = null;
  if (cursorRaw && typeof cursorRaw === 'object') {
    const c = cursorRaw as Record<string, unknown>;
    if (typeof c['oldest_at'] === 'string' && isTargetType(c['target_type']) && typeof c['target_id'] === 'string') {
      nextCursor = {
        oldestAt: c['oldest_at'],
        targetType: c['target_type'],
        targetId: c['target_id'],
      };
    }
  }
  return { rows, nextCursor };
}
