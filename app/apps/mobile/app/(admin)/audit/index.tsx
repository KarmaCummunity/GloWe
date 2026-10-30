// app/apps/mobile/app/(admin)/audit/index.tsx
// FR-ADMIN-020 — admin audit log viewer with role-tiered visibility.
// V2-ADMIN-AUDIT-5 — date-range filter + CSV export (web).
import { useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { adminChipScroll } from '../../../src/components/admin/adminChipScroll';
import { type AdminPermission, type AdminRole, hasPermission } from '@kc/domain';
import type { AdminAuditSearchFilters } from '@kc/application';
import { makeUseStyles, Text, TextInput } from '@kc/ui';
import { useAdminRoles } from '../../../src/hooks/useAdminRoles';
import { useAdminAuditSearch } from '../../../src/hooks/useAdminContentSearch';
import { AdminScreenHeader } from '../../../src/components/admin/AdminScreenHeader';
import { AuditLogRow } from '../../../src/components/admin/content/AuditLogRow';
import { container } from '../../../src/lib/container';
import {
  downloadAuditCsv, isCsvExportSupported,
} from '../../../src/lib/auditCsvExport';
import { useLocaleBundle, type LocaleBundle } from '../../../src/i18n/useLocaleBundle';
import { KcFlashList } from '../../../src/components/lists/KcFlashList';

const COMMON_ACTIONS = [
  null,
  'ban_user',
  'manual_remove_target',
  'auto_remove_target',
  'restore_target',
  'dismiss_report',
  'confirm_report',
  'admin_role_grant',
  'admin_role_revoke',
  'admin_task_create',
  'admin_task_update',
  'admin_task_delete',
  'delete_message',
  'delete_account',
] as const;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
function parseFromDate(value: string): Date | undefined {
  if (!ISO_DATE.test(value)) return undefined;
  const d = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? undefined : d;
}
function parseToDate(value: string): Date | undefined {
  if (!ISO_DATE.test(value)) return undefined;
  const d = new Date(`${value}T23:59:59.999Z`);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export default function AuditScreen() {
  const styles = useStyles();
  const L = useLocaleBundle();
  const { roles, isLoading: rolesLoading } = useAdminRoles();
  const [targetIdRaw, setTargetIdRaw] = useState('');
  const [action, setAction] = useState<string | null>(null);
  const [fromRaw, setFromRaw] = useState('');
  const [toRaw, setToRaw] = useState('');
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const filters = useMemo<AdminAuditSearchFilters>(() => ({
    targetUserId: targetIdRaw.trim() || undefined,
    action: action ?? undefined,
    fromDate: parseFromDate(fromRaw),
    toDate:   parseToDate(toRaw),
    limit: 100,
  }), [targetIdRaw, action, fromRaw, toRaw]);

  const result = useAdminAuditSearch(filters);
  const can = (perm: AdminPermission) => hasPermission(roles as readonly AdminRole[], perm);

  async function doExport() {
    setExportError(null);
    if (!isCsvExportSupported()) {
      setExportError(L.admin.content.csvExport.unsupported);
      return;
    }
    setExporting(true);
    try {
      const page = await container.adminSearchAudit.execute({
        ...filters,
        limit: 500,
        offset: 0,
      });
      const stamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-');
      const name  = `audit-${stamp}.csv`;
      const ok = downloadAuditCsv(page.rows, name);
      if (!ok) setExportError(L.admin.content.csvExport.failed);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : L.admin.content.csvExport.failed);
    } finally {
      setExporting(false);
    }
  }

  if (rolesLoading) {
    return <View style={styles.center}><Text>{L.admin.content.loading}</Text></View>;
  }
  if (!can('audit.view_own')) {
    return <View style={styles.center}><Text style={styles.deniedTitle}>{L.admin.content.forbiddenTitle}</Text></View>;
  }

  const canSeeAll = can('audit.view_any');

  return (
    <View style={styles.root}>
      <AdminScreenHeader
        title={L.admin.content.auditTitle}
        subtitle={!canSeeAll ? L.admin.content.tierLimited : undefined}
      />
      <TextInput
        style={styles.search}
        value={targetIdRaw}
        onChangeText={setTargetIdRaw}
        placeholder={L.admin.content.auditTargetPlaceholder}
        autoCapitalize="none"
        autoCorrect={false}
      />

      <View style={styles.dateRow}>
        <View style={styles.dateField}>
          <Text style={styles.dateLabel}>{L.admin.content.dateFromLabel}</Text>
          <TextInput
            style={styles.dateInput}
            value={fromRaw}
            onChangeText={setFromRaw}
            placeholder="YYYY-MM-DD"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="numbers-and-punctuation"
          />
        </View>
        <View style={styles.dateField}>
          <Text style={styles.dateLabel}>{L.admin.content.dateToLabel}</Text>
          <TextInput
            style={styles.dateInput}
            value={toRaw}
            onChangeText={setToRaw}
            placeholder="YYYY-MM-DD"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="numbers-and-punctuation"
          />
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => { void doExport(); }}
          disabled={exporting}
          style={[styles.exportBtn, exporting && styles.exportBtnDisabled]}
        >
          <Text style={styles.exportBtnText}>
            {exporting ? L.admin.content.csvExport.busy : L.admin.content.csvExport.action}
          </Text>
        </Pressable>
      </View>
      {exportError !== null && (
        <Text style={styles.exportError}>{exportError}</Text>
      )}

      <ScrollView horizontal style={adminChipScroll.scroll} showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.chips, adminChipScroll.content]}>
        {COMMON_ACTIONS.map((a) => (
          <Pressable
            key={a ?? '_all'}
            onPress={() => setAction(a)}
            style={[styles.chip, action === a && styles.chipActive]}
          >
            <Text style={[styles.chipText, action === a && styles.chipTextActive]}>
              {a === null
                ? L.admin.content.auditActionFilterAll
                : (L.admin.content.auditAction[a as keyof LocaleBundle['admin']['content']['auditAction']] ?? a)}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
      <Text style={styles.totalLabel}>{L.admin.content.totalCount(result.page.totalCount)}</Text>
      <KcFlashList
        data={[...result.page.rows]}
        keyExtractor={(e) => e.eventId}
        renderItem={({ item }) => <AuditLogRow row={item} />}
        refreshControl={<RefreshControl refreshing={result.isRefetching} onRefresh={result.refetch} />}
        ListEmptyComponent={
          !result.isLoading ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>{L.admin.content.auditEmpty}</Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const useStyles = makeUseStyles(({ colors }) => ({
  root:        { flex: 1, backgroundColor: colors.background },
  center:      { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  deniedTitle: { fontSize: 18, fontWeight: '700' },
  search: {
    marginHorizontal: 16, marginBottom: 8, padding: 10,
    borderRadius: 10, backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border,
    textAlign: 'right', fontSize: 14,
  },
  chips:          { paddingHorizontal: 16, gap: 8, paddingBottom: 8 },
  chip:           { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14, backgroundColor: colors.secondaryLight },
  chipActive:     { backgroundColor: colors.primary },
  chipText:       { fontSize: 11, fontWeight: '600' },
  chipTextActive: { color: colors.textInverse },
  totalLabel:     { paddingHorizontal: 16, paddingBottom: 4, fontSize: 11, opacity: 0.6 },
  empty:          { padding: 32, alignItems: 'center' },
  emptyText:      { fontSize: 14, opacity: 0.6 },
  dateRow:        { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 8, alignItems: 'flex-end' },
  dateField:      { flex: 1, gap: 4 },
  dateLabel:      { fontSize: 11, opacity: 0.7 },
  dateInput: {
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, borderRadius: 8,
    padding: 8, fontSize: 13, textAlign: 'left', backgroundColor: colors.surface,
  },
  exportBtn: {
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8,
    backgroundColor: colors.primary, alignSelf: 'flex-end',
  },
  exportBtnDisabled: { opacity: 0.5 },
  exportBtnText:  { color: colors.textInverse, fontSize: 12, fontWeight: '700' },
  exportError:    { paddingHorizontal: 16, paddingBottom: 4, color: colors.error, fontSize: 11 },
}));