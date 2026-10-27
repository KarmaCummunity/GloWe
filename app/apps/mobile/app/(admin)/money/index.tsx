// app/apps/mobile/app/(admin)/money/index.tsx
// V2-ADMIN-MONEY-9 — V2 §13.3 Admin Money — minimal donations / expenses ledger.
import { useMemo, useState } from 'react';
import { Alert, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  hasPermission, isFinanceLedgerError,
  type AdminPermission, type FinanceDirection, type FinanceEntry,
} from '@kc/domain';
import { makeUseStyles } from '@kc/ui';
import { useAdminRoles } from '../../../src/hooks/useAdminRoles';
import { container } from '../../../src/lib/container';
import { FinanceEntryCard } from '../../../src/components/admin/money/FinanceEntryCard';
import { FinanceEntryFormModal } from '../../../src/components/admin/money/FinanceEntryFormModal';
import { AdminFilterChip } from '../../../src/components/admin/AdminFilterChip';
import { AdminListEmpty } from '../../../src/components/admin/AdminListEmpty';
import { confirmAction as platformConfirm } from '../../../src/services/platformConfirm';
import { useLocaleBundle, type LocaleBundle } from '../../../src/i18n/useLocaleBundle';
import { KcFlashList } from '../../../src/components/lists/KcFlashList';

type DirFilter = FinanceDirection | 'all';

function confirmDelete(message: string, L: LocaleBundle): Promise<boolean> {
  const t = L.admin.money.confirm;
  return platformConfirm(t.deleteTitle, message, {
    confirmLabel: t.deleteOk,
    cancelLabel:  t.deleteCancel,
    destructive:  true,
  });
}

function fmtAmount(cents: number, currency: string): string {
  const major = cents / 100;
  try { return new Intl.NumberFormat('he-IL', { style: 'currency', currency }).format(major); }
  catch { return `${major.toFixed(2)} ${currency}`; }
}

