import React from 'react';
import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { makeUseStyles, spacing, typography } from '@kc/ui';
import { Screen } from '../ui/Screen';
import { PrimaryButton } from '../ui/Buttons';
import { rtlTextAlignStart } from '../../lib/rtlTextAlignStart';

const useStyles = makeUseStyles(({ colors }) => ({
  body: { flex: 1, padding: spacing.lg, justifyContent: 'center' as const, gap: spacing.md },
  title: { ...typography.h2, color: colors.textPrimary, textAlign: rtlTextAlignStart },
  subtitle: { ...typography.body, color: colors.textSecondary, textAlign: rtlTextAlignStart },
}));

export function WorldComingSoonScreen() {
  const { t } = useTranslation();
  const styles = useStyles();
  const router = useRouter();

  return (
    <Screen>
      <View style={styles.body} testID="world-coming-soon">
        <Text style={styles.title}>{t('donations.worldLaunch.comingSoonTitle')}</Text>
        <Text style={styles.subtitle}>{t('donations.worldLaunch.comingSoonBody')}</Text>
        <PrimaryButton
          label={t('donations.worldLaunch.backToHub')}
          icon="arrow-back"
          onPress={() => router.replace('/(tabs)/donations')}
        />
      </View>
    </Screen>
  );
}
