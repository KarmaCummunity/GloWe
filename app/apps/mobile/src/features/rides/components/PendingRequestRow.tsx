// FR-RIDE-024 — single pending join-request row inside MyRideRow.
import React from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { makeUseStyles, radius, spacing, typography, useTheme, Text } from '@kc/ui';

import { AvatarInitials } from '../../../components/AvatarInitials';
import { rtlTextAlignStart } from '../../../lib/rtlTextAlignStart';
import { rowDirectionStart } from '../../../lib/rtlLayout';
import { getUserRepo } from '../../../services/userComposition';

interface Props {
  readonly participantId: string;
  readonly userId: string;
  readonly note: string | null;
  readonly busy: boolean;
  readonly onApprove: () => void;
  readonly onReject: () => void;
}

export function PendingRequestRow({ userId, note, busy, onApprove, onReject }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useStyles();
  const userQuery = useQuery({
    queryKey: ['user', userId],
    queryFn: () => getUserRepo().findById(userId),
    staleTime: 60_000,
  });
  const name = userQuery.data?.displayName ?? t('profile.fallbackName');

  return (
    <View style={styles.row}>
      <View style={styles.header}>
        <AvatarInitials name={name} avatarUrl={userQuery.data?.avatarUrl ?? null} size={28} />
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>
      </View>
      {note ? (
        <Text style={styles.note} numberOfLines={2}>
          {note}
        </Text>
      ) : null}
      <View style={styles.actions}>
        <Pressable
          style={[styles.approveBtn, busy && styles.btnDisabled]}
          onPress={onApprove}
          disabled={busy}
          accessibilityRole="button"
        >
          {busy ? (
            <ActivityIndicator color={colors.textInverse} size="small" />
          ) : (
            <>
              <Ionicons name="checkmark" size={16} color={colors.textInverse} />
              <Text style={styles.approveBtnText}>{t('donations.rides.dashboard.approve')}</Text>
            </>
          )}
        </Pressable>
        <Pressable
          style={[styles.rejectBtn, busy && styles.btnDisabled]}
          onPress={onReject}
          disabled={busy}
          accessibilityRole="button"
        >
          <Ionicons name="close" size={16} color={colors.error} />
          <Text style={styles.rejectBtnText}>{t('donations.rides.dashboard.reject')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const useStyles = makeUseStyles(({ colors }) => ({
  row: { gap: spacing.xs },
  header: {
    flexDirection: rowDirectionStart,
    alignItems: 'center',
    gap: spacing.sm,
  },
  name: {
    ...typography.body,
    color: colors.textPrimary,
    flex: 1,
    textAlign: rtlTextAlignStart,
  },
  note: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: rtlTextAlignStart,
    paddingHorizontal: spacing.sm,
  },
  actions: {
    flexDirection: rowDirectionStart,
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  approveBtn: {
    flexDirection: rowDirectionStart,
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.xs,
    backgroundColor: colors.primary,
    borderRadius: radius.full,
  },
  approveBtnText: {
    ...typography.caption,
    color: colors.textInverse,
    fontWeight: '700' as const,
  },
  rejectBtn: {
    flexDirection: rowDirectionStart,
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.xs,
    backgroundColor: colors.errorLight,
    borderRadius: radius.full,
  },
  rejectBtnText: { ...typography.caption, color: colors.error, fontWeight: '700' as const },
  btnDisabled: { opacity: 0.5 },
}));
