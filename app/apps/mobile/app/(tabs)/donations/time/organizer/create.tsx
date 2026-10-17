import React, { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import DateTimePicker from '@react-native-community/datetimepicker';
import { makeUseStyles, radius, spacing, typography, useTheme } from '@kc/ui';
import { Screen } from '../../../../../src/components/ui/Screen';
import { volunteerUseCases } from '../../../../../src/services/volunteerComposition';
import { rtlTextAlignStart } from '../../../../../src/lib/rtlTextAlignStart';
import { webTextRtl } from '../../../../../src/lib/webRtlStyle';

const useStyles = makeUseStyles(({ colors }) => ({
  scroll: { padding: spacing.lg, gap: spacing.md },
  label: { ...typography.bodySmall, color: colors.textSecondary, textAlign: rtlTextAlignStart },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    ...typography.body,
    color: colors.textPrimary,
    textAlign: rtlTextAlignStart,
    ...webTextRtl,
  },
  btn: {
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: 'center' as const,
  },
  btnText: { ...typography.button, color: colors.textInverse },
  hint: { ...typography.caption, color: colors.textSecondary },
}));

export default function CreateVolunteerOpportunityScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useStyles();
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [location, setLocation] = useState('');
  const [starts, setStarts] = useState(new Date(Date.now() + 86400000));
  const [ends, setEnds] = useState(new Date(Date.now() + 86400000 + 7200000));
  const [capacity, setCapacity] = useState('10');
  const [busy, setBusy] = useState(false);

  const onCreate = async () => {
    if (!title.trim() || busy) return;
    setBusy(true);
    try {
      const id = await volunteerUseCases.createOpportunity().execute({
        title: title.trim(),
        summary: summary.trim() || null,
        locationLabel: location.trim() || null,
      });
      await volunteerUseCases.addShift().execute(
        id,
        starts.toISOString(),
        ends.toISOString(),
        Math.max(1, parseInt(capacity, 10) || 10),
      );
      await volunteerUseCases.publish().execute(id);
      router.replace({
        pathname: '/(tabs)/donations/time/organizer/[opportunityId]',
        params: { opportunityId: id },
      });
    } catch {
      alert(t('timeVolunteer.errorGeneric'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen blobs="content">
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>{t('timeVolunteer.fieldTitle')}</Text>
        <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholderTextColor={colors.textDisabled} />
        <Text style={styles.label}>{t('timeVolunteer.fieldSummary')}</Text>
        <TextInput
          style={[styles.input, { minHeight: 80 }]}
          value={summary}
          onChangeText={setSummary}
          multiline
          placeholderTextColor={colors.textDisabled}
        />
        <Text style={styles.label}>{t('timeVolunteer.fieldLocation')}</Text>
        <TextInput style={styles.input} value={location} onChangeText={setLocation} placeholderTextColor={colors.textDisabled} />
        <Text style={styles.label}>{t('timeVolunteer.shiftStarts')}</Text>
        <DateTimePicker value={starts} mode="datetime" onChange={(_, d) => d && setStarts(d)} />
        <Text style={styles.label}>{t('timeVolunteer.shiftEnds')}</Text>
        <DateTimePicker value={ends} mode="datetime" onChange={(_, d) => d && setEnds(d)} />
        <Text style={styles.label}>{t('timeVolunteer.shiftCapacity')}</Text>
        <TextInput
          style={styles.input}
          value={capacity}
          onChangeText={setCapacity}
          keyboardType="number-pad"
          placeholderTextColor={colors.textDisabled}
        />
        <Text style={styles.hint}>{t('timeVolunteer.publishHint')}</Text>
        <Pressable style={styles.btn} onPress={onCreate} disabled={busy}>
          <Text style={styles.btnText}>{t('timeVolunteer.publish')}</Text>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}
