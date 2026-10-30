import React from 'react';
import { Pressable, View } from 'react-native';
import { KcFlashList } from '../../../../src/components/lists/KcFlashList';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { makeUseStyles, spacing, typography, Text } from '@kc/ui';
import { Screen } from '../../../../src/components/ui/Screen';
import { KcRowCard } from '../../../../src/components/cards/KcRowCard';
import { IconTile } from '../../../../src/components/ui/IconTile';
import { DonationLinksList } from '../../../../src/components/DonationLinksList';
import { volunteerUseCases } from '../../../../src/services/volunteerComposition';
import { useShellTabBarScrollInset } from '../../../../src/navigation/useShellTabBarVisibility';
import { WorldLaunchGateByFlag } from '../../../../src/components/worlds/WorldLaunchGate';

const useStyles = makeUseStyles(({ colors }) => ({
  hero: { alignItems: 'center' as const, gap: spacing.md, padding: spacing.lg },
  body: { ...typography.body, color: colors.textSecondary, textAlign: 'center' as const },
  links: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: spacing.md, paddingHorizontal: spacing.lg },
  link: { ...typography.body, color: colors.primary, fontWeight: '600' as const },
  section: { ...typography.h3, color: colors.textPrimary, paddingHorizontal: spacing.lg, marginTop: spacing.lg },
}));

const ROW = { marginHorizontal: spacing.lg };

function formatWhen(iso: string | null, locale: string) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString(locale.startsWith('he') ? 'he-IL' : 'en-IL', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return iso;
  }
}

function TimeVolunteerHubScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const styles = useStyles();
  const inset = useShellTabBarScrollInset();
  const opportunities = useQuery({
    queryKey: ['volunteer', 'browse'],
    queryFn: () => volunteerUseCases.listOpportunities().execute(40, 0),
    staleTime: 30_000,
  });

  return (
    <Screen blobs="content">
      <KcFlashList
        data={opportunities.data ?? []}
        keyExtractor={(item) => item.opportunityId}
        contentContainerStyle={{ paddingBottom: inset }}
        ListHeaderComponent={
          <>
            <View style={styles.hero}>
              <IconTile icon="time-outline" size="lg" />
              <Text style={styles.body}>{t('timeVolunteer.hubIntro')}</Text>
            </View>
            <View style={styles.links}>
              <Pressable onPress={() => router.push('/(tabs)/donations/time/my-shifts')}>
                <Text style={styles.link}>{t('timeVolunteer.myShiftsLink')}</Text>
              </Pressable>
              <Pressable onPress={() => router.push('/(tabs)/donations/time/organizer')}>
                <Text style={styles.link}>{t('timeVolunteer.organizerLink')}</Text>
              </Pressable>
              <Pressable onPress={() => router.push('/(tabs)/donations/time/support')}>
                <Text style={styles.link}>{t('timeVolunteer.contactKcLink')}</Text>
              </Pressable>
            </View>
            <Text style={styles.section}>{t('timeVolunteer.hubTitle')}</Text>
          </>
        }
        ListEmptyComponent={
          <Text style={{ padding: spacing.lg, textAlign: 'center' }}>
            {opportunities.isLoading ? t('timeVolunteer.loading') : t('timeVolunteer.emptyBrowse')}
          </Text>
        }
        renderItem={({ item }) => (
          <KcRowCard
            testID={`opportunity-row-${item.opportunityId}`}
            containerStyle={ROW}
            tone="give"
            badgeLabel={t('marketplace.world.time', { defaultValue: 'time' })}
            placeholderIcon="time-outline"
            title={item.title}
            meta={[
              item.locationLabel,
              `${t('timeVolunteer.slotsOpen', { count: item.openSlots })}${
                item.nextShiftAt ? ` · ${t('timeVolunteer.nextShift', { date: formatWhen(item.nextShiftAt, i18n.language) })}` : ''
              }`,
            ]}
            onPress={() =>
              router.push({
                pathname: '/(tabs)/donations/time/opportunity/[opportunityId]',
                params: { opportunityId: item.opportunityId },
              })
            }
          />
        )}
        ListFooterComponent={
          <View style={{ marginTop: spacing.lg }}>
            <DonationLinksList categorySlug="time" />
          </View>
        }
      />
    </Screen>
  );
}

export default function TimeVolunteerHubRoute() {
  return (
    <WorldLaunchGateByFlag flagKey="world_time_enabled">
      <TimeVolunteerHubScreen />
    </WorldLaunchGateByFlag>
  );
}
