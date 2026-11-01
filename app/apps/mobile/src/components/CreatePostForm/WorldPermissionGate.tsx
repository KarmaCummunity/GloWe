// Mapped to spec: FR-POST-001 AC7 · product book docs/spec/05 §5.6 (housing needs ID
// verification, D30) · PM decision 2026-11-01 (housing stays gated until verification ships).
// Shows the create fields of a listing world only to a member the server lets publish there;
// anyone else sees why, instead of a form that fails on publish (`world_permission_denied`).
import React, { type ReactNode } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { iconSize, makeUseStyles, radius, spacing, typography, useTheme, Text } from '@kc/ui';
import { marketplaceRepository } from '../../services/marketplaceComposition';
import { rtlTextAlignStart } from '../../lib/rtlTextAlignStart';

const useStyles = makeUseStyles(({ colors }) => ({
  card: {
    gap: spacing.sm,
    padding: spacing.base,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center' as const,
  },
  title: { ...typography.h4, color: colors.textPrimary, textAlign: 'center' as const },
  body: { ...typography.body, color: colors.textSecondary, textAlign: rtlTextAlignStart },
}));

interface Props {
  readonly worldSlug: string;
  readonly children: ReactNode;
}

export function WorldPermissionGate({ worldSlug, children }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useStyles();
  const permission = useQuery({
    queryKey: ['world-publish-permission', worldSlug],
    queryFn: () => marketplaceRepository().canPublishInWorld(worldSlug),
    staleTime: 5 * 60_000, // verification changes rarely; the server re-checks on publish
  });

  if (permission.isPending) return <ActivityIndicator testID="world-permission-loading" />;
  if (permission.data !== false) return <>{children}</>;
  return (
    <View style={styles.card} testID="world-permission-notice">
      <Ionicons name="shield-checkmark-outline" size={iconSize['2xl']} color={colors.primary} />
      <Text style={styles.title}>{t(`post.unifiedCreate.noPermission.${worldSlug}.title`, { defaultValue: t('post.unifiedCreate.noPermission.default.title') })}</Text>
      <Text style={styles.body}>{t(`post.unifiedCreate.noPermission.${worldSlug}.body`, { defaultValue: t('post.unifiedCreate.noPermission.default.body') })}</Text>
    </View>
  );
}