export default function MoneyScreen() {
  const styles = useStyles();
  const L = useLocaleBundle();
  const t = L.admin.money;
  const { roles, isLoading: rolesLoading } = useAdminRoles();
  const can = (perm: AdminPermission) => hasPermission(roles, perm);
  const queryClient = useQueryClient();

  const [dirFilter, setDirFilter] = useState<DirFilter>('all');
  const [editing, setEditing] = useState<FinanceEntry | null>(null);
  const [creating, setCreating] = useState(false);

  const filters = useMemo(() => ({
    direction: dirFilter === 'all' ? undefined : dirFilter,
    limit: 100,
  }), [dirFilter]);

  const list = useQuery({
    queryKey: ['admin.money.list', filters],
    queryFn:  () => container.listFinanceLedger.execute(filters),
    enabled:  can('money.manage'),
    staleTime: 15_000,
  });
  const summary = useQuery({
    queryKey: ['admin.money.summary'],
    queryFn:  () => container.getFinanceSummary.execute({}),
    enabled:  can('money.manage'),
    staleTime: 15_000,
  });

  const remove = useMutation({
    mutationFn: (id: string) => container.deleteFinanceEntry.execute(id),
    onSuccess:  () => {
      void queryClient.invalidateQueries({ queryKey: ['admin.money.list'] });
      void queryClient.invalidateQueries({ queryKey: ['admin.money.summary'] });
    },
  });

  if (rolesLoading) {
    return <View style={styles.center}><Text>{t.loading}</Text></View>;
  }
  if (!can('money.manage')) {
    return <View style={styles.center}><Text style={styles.deniedTitle}>{t.forbiddenTitle}</Text></View>;
  }

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>{t.title}</Text>
        <Pressable accessibilityRole="button" onPress={() => setCreating(true)} style={styles.newBtn}>
          <Text style={styles.newBtnText}>{t.newBtn}</Text>
        </Pressable>
      </View>

      <View style={styles.summaryBox}>
        <Text style={styles.summaryHeading}>{t.summary.period}</Text>
        {(summary.data ?? []).length === 0 && (
          <Text style={styles.summaryEmpty}>{t.summary.empty}</Text>
        )}
        {(summary.data ?? []).map((s) => (
          <View key={s.currency} style={styles.summaryRow}>
            <Text style={styles.summaryCurrency}>{s.currency}</Text>
            <Text style={[styles.summaryIncome]}>
              {t.summary.incomeLabel}: {fmtAmount(s.incomeCents, s.currency)}
            </Text>
            <Text style={[styles.summaryExpense]}>
              {t.summary.expenseLabel}: {fmtAmount(s.expenseCents, s.currency)}
            </Text>
            <Text style={[styles.summaryNet, s.netCents >= 0 ? styles.netPositive : styles.netNegative]}>
              {t.summary.netLabel}: {fmtAmount(s.netCents, s.currency)}
            </Text>
          </View>
        ))}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {(['all', 'in', 'out'] as readonly DirFilter[]).map((d) => (
          <AdminFilterChip
            key={d}
            label={d === 'all' ? t.filters.all : d === 'in' ? t.filters.income : t.filters.expense}
            active={dirFilter === d}
            onPress={() => setDirFilter(d)}
          />
        ))}
      </ScrollView>
      <Text style={styles.totalLabel}>{t.totalCount(list.data?.totalCount ?? 0)}</Text>

      <KcFlashList
        data={[...(list.data?.rows ?? [])]}
        keyExtractor={(e) => e.entryId}
        renderItem={({ item }) => (
          <FinanceEntryCard
            entry={item}
            onEdit={() => setEditing(item)}
            onDelete={async () => {
              const ok = await confirmDelete(t.confirm.delete, L);
              if (!ok) return;
              try { await remove.mutateAsync(item.entryId); }
              catch (err) {
                const code = isFinanceLedgerError(err) ? err.code : 'unknown';
                const msg = t.errors[code] ?? t.errors.unknown;
                if (Platform.OS === 'web') { if (typeof window !== 'undefined') window.alert(msg); }
                else Alert.alert(msg);
              }
            }}
          />
        )}
        refreshControl={
          <RefreshControl refreshing={list.isRefetching} onRefresh={() => { void list.refetch(); void summary.refetch(); }} />
        }
        ListEmptyComponent={
          !list.isLoading ? <AdminListEmpty title={t.emptyTitle} hint={t.emptyHint} /> : null
        }
      />

      {(creating || editing) && (
        <FinanceEntryFormModal
          initial={editing}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSaved={() => {
            setCreating(false);
            setEditing(null);
            void queryClient.invalidateQueries({ queryKey: ['admin.money.list'] });
            void queryClient.invalidateQueries({ queryKey: ['admin.money.summary'] });
          }}
        />
      )}
    </View>
  );
}

const useStyles = makeUseStyles(({ colors }) => ({
  root:        { flex: 1, backgroundColor: colors.background },
  center:      { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  deniedTitle: { fontSize: 18, fontWeight: '700' },
  header:      { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8,
                 flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title:       { fontSize: 22, fontWeight: '700' },
  newBtn:      { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: colors.primary },
  newBtnText:  { color: colors.textInverse, fontSize: 13, fontWeight: '700' },

  summaryBox: { marginHorizontal: 16, marginBottom: 8, padding: 12, borderRadius: 10,
                backgroundColor: colors.surface,
                borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, gap: 6 },
  summaryHeading: { fontSize: 11, fontWeight: '700', opacity: 0.65 },
  summaryEmpty:   { fontSize: 12, opacity: 0.55 },
  summaryRow:     { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  summaryCurrency:{ fontSize: 12, fontWeight: '700' },
  summaryIncome:  { fontSize: 12, color: colors.success },
  summaryExpense: { fontSize: 12, color: colors.error },
  summaryNet:     { fontSize: 12, fontWeight: '700' },
  netPositive:    { color: colors.success },
  netNegative:    { color: colors.error },

  chips:          { paddingHorizontal: 16, gap: 8, paddingBottom: 8 },
  totalLabel:     { paddingHorizontal: 16, paddingBottom: 8, fontSize: 11, opacity: 0.6 },
}));