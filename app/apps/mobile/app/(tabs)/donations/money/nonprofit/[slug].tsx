import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { makeUseStyles, spacing, typography } from '@kc/ui';
import { Screen } from '../../../../../src/components/ui/Screen';
import { CampaignProgressBar } from '../../../../../src/components/money/CampaignProgressBar';
import { paymentsUseCases } from '../../../../../src/services/paymentsComposition';
import { useShellTabBarScrollInset } from '../../../../../src/navigation/useShellTabBarVisibility';
import { useExternalDonations } from '../../../../../src/hooks/useExternalDonations';

const useStyles = makeUseStyles(({ colors }) => ({
  body: { padding: spacing.lg, gap: spacing.lg },
  title: { ...typography.h2, color: colors.textPrimary },
  about: { ...typography.body, color: colors.textSecondary },
  stat: { ...typography.bodyLarge, color: colors.textPrimary, fontWeight: '700' as const },
  campaign: { padding: spacing.md, borderRadius: 12, backgroundColor: colors.surfaceRaised, gap: spacing.sm },
  campaignTitle: { ...typography.bodyLarge, color: colors.textPrimary },
  actions: { flexDirection: 'row' as const, gap: spacing.md, flexWrap: 'wrap' as const },
  btn: { flex: 1, minWidth: 140, padding: spacing.md, borderRadius: 12, backgroundColor: colors.primary },
  btnSecondary: { backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.border },
  btnText: { ...typography.button, color: colors.textInverse, textAlign: 'center' as const },
  btnTextSecondary: { color: colors.textPrimary },
}));

export default function NonprofitPublicScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const styles = useStyles();
  const inset = useShellTabBarScrollInset();
  const { external, openExternal } = useExternalDonations();
  const page = useQuery({
    queryKey: ['money', 'nonprofit', slug],
    queryFn: () => paymentsUseCases.getNonprofitPage().execute(slug),
    enabled: Boolean(slug),
  });

  const p = page.data;
  if (page.isLoading) {
    return (
      <Screen>
        <Text style={{ padding: spacing.lg }}>{t('moneyPayments.loading')}</Text>
      </Screen>
    );
  }
  if (!p) {
    return (
      <Screen>
        <Text style={{ padding: spacing.lg }}>{t('moneyPayments.nonprofitNotFound')}</Text>
      </Screen>
    );
  }

  const about = i18n.language.startsWith('he') ? p.aboutHe : p.aboutEn;
  const tagline = i18n.language.startsWith('he') ? p.taglineHe : p.taglineEn;

  return (
    <Screen>
      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: inset }]}>
        <Text style={styles.title}>{p.name}</Text>
        {tagline ? <Text style={styles.about}>{tagline}</Text> : null}
        {about ? <Text style={styles.about}>{about}</Text> : null}
        <Text style={styles.stat}>
          {t('moneyPayments.totalRaised', { amount: p.totalRaisedIls.toFixed(0) })}
        </Text>

        <View style={styles.actions}>
          <Pressable
            style={styles.btn}
            onPress={() =>
              external
                ? void openExternal('donate', p.orgId)
                : router.push({ pathname: '/(tabs)/donations/money/donate/[orgId]', params: { orgId: p.orgId } })
            }
          >
            <Text style={styles.btnText}>{t('moneyPayments.donateNow')}</Text>
          </Pressable>
          <Pressable
            style={[styles.btn, styles.btnSecondary]}
            onPress={() =>
              external
                ? void openExternal('standing-order', p.orgId)
                : router.push({
                    pathname: '/(tabs)/donations/money/standing-order/[orgId]',
                    params: { orgId: p.orgId },
                  })
            }
          >
            <Text style={[styles.btnText, styles.btnTextSecondary]}>{t('moneyPayments.monthlyGift')}</Text>
          </Pressable>
        </View>

        <Text style={styles.title}>{t('moneyPayments.campaignsSection')}</Text>
        {p.campaigns.length === 0 ? (
          <Text style={styles.about}>{t('moneyPayments.noCampaigns')}</Text>
        ) : (
          p.campaigns.map((c) => (
            <View key={c.listingId} style={styles.campaign}>
              <Text style={styles.campaignTitle}>{c.title}</Text>
              {c.summary ? <Text style={styles.about}>{c.summary}</Text> : null}
              <CampaignProgressBar
                raisedIls={c.raisedIls}
                goalIls={c.goalIls}
                label={t('moneyPayments.campaignProgress', {
                  raised: c.raisedIls.toFixed(0),
                  goal: c.goalIls.toFixed(0),
                })}
              />
            </View>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}
