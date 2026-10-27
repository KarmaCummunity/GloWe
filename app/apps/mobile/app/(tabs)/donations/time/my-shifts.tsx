import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { KcFlashList } from '../../../../src/components/lists/KcFlashList';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { makeUseStyles, spacing, typography } from '@kc/ui';
import { Screen } from '../../../../src/components/ui/Screen';
import { volunteerUseCases } from '../../../../src/services/volunteerComposition';
import { useShellTabBarScrollInset } from '../../../../src/navigation/useShellTabBarVisibility';

const useStyles = makeUseStyles(({ colors }) => ({
  row: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    padding: spacing.md,
    borderRadius: 12,
    backgroundColor: colors.surfaceRaised,
  },
  title: { ...typography.bodyLarge, color: colors.textPrimary },
  meta: { ...typography.caption, color: colors.textSecondary, marginTop: 4 },
  actions: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: spacing.md, marginTop: spacing.sm },
  action: { ...typography.bodySmall, color: colors.primary, fontWeight: '600' as const },
}));

function statusLabel(status: string, t: (k: string) => string) {
  if (status === 'waitlisted') return t('timeVolunteer.statusWaitlisted');
  if (status === 'checked_in') return t('timeVolunteer.statusCheckedIn');
  return t('timeVolunteer.statusRegistered');
}

export default function MyVolunteerShiftsScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const styles = useStyles();
  const inset = useShellTabBarScrollInset();
  const qc = useQueryClient();
  const signups = useQuery({
    queryKey: ['volunteer', 'my-signups'],
    queryFn: () => volunteerUseCases.listMySignups().execute(50),
  });

  const onCheckIn = async (signupId: string) => {
    try {
      const result = await volunteerUseCases.checkIn().execute(signupId);
      await qc.invalidateQueries({ queryKey: ['volunteer'] });
      alert(
        t('timeVolunteer.checkInDone', {
          hours: result.hoursLogged,
          karma: result.karmaPoints,
        }),
      );
    } catch {
      alert(t('timeVolunteer.errorGeneric'));
    }
  };

  const onCancel = async (signupId: string) => {
    try {
      await volunteerUseCases.cancelSignup().execute(signupId);
      await qc.invalidateQueries({ queryKey: ['volunteer'] });
    } catch {
      alert(t('timeVolunteer.errorGeneric'));
    }
  };

  const onIcs = async (shiftId: string) => {
    try {
      const ics = await volunteerUseCases.getIcs().execute(shiftId);
      if (!ics) return;
      const { Share } = await import('react-native');
      await Share.share({ message: ics, title: t('timeVolunteer.calendarShareTitle') });
    } catch {
      alert(t('timeVolunteer.errorGeneric'));
    }
  };

  return (
    <Screen blobs="content">
      <KcFlashList
        data={signups.data ?? []}
        keyExtractor={(item) => item.signupId}
        contentContainerStyle={{ paddingBottom: inset, paddingTop: spacing.md }}
        ListEmptyComponent={
          <Text style={{ padding: spacing.lg, textAlign: 'center' }}>
            {signups.isLoading ? t('timeVolunteer.loading') : t('timeVolunteer.myShiftsEmpty')}
          </Text>
        }
        renderItem={({ item }) => {
          const when = new Date(item.startsAt).toLocaleString(
            i18n.language.startsWith('he') ? 'he-IL' : 'en-IL',
            { dateStyle: 'medium', timeStyle: 'short' },
          );
          return (
            <View style={styles.row}>
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: '/(tabs)/donations/time/opportunity/[opportunityId]',
                    params: { opportunityId: item.opportunityId },
                  })
                }
              >
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.meta}>
                  {when} · {statusLabel(item.status, t)}
                  {item.hoursLogged != null ? ` · ${item.hoursLogged}h` : ''}
                </Text>
              </Pressable>
              <View style={styles.actions}>
                {item.status === 'registered' ? (
                  <Pressable onPress={() => onCheckIn(item.signupId)}>
                    <Text style={styles.action}>{t('timeVolunteer.checkIn')}</Text>
                  </Pressable>
                ) : null}
                {item.status === 'registered' || item.status === 'waitlisted' ? (
                  <Pressable onPress={() => onCancel(item.signupId)}>
                    <Text style={styles.action}>{t('timeVolunteer.cancelSignup')}</Text>
                  </Pressable>
                ) : null}
                <Pressable onPress={() => onIcs(item.shiftId)}>
                  <Text style={styles.action}>{t('timeVolunteer.addCalendar')}</Text>
                </Pressable>
              </View>
            </View>
          );
        }}
      />
    </Screen>
  );
}
