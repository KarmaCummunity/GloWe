import React from 'react';
import { Pressable, Text } from 'react-native';
import { KcFlashList } from '../../../../../src/components/lists/KcFlashList';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { makeUseStyles, spacing, typography } from '@kc/ui';
import { KcRowCard } from '../../../../../src/components/cards/KcRowCard';
import { Screen } from '../../../../../src/components/ui/Screen';
import { volunteerUseCases } from '../../../../../src/services/volunteerComposition';
import { useShellTabBarScrollInset } from '../../../../../src/navigation/useShellTabBarVisibility';

const useStyles = makeUseStyles(({ colors }) => ({
  create: {
    margin: spacing.lg,
    padding: spacing.md,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center' as const,
  },
  createText: { ...typography.button, color: colors.textInverse },
}));

const ROW = { marginHorizontal: spacing.lg };

export default function OrganizerVolunteerListScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const styles = useStyles();
  const inset = useShellTabBarScrollInset();
  const list = useQuery({
    queryKey: ['volunteer', 'organizer'],
    queryFn: () => volunteerUseCases.listOrganizer().execute(50),
  });

  return (
    <Screen blobs="content">
      <KcFlashList
        data={list.data ?? []}
        keyExtractor={(item) => item.opportunityId}
        contentContainerStyle={{ paddingBottom: inset }}
        ListHeaderComponent={
          <Pressable
            style={styles.create}
            onPress={() => router.push('/(tabs)/donations/time/organizer/create')}
          >
            <Text style={styles.createText}>{t('timeVolunteer.createOpportunity')}</Text>
          </Pressable>
        }
        ListEmptyComponent={
          !list.isLoading ? (
            <Text style={{ padding: spacing.lg, textAlign: 'center' }}>{t('timeVolunteer.organizerEmpty')}</Text>
          ) : null
        }
        renderItem={({ item }) => (
          <KcRowCard
            testID={`organizer-row-${item.opportunityId}`}
            containerStyle={ROW}
            tone="give"
            badgeLabel={t('marketplace.world.time', { defaultValue: 'time' })}
            placeholderIcon="time-outline"
            title={item.title}
            statusLabel={item.status}
            closed={item.status === 'closed' || item.status === 'cancelled'}
            closedLabel={t('cards.closed')}
            onPress={() =>
              router.push({
                pathname: '/(tabs)/donations/time/organizer/[opportunityId]',
                params: { opportunityId: item.opportunityId },
              })
            }
          />
        )}
      />
    </Screen>
  );
}
