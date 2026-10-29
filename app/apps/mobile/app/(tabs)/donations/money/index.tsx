import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { KcFlashList } from '../../../../src/components/lists/KcFlashList';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { makeUseStyles, spacing, typography } from '@kc/ui';
import { Screen } from '../../../../src/components/ui/Screen';
import { IconTile } from '../../../../src/components/ui/IconTile';
import { paymentsUseCases } from '../../../../src/services/paymentsComposition';
import { useShellTabBarScrollInset } from '../../../../src/navigation/useShellTabBarVisibility';
import { WorldLaunchGateByFlag } from '../../../../src/components/worlds/WorldLaunchGate';

const useStyles = makeUseStyles(({ colors }) => ({
  hero: { alignItems: 'center' as const, gap: spacing.md, padding: spacing.lg },
  body: { ...typography.body, color: colors.textSecondary, textAlign: 'center' as const },
  links: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: spacing.md, paddingHorizontal: spacing.lg },
  link: { ...typography.body, color: colors.primary, fontWeight: '600' as const },
  row: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    padding: spacing.md,
    borderRadius: 12,
    backgroundColor: colors.surfaceRaised,
  },
  rowTitle: { ...typography.bodyLarge, color: colors.textPrimary },
  rowMeta: { ...typography.caption, color: colors.textSecondary, marginTop: 4 },
  section: { ...typography.h3, color: colors.textPrimary, paddingHorizontal: spacing.lg, marginTop: spacing.lg },
  sandbox: {
    margin: spacing.lg,
    padding: spacing.sm,
    borderRadius: 8,
    backgroundColor: colors.secondaryLight,
  },
  sandboxText: { ...typography.caption, color: colors.textSecondary, textAlign: 'center' as const },
}));

function MoneyHubScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const styles = useStyles();
  const inset = useShellTabBarScrollInset();
  const nonprofits = useQuery({
    queryKey: ['money', 'nonprofits'],
    queryFn: () => paymentsUseCases.listNonprofits().execute(50),
    staleTime: 60_000,
  });

  return (
    <Screen blobs="content">
      <KcFlashList
        data={nonprofits.data ?? []}
        keyExtractor={(item) => item.orgId}
        contentContainerStyle={{ paddingBottom: inset }}
        ListHeaderComponent={
          <>
            <View style={styles.hero}>
              <IconTile icon="cash-outline" size="lg" />
              <Text style={styles.body}>{t('moneyPayments.hubIntro')}</Text>
            </View>
            <View style={styles.sandbox}>
              <Text style={styles.sandboxText}>{t('moneyPayments.sandboxBanner')}</Text>
            </View>
            <View style={styles.links}>
              <Pressable onPress={() => router.push('/(tabs)/donations/money/history')}>
                <Text style={styles.link}>{t('moneyPayments.historyLink')}</Text>
              </Pressable>
              <Pressable onPress={() => router.push('/(tabs)/donations/money/standing-orders')}>
                <Text style={styles.link}>{t('moneyPayments.standingLink')}</Text>
              </Pressable>
            </View>
            <Text style={styles.section}>{t('moneyPayments.nonprofitsSection')}</Text>
          </>
        }
        ListEmptyComponent={
          <Text style={{ padding: spacing.lg, textAlign: 'center' }}>
            {nonprofits.isLoading ? t('moneyPayments.loading') : t('moneyPayments.noNonprofits')}
          </Text>
        }
        renderItem={({ item }) => {
          const tagline = i18n.language.startsWith('he') ? item.taglineHe : item.taglineEn;
          return (
            <Pressable
              style={styles.row}
              onPress={() => router.push(`/(tabs)/donations/money/nonprofit/${item.slug}`)}
            >
              <Text style={styles.rowTitle}>{item.name}</Text>
              {tagline ? <Text style={styles.rowMeta}>{tagline}</Text> : null}
            </Pressable>
          );
        }}
      />
    </Screen>
  );
}

export default function MoneyHubRoute() {
  return (
    <WorldLaunchGateByFlag flagKey="world_money_enabled">
      <MoneyHubScreen />
    </WorldLaunchGateByFlag>
  );
}
