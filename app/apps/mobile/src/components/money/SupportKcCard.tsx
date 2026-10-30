// FR-DONATE-011 — "Support KC directly" card at the top of the Money hub (D20).
// Every option opens a licensed provider's hosted page outside the app, so no
// payment data is handled here and store rules on donations are respected.
import React, { useCallback } from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { makeUseStyles, useTheme } from '@kc/ui';
import { warmPromptCardBase } from '../warmPromptCardStyles';
import { aboutOpenExternalUrl } from '../../features/about-landing/aboutOpenExternalUrl';
import { useKcSupportOptions } from '../../hooks/useKcSupportOptions';
import { SupportKcOptions } from './SupportKcOptions';
import { SupportKcDisclosure } from './SupportKcDisclosure';

const useStyles = makeUseStyles((theme) => {
  const base = warmPromptCardBase(theme);
  return { card: base.card, iconBadge: base.iconBadge, title: base.title, tagline: base.bodyLine };
});

export function SupportKcCard() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useStyles();
  const { data, isLoading } = useKcSupportOptions();

  const openChannel = useCallback(
    (url: string) => void aboutOpenExternalUrl(url, t('supportKc.linkError')),
    [t],
  );

  return (
    <View style={styles.card} testID="support-kc-card">
      <View style={styles.iconBadge}>
        <Ionicons name="heart" size={26} color={colors.textInverse} />
      </View>
      <Text style={styles.title} accessibilityRole="header">{t('supportKc.title')}</Text>
      <Text style={styles.tagline}>{t('supportKc.tagline')}</Text>
      <SupportKcOptions options={data} loading={isLoading} onOpen={openChannel} />
      <SupportKcDisclosure hasStandingOrder={Boolean(data?.standingOrder)} />
    </View>
  );
}
