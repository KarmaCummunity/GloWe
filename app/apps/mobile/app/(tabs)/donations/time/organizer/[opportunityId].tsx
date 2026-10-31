import React, { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { makeUseStyles, radius, spacing, typography, useTheme, Text, TextInput } from '@kc/ui';
import { Screen } from '../../../../../src/components/ui/Screen';
import { volunteerUseCases } from '../../../../../src/services/volunteerComposition';
import { rtlTextAlignStart } from '../../../../../src/lib/rtlTextAlignStart';
import { webTextRtl } from '../../../../../src/lib/webRtlStyle';

const useStyles = makeUseStyles(({ colors }) => ({
  scroll: { padding: spacing.lg, gap: spacing.md },
  title: { ...typography.h3, color: colors.textPrimary, textAlign: rtlTextAlignStart },
  shift: {
    padding: spacing.md,
    borderRadius: 12,
    backgroundColor: colors.surfaceRaised,
    gap: spacing.sm,
  },
  link: { ...typography.body, color: colors.primary, fontWeight: '600' as const },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    minHeight: 80,
    ...typography.body,
    color: colors.textPrimary,
    textAlign: rtlTextAlignStart,
    ...webTextRtl,
  },
  btn: { padding: spacing.md, borderRadius: radius.lg, backgroundColor: colors.primary, alignItems: 'center' as const },
  btnText: { ...typography.button, color: colors.textInverse },
  danger: { backgroundColor: colors.error },
}));

export default function OrganizerOpportunityManageScreen() {
  const { opportunityId } = useLocalSearchParams<{ opportunityId: string }>();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useStyles();
  const qc = useQueryClient();
  const [messageShift, setMessageShift] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  const detail = useQuery({
    queryKey: ['volunteer', 'detail', opportunityId],
    queryFn: () => volunteerUseCases.getDetail().execute(String(opportunityId)),
    enabled: Boolean(opportunityId),
  });

  const sendMessage = async () => {
    if (!messageShift || !message.trim()) return;
    try {
      const count = await volunteerUseCases.messageVolunteers().execute(messageShift, message.trim());
      setMessage('');
      setMessageShift(null);
      alert(t('timeVolunteer.messageSent', { count }));
    } catch {
      alert(t('timeVolunteer.errorGeneric'));
    }
  };

  const closeOpp = async () => {
    try {
      await volunteerUseCases.close().execute(String(opportunityId));
      await qc.invalidateQueries({ queryKey: ['volunteer'] });
      router.back();
    } catch {
      alert(t('timeVolunteer.errorGeneric'));
    }
  };

  const d = detail.data;
  if (!d) {
    return (
      <Screen>
        <Text style={{ padding: spacing.lg }}>{t('timeVolunteer.loading')}</Text>
      </Screen>
    );
  }

  return (
    <Screen blobs="content">
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>{d.title}</Text>
        {d.shifts.map((shift) => {
          const when = new Date(shift.startsAt).toLocaleString(
            i18n.language.startsWith('he') ? 'he-IL' : 'en-IL',
            { dateStyle: 'medium', timeStyle: 'short' },
          );
          return (
            <View key={shift.shiftId} style={styles.shift}>
              <Text>{when}</Text>
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: '/(tabs)/donations/time/shift/[shiftId]/volunteers',
                    params: { shiftId: shift.shiftId },
                  })
                }
              >
                <Text style={styles.link}>{t('timeVolunteer.manageVolunteers')}</Text>
              </Pressable>
              <Pressable onPress={() => setMessageShift(shift.shiftId)}>
                <Text style={styles.link}>{t('timeVolunteer.messageVolunteers')}</Text>
              </Pressable>
            </View>
          );
        })}
        {messageShift ? (
          <View style={{ gap: spacing.sm }}>
            <TextInput
              style={styles.input}
              value={message}
              onChangeText={setMessage}
              placeholder={t('timeVolunteer.messagePlaceholder')}
              placeholderTextColor={colors.textDisabled}
              multiline
            />
            <Pressable style={styles.btn} onPress={sendMessage}>
              <Text style={styles.btnText}>{t('timeVolunteer.sendMessage')}</Text>
            </Pressable>
          </View>
        ) : null}
        <Pressable style={[styles.btn, styles.danger]} onPress={closeOpp}>
          <Text style={styles.btnText}>{t('timeVolunteer.closeOpportunity')}</Text>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}
