import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { makeUseStyles, spacing, typography } from '@kc/ui';
import { Screen } from '../../../../../src/components/ui/Screen';
import { volunteerUseCases } from '../../../../../src/services/volunteerComposition';
import { useAuthStore } from '../../../../../src/store/authStore';

const useStyles = makeUseStyles(({ colors }) => ({
  scroll: { padding: spacing.lg, gap: spacing.md },
  title: { ...typography.h2, color: colors.textPrimary },
  summary: { ...typography.body, color: colors.textSecondary },
  shift: {
    padding: spacing.md,
    borderRadius: 12,
    backgroundColor: colors.surfaceRaised,
    gap: spacing.xs,
  },
  shiftMeta: { ...typography.caption, color: colors.textSecondary },
  btn: {
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    alignItems: 'center' as const,
    backgroundColor: colors.primary,
    borderRadius: 10,
  },
  btnText: { ...typography.button, color: colors.textInverse },
  btnSecondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  btnSecondaryText: { ...typography.button, color: colors.primary },
}));

export default function VolunteerOpportunityDetailScreen() {
  const { opportunityId } = useLocalSearchParams<{ opportunityId: string }>();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const styles = useStyles();
  const qc = useQueryClient();
  const userId = useAuthStore((s) => s.session?.userId ?? null);
  const [busyShift, setBusyShift] = useState<string | null>(null);

  const detail = useQuery({
    queryKey: ['volunteer', 'detail', opportunityId],
    queryFn: () => volunteerUseCases.getDetail().execute(String(opportunityId)),
    enabled: Boolean(opportunityId),
  });

  const onSignUp = async (shiftId: string, waitlist: boolean) => {
    if (!userId) return;
    setBusyShift(shiftId);
    try {
      await volunteerUseCases.signUp().execute(shiftId);
      await qc.invalidateQueries({ queryKey: ['volunteer'] });
      alert(waitlist ? t('timeVolunteer.statusWaitlisted') : t('timeVolunteer.statusRegistered'));
    } catch {
      alert(t('timeVolunteer.errorGeneric'));
    } finally {
      setBusyShift(null);
    }
  };

  const d = detail.data;
  if (!d && detail.isLoading) {
    return (
      <Screen>
        <Text style={{ padding: spacing.lg }}>{t('timeVolunteer.loading')}</Text>
      </Screen>
    );
  }
  if (!d) {
    return (
      <Screen>
        <Text style={{ padding: spacing.lg }}>{t('timeVolunteer.errorGeneric')}</Text>
      </Screen>
    );
  }

  const isOrganizer = userId != null && d.organizerId === userId;

  return (
    <Screen blobs="content">
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>{d.title}</Text>
        {d.locationLabel ? <Text style={styles.summary}>{d.locationLabel}</Text> : null}
        {d.summary ? <Text style={styles.summary}>{d.summary}</Text> : null}
        {isOrganizer ? (
          <Pressable
            style={[styles.btn, styles.btnSecondary]}
            onPress={() =>
              router.push({
                pathname: '/(tabs)/donations/time/organizer/[opportunityId]',
                params: { opportunityId: d.opportunityId },
              })
            }
          >
            <Text style={styles.btnSecondaryText}>{t('timeVolunteer.organizerLink')}</Text>
          </Pressable>
        ) : null}
        {d.shifts.map((shift) => {
          const when = `${new Date(shift.startsAt).toLocaleString(i18n.language.startsWith('he') ? 'he-IL' : 'en-IL', {
            dateStyle: 'medium',
            timeStyle: 'short',
          })} – ${new Date(shift.endsAt).toLocaleTimeString(i18n.language.startsWith('he') ? 'he-IL' : 'en-IL', {
            timeStyle: 'short',
          })}`;
          const mine = shift.myStatus;
          return (
            <View key={shift.shiftId} style={styles.shift}>
              <Text style={styles.shiftMeta}>{when}</Text>
              <Text style={styles.shiftMeta}>
                {t('timeVolunteer.slotsOpen', { count: shift.slotsOpen })} ({shift.filled}/{shift.capacity})
              </Text>
              {mine && mine !== 'cancelled' ? (
                <Text style={styles.shiftMeta}>{mine}</Text>
              ) : (
                <Pressable
                  disabled={busyShift === shift.shiftId}
                  style={styles.btn}
                  onPress={() => onSignUp(shift.shiftId, shift.slotsOpen <= 0)}
                >
                  <Text style={styles.btnText}>
                    {shift.slotsOpen <= 0 ? t('timeVolunteer.waitlist') : t('timeVolunteer.signUp')}
                  </Text>
                </Pressable>
              )}
            </View>
          );
        })}
      </ScrollView>
    </Screen>
  );
}
