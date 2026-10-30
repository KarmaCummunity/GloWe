import React from 'react';
import {
  Modal,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { makeUseStyles, spacing, radius, typography, shadow, Text } from '@kc/ui';

export interface GuestJoinModalProps {
  visible: boolean;
  message: string;
  joinLabel: string;
  onJoin: () => void;
  onDismiss: () => void;
}

/** FR-AUTH-014: sign-up overlay shown when a guest attempts a blocked interaction. */
export function GuestJoinModal({
  visible,
  message,
  joinLabel,
  onJoin,
  onDismiss,
}: Readonly<GuestJoinModalProps>) {
  const { t } = useTranslation();
  const styles = useGuestJoinModalStyles();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <Pressable
        style={styles.backdrop}
        onPress={onDismiss}
        accessibilityLabel={t('general.close')}
      >
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.message}>{message}</Text>
          <TouchableOpacity
            style={styles.joinBtn}
            onPress={onJoin}
            activeOpacity={0.9}
            accessibilityRole="button"
            accessibilityLabel={joinLabel}
          >
            <Text style={styles.joinBtnText}>{joinLabel}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.dismissBtn}
            onPress={onDismiss}
            accessibilityRole="button"
            accessibilityLabel={t('general.close')}
          >
            <Text style={styles.dismissText}>{t('general.close')}</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const useGuestJoinModalStyles = makeUseStyles(({ colors }) => ({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing['2xl'],
    ...shadow.card,
  },
  message: {
    ...typography.bodyLarge,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  joinBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  joinBtnText: {
    ...typography.button,
    color: colors.textInverse,
  },
  dismissBtn: {
    marginTop: spacing.md,
    alignItems: 'center',
    padding: spacing.sm,
  },
  dismissText: {
    ...typography.body,
    color: colors.textSecondary,
  },
}));
