// KC#1122 / FR-ADMIN-029 — match quality per world: alerted pairs, precision proxy,
// notification→chat and completion rates over a selectable window (admin_match_quality, 0454).
import { useState } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { hasPermission, type AdminRole } from '@kc/domain';
import type { MatchQualityByWorld } from '@kc/infrastructure-supabase';
import { makeUseStyles } from '@kc/ui';
import { useAdminRoles } from '../../../src/hooks/useAdminRoles';
import { getMatchRepository } from '../../../src/services/matchingComposition';
import { AdminFilterChip } from '../../../src/components/admin/AdminFilterChip';
import { AdminListEmpty } from '../../../src/components/admin/AdminListEmpty';
import { formatRate } from '../../../src/components/admin/matching/formatRate';
import { useLocaleBundle } from '../../../src/i18n/useLocaleBundle';
import { textAlignStart } from '../../../src/lib/rtlLayout';

const WINDOWS = [
  { key: 'd7', days: 7 },
  { key: 'd30', days: 30 },
  { key: 'd90', days: 90 },
] as const;

export default function MatchQualityScreen() {
  const styles = useStyles();
  const L = useLocaleBundle();
  const t = L.admin.matching;
  const { i18n } = useTranslation();
  const { roles, isLoading: rolesLoading } = useAdminRoles();
  const enabled = hasPermission(roles as readonly AdminRole[], 'matching.view_quality');
  const [days, setDays] = useState<number>(30);

  const quality = useQuery({
    queryKey: ['admin.matching.quality', days],
    queryFn: () => getMatchRepository().qualityByWorld(days),
    enabled,
    staleTime: 60_000,
  });

  if (rolesLoading) {
    return <View style={styles.center}><Text>{t.loading}</Text></View>;
  }
  if (!enabled) {
    return <View style={styles.center}><Text style={styles.forbidden}>{t.forbiddenTitle}</Text></View>;
  }

  const isHebrew = i18n.language.startsWith('he');
  const worldLabel = (w: MatchQualityByWorld) => (isHebrew ? w.worldLabelHe : w.worldLabelEn);
  const rows = quality.data ?? [];

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={quality.isFetching} onRefresh={() => { void quality.refetch(); }} />}
    >
      <Text style={styles.title}>{t.title}</Text>
      <Text style={styles.muted}>{t.subtitle}</Text>

      <View style={styles.chips}>
        {WINDOWS.map((w) => (
          <AdminFilterChip key={w.key} label={t.windows[w.key]} active={days === w.days} onPress={() => setDays(w.days)} />
        ))}
      </View>

      {quality.isError ? <Text style={styles.error}>{t.error}</Text> : null}
      {!quality.isLoading && !quality.isError && rows.length === 0 ? <AdminListEmpty title={t.empty} hint="" /> : null}

      {rows.map((w) => (
        <View key={w.worldSlug} style={styles.card}>
          <Text style={styles.cardTitle}>{worldLabel(w)}</Text>
          <View style={styles.kpiGrid}>
            <Kpi label={t.metrics.notified} value={String(w.notifiedPairs)} />
            <Kpi label={t.metrics.precision} value={formatRate(w.precisionProxy)} hint={t.counts(w.accepted, w.responses)} />
            <Kpi label={t.metrics.chat} value={formatRate(w.chatRate)} hint={t.pairs(w.chatPairs)} />
            <Kpi
              label={t.metrics.completion}
              value={formatRate(w.completionRate)}
              hint={w.completedPairs === null ? t.notTracked : t.pairs(w.completedPairs)}
            />
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  const styles = useStyles();
  return (
    <View style={styles.kpi}>
      <Text style={styles.kpiValue}>{value}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
      {hint ? <Text style={styles.kpiHint}>{hint}</Text> : null}
    </View>
  );
}

const useStyles = makeUseStyles(({ colors }) => ({
  root: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 48, gap: 8, width: '100%', maxWidth: 900, alignSelf: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  forbidden: { color: colors.error, textAlign: 'center' },
  title: { fontSize: 22, fontWeight: '700', color: colors.textPrimary, textAlign: textAlignStart() },
  muted: { color: colors.textSecondary, fontSize: 13, textAlign: textAlignStart() },
  error: { color: colors.error, fontSize: 13, textAlign: textAlignStart() },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginVertical: 6 },
  card: {
    backgroundColor: colors.surface, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: colors.border, gap: 10,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary, textAlign: textAlignStart() },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  kpi: {
    flexGrow: 1, flexBasis: 140, minWidth: 120, backgroundColor: colors.background, borderRadius: 10, padding: 10,
    borderWidth: 1, borderColor: colors.border, gap: 2,
  },
  kpiValue: { fontSize: 20, fontWeight: '800', color: colors.textPrimary, textAlign: textAlignStart() },
  kpiLabel: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, textAlign: textAlignStart() },
  kpiHint: { fontSize: 11, color: colors.textSecondary, textAlign: textAlignStart() },
}));
