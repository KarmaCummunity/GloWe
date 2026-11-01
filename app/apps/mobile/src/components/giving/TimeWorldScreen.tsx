// Mapped to spec: FR-FEED-020 AC2 · docs/spec/05 §5.4 (anyone can give an hour; one-off,
// person-to-person and organisation events). The time world's feed with its sub-screens.
import React from 'react';
import { Pressable, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { makeUseStyles, spacing, typography, Text } from '@kc/ui';
import { WorldHubHeader } from './WorldMarketplaceHub';
import { WorldFeedScreen } from './WorldFeedScreen';

/** The time world's sub-screens, in display order. */
const TIME_SUB_SCREENS: ReadonlyArray<{ readonly labelKey: string; readonly href: Href }> = [
  { labelKey: 'donations.worldFeed.timeOpportunitiesLink', href: '/(tabs)/donations/time/opportunities' },
  { labelKey: 'timeVolunteer.myShiftsLink', href: '/(tabs)/donations/time/my-shifts' },
  { labelKey: 'timeVolunteer.organizerLink', href: '/(tabs)/donations/time/organizer' },
  { labelKey: 'timeVolunteer.contactKcLink', href: '/(tabs)/donations/time/support' },
];

export function TimeWorldScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const styles = useStyles();
  return (
    <WorldFeedScreen
      worldSlug="time"
      header={
        <WorldHubHeader
          worldSlug="time"
          icon="time-outline"
          introKey="timeVolunteer.hubIntro"
          showCreateLink={false}
          headerExtra={
            <View style={styles.links}>
              {TIME_SUB_SCREENS.map((s) => (
                <Pressable key={s.labelKey} onPress={() => router.push(s.href)} accessibilityRole="link">
                  <Text style={styles.link}>{t(s.labelKey)}</Text>
                </Pressable>
              ))}
            </View>
          }
        />
      }
    />
  );
}

const useStyles = makeUseStyles(({ colors }) => ({
  links: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: spacing.md, paddingHorizontal: spacing.lg },
  link: { ...typography.body, ...typography.semiBold, color: colors.primary },
}));
