// FR-MOD-007 + FR-ADMIN-004 — overflow ⋮ menu in the user profile header.
// Owns the trigger, action sheet, and the report/ban modals so the
// /user/[handle] screen stays under the 200-line cap.
//
// TD-127 + TD-138: the previous version used `Alert.alert('', '', buttons)`
// which RN-Web collapses to `window.alert`, dropping the buttons array — so
// the menu was unreachable in the browser. Switched to an inline bottom-
// sheet (same pattern as `ChatActionMenu`) so the menu items render
// identically across iOS, Android, and Web.
import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { makeUseStyles, radius, spacing, typography, useTheme, Text } from '@kc/ui';
import { hasPermission, type AdminRole } from '@kc/domain';
import { useAdminRoles } from '../../hooks/useAdminRoles';
import { useTranslation } from 'react-i18next';
import { ReportUserModal } from './ReportUserModal';
import { BanUserModal } from './BanUserModal';
import { useUserBlock } from '../../hooks/useUserBlock';

interface Props {
  targetUserId: string;
}

type OpenModal = 'report' | 'ban' | null;

export function ProfileOverflowMenu({ targetUserId }: Props) {
  const styles = useStyles();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { roles } = useAdminRoles();
  const canBan = hasPermission(roles as readonly AdminRole[], 'reports.permanent_ban');
  const block = useUserBlock(targetUserId);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [openModal, setOpenModal] = useState<OpenModal>(null);

  const close = () => setSheetOpen(false);
  const pick = (m: OpenModal) => {
    setSheetOpen(false);
    setOpenModal(m);
  };

  return (
    <>
      <Pressable
        onPress={() => setSheetOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={t('moderation.report.user.title')}
        hitSlop={8}
        style={styles.trigger}
      >
        <Ionicons name="ellipsis-vertical" size={22} color={colors.textPrimary} />
      </Pressable>

      <Modal visible={sheetOpen} transparent animationType="fade" onRequestClose={close}>
        <Pressable style={styles.backdrop} onPress={close}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <TouchableOpacity
              style={styles.item}
              onPress={() => pick('report')}
              accessibilityRole="button"
            >
              <Text style={styles.itemText}>{t('moderation.report.user.title')}</Text>
            </TouchableOpacity>
            {block.canBlock ? (
              <>
                <View style={styles.divider} />
                <TouchableOpacity
                  style={styles.item}
                  onPress={() => {
                    close();
                    void block.toggle();
                  }}
                  disabled={block.busy}
                  accessibilityRole="button"
                  testID="profile-block-toggle"
                >
                  <Text style={[styles.itemText, block.isBlocked ? null : styles.itemDestructive]}>
                    {t(block.isBlocked ? 'moderation.block.unblock' : 'moderation.block.block')}
                  </Text>
                </TouchableOpacity>
              </>
            ) : null}
            {canBan ? (
              <>
                <View style={styles.divider} />
                <TouchableOpacity
                  style={styles.item}
                  onPress={() => pick('ban')}
                  accessibilityRole="button"
                >
                  <Text style={[styles.itemText, styles.itemDestructive]}>{t('moderation.actions.ban')}</Text>
                </TouchableOpacity>
              </>
            ) : null}
            <View style={styles.divider} />
            <TouchableOpacity style={styles.item} onPress={close} accessibilityRole="button">
              <Text style={[styles.itemText, styles.itemCancel]}>{t('moderation.actions.cancel')}</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <ReportUserModal
        targetUserId={targetUserId}
        visible={openModal === 'report'}
        onClose={() => setOpenModal(null)}
      />
      {canBan ? (
        <BanUserModal
          targetUserId={targetUserId}
          visible={openModal === 'ban'}
          onClose={() => setOpenModal(null)}
        />
      ) : null}
    </>
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
  itemDestructive: { color: colors.error },
  itemCancel: { ...typography.semiBold, color: colors.textSecondary },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
}));
