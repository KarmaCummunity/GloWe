// FR-KARMA-007 — karma history: every point change, newest first.
import React from 'react';
import { ActivityIndicator, FlatList, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { he as dateFnsHe } from 'date-fns/locale';
import { makeUseStyles, radius, shadow, spacing, typography, useTheme } from '@kc/ui';
import { useAuthStore } from '../src/store/authStore';
import { getUserRepo } from '../src/services/userComposition';
import { karmaReasonKey, useKarmaHistory, type KarmaHistoryRow } from '../src/hooks/useKarmaHistory';
import { karmaEventIcon } from '../src/components/profile/karmaHistoryIcon';
import { rowDirectionStart } from '../src/lib/rtlLayout';
import { rtlTextAlignStart } from '../src/lib/rtlTextAlignStart';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

export default function KarmaHistoryScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const { t } = useTranslation();
  const userId = useAuthStore((s) => s.session?.userId);
  const userQuery = useQuery({
    queryKey: ['user-profile', userId],
    queryFn: () => getUserRepo().findById(userId!),
    enabled: Boolean(userId),
    staleTime: 60_000,
  });
  const history = useKarmaHistory(userId);

  const renderItem = ({ item }: { item: KarmaHistoryRow }) => {
    const positive = item.delta >= 0;
    const tone = positive ? colors.success : colors.error;
    return (
      <View style={styles.row}>
        <View style={[styles.iconWrap, { backgroundColor: `${tone}1A` }]}>
          <Ionicons name={karmaEventIcon(item.eventType) as IconName} size={20} color={tone} />
        </View>
        <View style={styles.rowBody}>
          <Text style={styles.reason} numberOfLines={2}>{t(`karma.reason.${karmaReasonKey(item.eventType)}`)}</Text>
          <Text style={styles.date}>{format(new Date(item.createdAt), 'd MMM yyyy, HH:mm', { locale: dateFnsHe })}</Text>
        </View>
        <Text style={[styles.delta, { color: tone }]}>{positive ? `+${item.delta}` : `${item.delta}`}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} accessibilityRole="button" accessibilityLabel={t('karma.close')}>
          <Ionicons name="chevron-forward" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>{t('karma.historyTitle')}</Text>
        <View style={styles.headerSpacer} />
      </View>
      <FlatList
        data={history.data ?? []}
        keyExtractor={(r) => String(r.id)}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.hero}>
            <Ionicons name="sparkles" size={28} color={colors.primary} />
            <Text style={styles.total}>{userQuery.data?.karmaPoints ?? 0}</Text>
            <Text style={styles.totalLabel}>{t('karma.badgeLabel')}</Text>
            <Text style={styles.heroHint}>{t('karma.howToEarnIntro')}</Text>
          </View>
        }
        ListEmptyComponent={
          history.isLoading ? <ActivityIndicator color={colors.primary} style={styles.loader} />
            : <Text style={styles.empty}>{history.isError ? t('karma.historyError') : t('karma.historyEmpty')}</Text>
        }
      />
    </SafeAreaView>
  );
}

const useStyles = makeUseStyles(({ colors }) => ({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: rowDirectionStart,
    alignItems: 'center' as const,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { ...typography.h3, flex: 1, textAlign: 'center' as const, color: colors.textPrimary },
  headerSpacer: { width: 24 },
  list: { padding: spacing.base, paddingBottom: spacing['3xl'], gap: spacing.sm },
  hero: {
    alignItems: 'center' as const,
    gap: 4,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.primarySurface,
    borderWidth: 1,
    borderColor: colors.primaryLight,
  },
  total: { ...typography.h1, color: colors.primary },
  totalLabel: { ...typography.body, color: colors.textPrimary, fontWeight: '600' as const },
  heroHint: { ...typography.caption, color: colors.textSecondary, textAlign: 'center' as const, marginTop: 4 },
  row: {
    flexDirection: rowDirectionStart,
    alignItems: 'center' as const,
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  iconWrap: { width: 40, height: 40, borderRadius: radius.full, alignItems: 'center' as const, justifyContent: 'center' as const },
  rowBody: { flex: 1, minWidth: 0, gap: 2 },
  reason: { ...typography.body, fontWeight: '600' as const, color: colors.textPrimary, textAlign: rtlTextAlignStart },
  date: { ...typography.caption, color: colors.textSecondary, textAlign: rtlTextAlignStart },
  delta: { ...typography.h4, fontWeight: '700' as const, minWidth: 44, textAlign: 'center' as const },
  loader: { marginTop: spacing.xl },
  empty: { ...typography.body, color: colors.textSecondary, textAlign: 'center' as const, marginTop: spacing.xl },
}));
