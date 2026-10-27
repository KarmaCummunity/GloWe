// FR-MOD-002 / FR-CHAT-007 AC3 — collect description + category, submit
// support issue (injects system message), navigate to the support thread.
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ChatError } from '@kc/application';
import { makeUseStyles, typography, spacing, radius, useTheme } from '@kc/ui';
import { useDetailStackScreenOptions } from '../../src/navigation/detailStackScreenOptions';
import { Card } from '../../src/components/ui/Card';
import { PrimaryButton } from '../../src/components/ui/Buttons';
import { container } from '../../src/lib/container';
import { NotifyModal } from '../../src/components/NotifyModal';
import { rtlTextAlignStart } from '../../src/lib/rtlTextAlignStart';
import { webTextRtl, webViewRtl } from '../../src/lib/webRtlStyle';
import { useTranslation } from 'react-i18next';

const CATEGORIES = ['Bug', 'Account', 'Suggestion', 'Other'] as const;
const MAX_DESC = 500;

export default function ReportIssueScreen() {
  const detailStackScreenOptions = useDetailStackScreenOptions();
  const router = useRouter();
  const { t } = useTranslation();
  const styles = useReportIssueScreenStyles();
  const { colors } = useTheme();
  const [category, setCategory] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [notify, setNotify] = useState<{ title: string; message: string } | null>(null);

  const descTrimmed = description.trim();
  const isValid = descTrimmed.length >= 10;

  const submit = async () => {
    if (!isValid || busy) return;
    setBusy(true);
    try {
      const chat = await container.submitSupportIssue.execute({ category, description: descTrimmed });
      router.replace({ pathname: '/chat/[id]', params: { id: chat.chatId } });
    } catch (err) {
      const errorTitle = t('settings.reportIssueErrorTitle');
      if (err instanceof ChatError && err.code === 'super_admin_not_found') {
        setNotify({ title: errorTitle, message: t('settings.reportIssueScreen.errorAdminNotFound') });
      } else {
        setNotify({ title: errorTitle, message: t('settings.reportIssueScreen.errorGeneric') });
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
      <Stack.Screen
        options={{
          ...detailStackScreenOptions,
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.primary,
          headerTitle: t('settings.reportIssueScreen.title'),
        }}
      />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.introRow}>
            <View style={styles.introIcon}>
              <Ionicons name="chatbubbles-outline" size={22} color={colors.primary} />
            </View>
            <Text style={styles.copy}>{t('settings.reportIssueScreen.copy')}</Text>
          </View>

          <Card padding="base" style={styles.formCard}>
            <Text style={styles.label}>{t('settings.reportIssueScreen.categoryLabel')}</Text>
            <View style={styles.chips}>
              {CATEGORIES.map((cat) => {
                const selected = category === cat;
                return (
                  <Pressable
                    key={cat}
                    style={[styles.chip, selected && styles.chipSelected]}
                    onPress={() => setCategory(selected ? null : cat)}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                  >
                    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                      {t(`settings.reportIssueScreen.categories.${cat}`)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={[styles.label, styles.labelSpaced]}>{t('settings.reportIssueScreen.descriptionLabel')}</Text>
            <TextInput
              style={styles.input}
              multiline
              numberOfLines={6}
              placeholder={t('settings.reportIssueScreen.descriptionPlaceholder')}
              placeholderTextColor={colors.textSecondary}
              value={description}
              onChangeText={setDescription}
              textAlign={rtlTextAlignStart as 'left' | 'right'}
              maxLength={MAX_DESC}
            />
            <View style={styles.inputFooter}>
              {descTrimmed.length > 0 && descTrimmed.length < 10 ? (
                <Text style={styles.hint}>{t('settings.reportIssueScreen.descriptionMinLength')}</Text>
              ) : (
                <View />
              )}
              <Text style={styles.counter}>{`${description.length}/${MAX_DESC}`}</Text>
            </View>
          </Card>

          <PrimaryButton
            label={busy ? t('settings.reportIssueScreen.submitting') : t('settings.reportIssueScreen.submitBtn')}
            onPress={submit}
            loading={busy}
            disabled={!isValid}
            fullWidth
            icon="send-outline"
          />
        </ScrollView>
      </KeyboardAvoidingView>
      <NotifyModal
        visible={notify !== null}
        title={notify?.title ?? ''}
        message={notify?.message ?? ''}
        onDismiss={() => setNotify(null)}
      />
    </SafeAreaView>
  );
}

const useReportIssueScreenStyles = makeUseStyles(({ colors, isDark }) => ({
  safe: { flex: 1, backgroundColor: colors.background, ...webViewRtl },
  flex: { flex: 1, ...webViewRtl },
  body: { padding: spacing.base, gap: spacing.lg, paddingBottom: spacing.xl, ...webViewRtl },
  introRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    ...webViewRtl,
  },
  introIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryLight,
  },
  copy: {
    ...typography.body,
    flex: 1,
    color: colors.textSecondary,
    textAlign: rtlTextAlignStart,
    lineHeight: 22,
    ...webTextRtl,
  },
  formCard: { gap: spacing.sm, ...webViewRtl },
  label: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    fontWeight: '600',
    textAlign: rtlTextAlignStart,
    width: '100%',
    ...webTextRtl,
  },
  labelSpaced: { marginTop: spacing.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, ...webViewRtl },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  chipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  chipText: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    fontWeight: '500',
    textAlign: 'center',
    ...webTextRtl,
  },
  chipTextSelected: { color: colors.primary, fontWeight: '700' },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.sm,
    minHeight: 140,
    textAlignVertical: 'top',
    ...typography.body,
    color: colors.textPrimary,
    backgroundColor: isDark ? colors.background : colors.surface,
    textAlign: rtlTextAlignStart,
    ...webTextRtl,
  },
  inputFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    ...webViewRtl,
  },
  hint: {
    ...typography.caption,
    color: colors.error,
    flex: 1,
    textAlign: rtlTextAlignStart,
    ...webTextRtl,
  },
  counter: { ...typography.caption, color: colors.textSecondary, fontVariant: ['tabular-nums'] },
}));
