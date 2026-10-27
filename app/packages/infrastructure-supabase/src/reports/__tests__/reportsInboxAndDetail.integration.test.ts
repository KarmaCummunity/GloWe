// A1 — Reports dashboard inbox + case detail RPC integration tests.
// Mapped to spec: FR-ADMIN-012, FR-ADMIN-013.
//
// Covers:
//   6. reports_open_inbox returns empty rows when no reports.
//   7. reports_open_inbox collapses duplicates per (target_type, target_id).
//   8. reports_open_inbox honors p_target_type_filter='post'.
//   9. reports_open_inbox paginates: 27 cases, limit 10 → 3 pages, last page
//      no next_cursor, no duplicates across pages.
//  10. reports_case_detail returns target + reporters + timeline.
//  11. reports_case_detail raises 22023 on invalid target_type.
//
// Moderation-RPC tests live in reportsRpc.integration.test.ts.

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  fileReport, seedPost, seedUser, setupSuiteFixtures, signedInClient,
  skip, teardownSuiteFixtures, type SuiteFixtures,
} from './reportsTestHelpers';

const d = skip ? describe.skip : describe;

d('A1 reports inbox + case detail RPCs (integration)', () => {
  let ctx: SuiteFixtures;
  let admin: SupabaseClient;
  let moderatorClient: SupabaseClient;

  beforeAll(async () => {
    ctx = await setupSuiteFixtures();
    admin = ctx.admin;
    moderatorClient = ctx.moderatorClient;
  }, 60_000);

  afterAll(async () => {
    await teardownSuiteFixtures(ctx);
  }, 30_000);

  // ── 6. reports_open_inbox empty ─────────────────────────────────────────
  it('reports_open_inbox returns empty rows when filtered to a non-existent reporter',
    async () => {
      // Filtering by a fresh user with no reports gives an empty result, no
      // matter the global inbox state.
      const ghost = await seedUser(admin, ctx.cleanup);
      const { data, error } = await moderatorClient.rpc('reports_open_inbox', {
        p_reporter_filter: ghost.uid,
        p_limit: 25,
      });
      expect(error).toBeNull();
      expect(data).toMatchObject({ rows: [] });
      expect((data as { next_cursor: unknown }).next_cursor).toBeNull();
    },
  );

  // ── 7. reports_open_inbox groups duplicates per target ──────────────────
  it('reports_open_inbox returns one row per (target_type, target_id)', async () => {
    const { postId } = await seedPost(admin, ctx.cleanup);
    const a = await signedInClient(await seedUser(admin, ctx.cleanup));
    const b = await signedInClient(await seedUser(admin, ctx.cleanup));
    await fileReport(a, 'post', postId);
    await fileReport(b, 'post', postId);

    const { data, error } = await moderatorClient.rpc('reports_open_inbox', {
      p_target_type_filter: 'post',
      p_limit: 100,
    });
    expect(error).toBeNull();
    const rows = (data as { rows: Array<{ target_id: string; reporter_count: number }> }).rows;
    const ourRow = rows.find((r) => r.target_id === postId);
    expect(ourRow).toBeDefined();
    expect(ourRow!.reporter_count).toBe(2);
  });

  // ── 8. reports_open_inbox honors target_type filter ─────────────────────
  it('reports_open_inbox honors p_target_type_filter', async () => {
    // Seed: one open post-report.
    const { postId } = await seedPost(admin, ctx.cleanup);
    const r = await signedInClient(await seedUser(admin, ctx.cleanup));
    await fileReport(r, 'post', postId);

    const { data, error } = await moderatorClient.rpc('reports_open_inbox', {
      p_target_type_filter: 'user',
      p_limit: 100,
    });
    expect(error).toBeNull();
    const rows = (data as { rows: Array<{ target_type: string }> }).rows;
    for (const row of rows) {
      expect(row.target_type).toBe('user');
    }
  });

  // ── 9. reports_open_inbox cursor pagination ─────────────────────────────
  it('reports_open_inbox paginates correctly: 27 cases, limit 10 → 3 pages',
    async () => {
      // Use a single reporter filter to isolate our seeded cases from any
      // ambient open reports living in the dev DB.
      const reporter = await seedUser(admin, ctx.cleanup);
      const reporterClient = await signedInClient(reporter);

      // Seed 27 distinct posts, file one report on each. Sleep 4ms between
      // inserts so created_at orders are unambiguous.
      const seededTargetIds: string[] = [];
      for (let i = 0; i < 27; i += 1) {
        const { postId } = await seedPost(admin, ctx.cleanup);
        const rid = await fileReport(reporterClient, 'post', postId);
        seededTargetIds.push(postId);
        if (!rid) throw new Error('report insert returned no id');
        await new Promise((r) => setTimeout(r, 4));
      }

      // Sanity: confirm all 27 rows landed in public.reports before walking
      // pages. Catches the case where a side-effect (reporter_hide insert,
      // support-thread injection) silently broke an insert.
      const { count: rowCount } = await admin
        .from('reports')
        .select('report_id', { count: 'exact', head: true })
        .eq('reporter_id', reporter.uid)
        .eq('status', 'open');
      expect(rowCount).toBe(27);

      const seenIds = new Set<string>();
      let cursor: unknown = null;
      const pageSizes: number[] = [];
      const pageLimit = 10;

      // Walk the pages.
      for (let page = 0; page < 5; page += 1) {
        // 5 = safety cap
        const { data, error } = await moderatorClient.rpc('reports_open_inbox', {
          p_target_type_filter: 'post',
          p_reporter_filter: reporter.uid,
          p_cursor: cursor as object | null,
          p_limit: pageLimit,
        });
        expect(error).toBeNull();
        const payload = data as {
          rows: Array<{ target_id: string; oldest_at: string }>;
          next_cursor: object | null;
        };
        pageSizes.push(payload.rows.length);
        for (const row of payload.rows) {
          expect(seenIds.has(row.target_id)).toBe(false);
          seenIds.add(row.target_id);
        }
        cursor = payload.next_cursor;
        if (cursor === null) break;
      }

      expect(pageSizes).toEqual([10, 10, 7]);
      expect(cursor).toBeNull();
      expect(seenIds.size).toBe(27);
      for (const id of seededTargetIds) {
        expect(seenIds.has(id)).toBe(true);
      }
    },
    120_000,
  );

  // ── 10. reports_case_detail returns target + reporters + timeline ───────
  it('reports_case_detail returns target preview, reporters, and timeline',
    async () => {
      const { postId } = await seedPost(admin, ctx.cleanup);
      const r1 = await signedInClient(await seedUser(admin, ctx.cleanup));
      const r2 = await signedInClient(await seedUser(admin, ctx.cleanup));
      const id1 = await fileReport(r1, 'post', postId, 'Spam');
      const id2 = await fileReport(r2, 'post', postId, 'Misleading');

      // Confirm one report to populate the audit timeline.
      const { error: confirmErr } = await moderatorClient.rpc(
        'admin_confirm_report',
        { p_report_id: id1 },
      );
      expect(confirmErr).toBeNull();

      const { data, error } = await moderatorClient.rpc('reports_case_detail', {
        p_target_type: 'post',
        p_target_id: postId,
      });
      expect(error).toBeNull();
      const payload = data as {
        target_type: string;
        target_id: string;
        target: { status?: string; author_id?: string };
        reporters: Array<{ report_id: string; reason: string; status: string }>;
        timeline: Array<{ action: string }>;
      };
      expect(payload.target_type).toBe('post');
      expect(payload.target_id).toBe(postId);
      expect(payload.target.status).toBeDefined();
      expect(payload.reporters).toHaveLength(2);
      const reportIds = payload.reporters.map((r) => r.report_id).sort((a, b) => a.localeCompare(b));
      expect(reportIds).toEqual([id1, id2].sort((a, b) => a.localeCompare(b)));

      // Timeline (target=post) holds 'manual_remove_target' / 'restore_target'
      // entries. The confirm/dismiss audit rows attach to target_type='report'
      // (per the AFTER trigger in 0005), so they live on a different timeline.
      // We just assert the timeline is an array shaped like [{action,...}]
      // (possibly empty for this fresh post).
      expect(Array.isArray(payload.timeline)).toBe(true);
    },
    30_000,
  );

  // ── 11. reports_case_detail rejects invalid target ─────────────────────
  it('reports_case_detail raises 22023 on invalid target_type', async () => {
    const { error } = await moderatorClient.rpc('reports_case_detail', {
      p_target_type: 'comment',
      p_target_id: '00000000-0000-0000-0000-000000000000',
    });
    expect(error).not.toBeNull();
    expect(error!.code).toBe('22023');
  });
});
