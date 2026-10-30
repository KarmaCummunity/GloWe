// Settings → Translation language screen — FR-TRANSLATE-003 (AC1).
//
// Picks the reader's preferred output language for auto-translated UGC. "Device
// default" persists null (resolveReaderLanguage folds in the OS locale). The
// selection writes users.preferred_language and invalidates the translation
// caches so the feed + open posts re-render in the new language.
import React from 'react';
import { Alert, ScrollView, View } from 'react-native';
import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { makeUseStyles, spacing, typography, useTheme, Text } from '@kc/ui';
import { useDetailStackScreenOptions } from '../../src/navigation/detailStackScreenOptions';
import { rtlTextAlignStart } from '../../src/lib/rtlTextAlignStart';
import { webTextRtl, webViewRtl } from '../../src/lib/webRtlStyle';
import { LanguageRow } from '../../src/components/settings/translationLanguageParts';
import { SUPPORTED_TRANSLATION_LANGUAGES } from '../../src/lib/supportedTranslationLanguages';
import { getUserRepo } from '../../src/services/userComposition';
import { useAuthStore } from '../../src/store/authStore';

export default function TranslationLanguageScreen() {
  const detailStackScreenOptions = useDetailStackScreenOptions();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useScreenStyles();
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.session?.userId);

  const userQuery = useQuery({
    queryKey: ['user-profile', userId],
    queryFn: () => getUserRepo().findById(userId!),
    enabled: Boolean(userId),
    staleTime: 5 * 60_000,
  });

  const [savingTag, setSavingTag] = React.useState<string | null | undefined>(undefined);
  const persisted = userQuery.data?.preferredLanguage ?? null;
  // Optimistic reflection: show the tag being saved until the write resolves.
  const currentTag = savingTag === undefined ? persisted : savingTag;

  const onPick = React.useCallback(
    async (tag: string | null) => {
      if (!userId || tag === currentTag) return;
      setSavingTag(tag);
      try {
        await getUserRepo().setPreferredLanguage(userId, tag);
        await queryClient.invalidateQueries({ queryKey: ['user-profile', userId] });
        await queryClient.invalidateQueries({ queryKey: ['post-translations'] });
      } catch {
        setSavingTag(undefined); // revert to persisted value
        Alert.alert(t('general.error'), t('settings.translationLanguageSaveFailed'));
      }
    },
    [userId, currentTag, queryClient, t],
  );

  const busy = userQuery.isLoading || !userId;

  return (
    <>
      <Stack.Screen
        options={{
          ...detailStackScreenOptions,
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.primary,
          headerTitle: t('settings.translationLanguage'),
        }}
      />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.intro}>{t('settings.translationLanguageIntro')}</Text>
        <View style={styles.optionGroup}>
          <LanguageRow
            label={t('settings.translationLanguageDeviceDefault')}
            selected={currentTag === null}
            disabled={busy}
            onSelect={() => onPick(null)}
          />
          {SUPPORTED_TRANSLATION_LANGUAGES.map((opt) => (
            <LanguageRow
              key={opt.tag}
              label={t(opt.labelKey)}
              selected={currentTag === opt.tag}
              disabled={busy}
              onSelect={() => onPick(opt.tag)}
            />
          ))}
        </View>
      </ScrollView>
    </>
  );
}

const useScreenStyles = makeUseStyles(({ colors }) => ({
  scroll: { flex: 1, backgroundColor: colors.background, ...webViewRtl },
  scrollContent: {
    padding: spacing.base,
    paddingBottom: spacing['3xl'],
    ...webViewRtl,
  },
  intro: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: rtlTextAlignStart,
    marginBottom: spacing.lg,
    width: '100%',
    ...webTextRtl,
  },
  optionGroup: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden' as const,
    ...webViewRtl,
  },
}));
