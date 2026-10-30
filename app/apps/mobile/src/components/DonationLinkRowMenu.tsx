// Web row menu for donation links — RN-Web Alert.alert drops multi-button arrays (see ChatActionMenu).
import React from 'react';
import { Modal, View, Pressable, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { DonationLink } from '@kc/domain';
import { makeUseStyles, typography, spacing, radius, Text } from '@kc/ui';
import {
  confirmRemoveDonationLink,
  openDonationLinkUrl,
  reportDonationLink,
} from './donationLinkRowHandlers';

interface Props {
  readonly visible: boolean;
  readonly link: DonationLink | null;
  readonly me: string | null;
  readonly isSuperAdmin: boolean;
  readonly onClose: () => void;
  readonly onRemoved: (id: string) => void;
  readonly onEdit: (link: DonationLink) => void;
}

const useStyles = makeUseStyles(({ colors, isDark }) => ({
  backdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' as const },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingVertical: spacing.xs,
    borderWidth: isDark ? 1 : 0,
    borderBottomWidth: 0,
    borderColor: isDark ? colors.border : 'transparent',
  },
  item: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
    alignItems: 'center' as const,
  },
  itemText: { ...typography.body, color: colors.textPrimary },
  itemDestructive: { color: colors.error },
  itemCancel: { ...typography.semiBold, color: colors.textSecondary },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
}));

export function DonationLinkRowMenu({
  visible,
  link,
  me,
  isSuperAdmin,
  onClose,
  onRemoved,
  onEdit,
}: Props) {
  const { t } = useTranslation();
  const styles = useStyles();
  if (!link) return null;

  const isOwner = link.submittedBy === me;
  const showEdit = isOwner || isSuperAdmin;
  const showRemove = isOwner || isSuperAdmin;

  const closeThen = (fn: () => void) => {
    onClose();
    fn();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <TouchableOpacity
            style={styles.item}
            onPress={() => closeThen(() => openDonationLinkUrl(link))}
            accessibilityRole="button"
          >
            <Text style={styles.itemText}>{t('donations.links.rowMenu.open')}</Text>
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity
            style={styles.item}
            onPress={() => closeThen(() => void reportDonationLink(me, link, t))}
            accessibilityRole="button"
          >
            <Text style={styles.itemText}>{t('donations.links.rowMenu.report')}</Text>
          </TouchableOpacity>
          {showEdit ? (
            <>
              <View style={styles.divider} />
              <TouchableOpacity
                style={styles.item}
                onPress={() => closeThen(() => onEdit(link))}
                accessibilityRole="button"
              >
                <Text style={styles.itemText}>{t('donations.links.rowMenu.edit')}</Text>
              </TouchableOpacity>
            </>
          ) : null}
          {showRemove ? (
            <>
              <View style={styles.divider} />
              <TouchableOpacity
                style={styles.item}
                onPress={() =>
                  closeThen(() => confirmRemoveDonationLink(link, onRemoved, t))
                }
                accessibilityRole="button"
              >
                <Text style={[styles.itemText, styles.itemDestructive]}>
                  {t('donations.links.rowMenu.remove')}
                </Text>
              </TouchableOpacity>
            </>
          ) : null}
          <View style={styles.divider} />
          <TouchableOpacity style={styles.item} onPress={onClose} accessibilityRole="button">
            <Text style={[styles.itemText, styles.itemCancel]}>
              {t('donations.addLinkModal.cancel')}
            </Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
