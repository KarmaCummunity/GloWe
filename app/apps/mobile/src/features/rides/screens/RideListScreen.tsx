// Shared list-screen shell for the rides dashboards (FR-RIDE-024 / FR-RIDE-025).
// MyRidesScreen and MyRequestsScreen render identical scaffolding — title row,
// grouped sections with count badges, loading/empty state, and pull-to-refresh
// over a KcFlashList; only the data source, row component, and copy differ. Extracted
// here to keep the two screens DRY.
import React from 'react';
import { ActivityIndicator, Pressable, RefreshControl, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { makeUseStyles, radius, spacing, typography, useTheme } from '@kc/ui';

import { TopBar } from '../../../components/TopBar';
import { Screen } from '../../../components/ui/Screen';
import { IconTile } from '../../../components/ui/IconTile';
import { useShellTabBarScrollInset } from '../../../navigation/useShellTabBarVisibility';
import { rtlTextAlignStart } from '../../../lib/rtlTextAlignStart';
import { rowDirectionStart } from '../../../lib/rtlLayout';
import { KcFlashList } from '../../../components/lists/KcFlashList';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

export type RideListSection<T> =
  | { kind: 'header'; key: string; titleKey: string; count: number }
  | { kind: 'row'; key: string; item: T };

export interface RideListEmptyConfig {
  readonly icon: IconName;
  readonly titleKey: string;
  readonly descKey: string;
  readonly ctaIcon: IconName;
  readonly ctaKey: string;
}

interface RideListScreenProps<T> {
  readonly titleKey: string;
  readonly sections: ReadonlyArray<RideListSection<T>>;
  readonly renderRow: (item: T) => React.ReactElement;
  readonly empty: RideListEmptyConfig;
  readonly isLoading: boolean;
  readonly isRefetching: boolean;
  readonly onRefresh: () => void;
}

export function RideListScreen<T>({
  titleKey,
  sections,
  renderRow,
  empty,
  isLoading,
  isRefetching,
  onRefresh,
}: RideListScreenProps<T>) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useStyles();
  const router = useRouter();
  const tabBarPad = useShellTabBarScrollInset();

  const renderEmpty = () => {
    if (isLoading) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      );
    }
    return (
      <View style={styles.emptyContainer}>
        <IconTile icon={empty.icon} size="lg" />
        <Text style={styles.emptyTitle}>{t(empty.titleKey)}</Text>
        <Text style={styles.emptyDesc}>{t(empty.descKey)}</Text>
        <Pressable
          style={styles.cta}
          onPress={() =>
            router.push('/(tabs)/donations/rides')
          }
          accessibilityRole="button"
        >
          <Ionicons name={empty.ctaIcon} size={18} color={colors.textInverse} />
          <Text style={styles.ctaText}>{t(empty.ctaKey)}</Text>
        </Pressable>
      </View>
    );
  };

  return (
    <Screen blobs="content">
      <TopBar />
      <View style={styles.titleRow}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={t('general.back')}
          hitSlop={8}
        >
          <Ionicons name="chevron-forward" size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.title}>{t(titleKey)}</Text>
        <View style={styles.titleSpacer} />
      </View>

      <KcFlashList
        data={sections as RideListSection<T>[]}
        keyExtractor={(s) => s.key}
        renderItem={({ item }) => {
          if (item.kind === 'header') {
            return (
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionHeaderText}>{t(item.titleKey)}</Text>
                <View style={styles.sectionHeaderBadge}>
                  <Text style={styles.sectionHeaderBadgeText}>{item.count}</Text>
                </View>
              </View>
            );
          }
          return renderRow(item.item);
        }}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: tabBarPad + 32 },
          sections.length === 0 && styles.listContentEmpty,
        ]}
        ItemSeparatorComponent={({ leadingItem }: { leadingItem?: RideListSection<T> }) => {
          // Headers don't get separators; rows do.
          if (leadingItem?.kind === 'header') return null;
          return <View style={styles.separator} />;
        }}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        showsVerticalScrollIndicator={false}
      />
    </Screen>
  );
}

const useStyles = makeUseStyles(({ colors }) => ({
  titleRow: {
    flexDirection: rowDirectionStart,
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  title: {
    ...typography.h2,
    color: colors.textPrimary,
    flex: 1,
    textAlign: rtlTextAlignStart,
  },
  titleSpacer: { width: 22 },

  listContent: { paddingHorizontal: spacing.base, gap: 0 },
  listContentEmpty: { flexGrow: 1, justifyContent: 'center' as const },
  separator: { height: spacing.sm },

  sectionHeader: {
    flexDirection: rowDirectionStart,
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.base,
    marginBottom: spacing.sm,
  },
  sectionHeaderText: {
    ...typography.h3,
    color: colors.textPrimary,
    textAlign: rtlTextAlignStart,
  },
  sectionHeaderBadge: {
    minWidth: 22,
    height: 22,
    paddingHorizontal: spacing.xs,
    borderRadius: 11,
    backgroundColor: colors.primarySurface,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  sectionHeaderBadgeText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '700' as const,
  },

  emptyContainer: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: spacing.base,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  emptyTitle: { ...typography.h3, color: colors.textPrimary, textAlign: 'center' as const },
  emptyDesc: { ...typography.body, color: colors.textSecondary, textAlign: 'center' as const },
  cta: {
    flexDirection: rowDirectionStart,
    alignItems: 'center' as const,
    gap: spacing.xs,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    marginTop: spacing.sm,
  },
  ctaText: { ...typography.body, color: colors.textInverse, fontWeight: '700' as const },
}));