// My Profile — ⋮ overflow anchored to the profile card top-start corner (RTL: visual top-right).
// Routes mirror profile-related rows on `app/settings.tsx` (account, notifications, stats)
// plus admin-removed posts (FR-POST-008 owner list).
// Bottom-sheet pattern matches ProfileOverflowMenu (RN-Web safe).
import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { makeUseStyles, radius, spacing, typography, useTheme } from '@kc/ui';

export function MyProfileOverflowMenu({ showFollowRequests }: Readonly<{ showFollowRequests: boolean }>) {
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  const go = (path: string) => {
    close();
    router.push(path as never);
  };

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={t('profile.myProfileMenuA11y')}
        hitSlop={8}
        style={styles.trigger}
      >
        <Ionicons name="ellipsis-vertical" size={22} color={colors.textPrimary} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={close}>
        <Pressable style={styles.backdrop} onPress={close}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <SheetItem label={t('settings.accountDetails')} onPress={() => go('/edit-profile')} />
            <View style={styles.divider} />
            <SheetItem label={t('settings.notifications')} onPress={() => go('/settings/notifications')} />
            {showFollowRequests ? (
              <>
                <View style={styles.divider} />
                <SheetItem label={t('settings.followRequests')} onPress={() => go('/settings/follow-requests')} />
              </>
            ) : null}
            <View style={styles.divider} />
            <SheetItem label={t('settings.stats')} onPress={() => go('/stats')} />
            <View style={styles.divider} />
            <SheetItem label={t('profile.myProfileMenuSavedPosts')} onPress={() => go('/(tabs)/profile/saved')} />
            <View style={styles.divider} />
            <SheetItem label={t('profile.myProfileMenuHiddenPosts')} onPress={() => go('/(tabs)/profile/hidden')} />
            <View style={styles.divider} />
            <SheetItem label={t('profile.myProfileMenuRemovedPosts')} onPress={() => go('/(tabs)/profile/removed')} />
            <View style={styles.divider} />
            <TouchableOpacity style={styles.item} onPress={close} accessibilityRole="button">
              <Text style={[styles.itemText, styles.itemCancel]}>{t('general.cancel')}</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

function SheetItem({ label, onPress }: Readonly<{ label: string; onPress: () => void }>) {
  const styles = useStyles();
  return (
    <TouchableOpacity style={styles.item} onPress={onPress} accessibilityRole="button">
      <Text style={styles.itemText}>{label}</Text>
    </TouchableOpacity>
  );
}

const useStyles = makeUseStyles(({ colors, isDark }) => ({
  trigger: { paddingHorizontal: 8, paddingVertical: 4 },
  backdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingVertical: spacing.xs,
  },
  item: { paddingVertical: spacing.md, paddingHorizontal: spacing.base, alignItems: 'center' },
  itemText: { ...typography.body, color: colors.textPrimary },
  itemCancel: { ...typography.semiBold, color: colors.textSecondary },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
}));
