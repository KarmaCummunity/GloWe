// FR-DONATE AC2 — admin-facing bubble for donation-link reports.
// Renders a tappable card that opens the reported URL in the external
// browser. Admin-gated (consistent with ReportReceivedBubble).
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { makeUseStyles, useTheme } from '@kc/ui';
import { hasPermission, type AdminRole } from '@kc/domain';
import { useAdminRoles } from '../../../hooks/useAdminRoles';
import { openExternalUrl } from '../../../utils/openExternalUrl';
import { useTranslation } from 'react-i18next';
import type { SystemMessageBubbleProps } from './SystemMessageBubble';

export function DonationLinkReportedBubble({
  payload,
  handledByLaterAction,
}: SystemMessageBubbleProps) {
  const { roles } = useAdminRoles();
  const canViewReports = hasPermission(roles as readonly AdminRole[], 'reports.view');
  const styles = useDonationLinkReportedBubbleStyles();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const url = typeof payload?.url === 'string' ? payload.url : null;
  const displayName = typeof payload?.display_name === 'string' ? payload.display_name : null;
  const categorySlug = typeof payload?.category_slug === 'string' ? payload.category_slug : null;
  const showCard = canViewReports && !!url;

  return (
    <View style={[styles.bubble, handledByLaterAction && styles.dimmed]}>
      <Text style={styles.title}>{t('moderation.bubble.donationLinkReported.title')}</Text>
      {showCard && url ? (
        <Pressable
          onPress={() => openExternalUrl(url)}
          accessibilityRole="button"
          accessibilityLabel={t('moderation.bubble.donationLinkReported.a11yOpen').replace('{name}', displayName ?? url)}
          style={styles.card}
        >
          {displayName ? <Text style={styles.handle}>{displayName}</Text> : null}
          <Text style={styles.snippet} numberOfLines={2}>{url}</Text>
          {categorySlug ? <Text style={styles.snippet}>{`#${categorySlug}`}</Text> : null}
          <View style={styles.openRow}>
            <Ionicons name="open-outline" size={16} color={colors.secondary} />
            <Text style={styles.openText}>{t('moderation.bubble.targetPreview.open')}</Text>
          </View>
        </Pressable>
      ) : null}
    </View>
  );
}

const useDonationLinkReportedBubbleStyles = makeUseStyles(({ colors }) => ({
  bubble: {
    padding: 8,
    backgroundColor: colors.warningLight,
    borderRadius: 8,
    marginVertical: 4,
    alignSelf: 'center' as const,
    maxWidth: '90%',
  },
  dimmed: { opacity: 0.5 },
  title: { fontWeight: '600' as const, color: colors.textPrimary },
  card: {
    marginTop: 6,
    padding: 8,
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
    minHeight: 44,
  },
  handle: { fontWeight: '600' as const, color: colors.textPrimary },
  snippet: { fontSize: 13, marginTop: 2, color: colors.textSecondary },
  openRow: { flexDirection: 'row' as const, alignItems: 'center' as const, marginTop: 6, gap: 4 },
  openText: { color: colors.secondary, fontWeight: '600' as const, fontSize: 13 },
}));
