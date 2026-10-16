// FR-POST-014 AC4 + FR-POST-015 AC1 + FR-ADMIN-006 + FR-ADMIN-009.
// Bottom-sheet menu opened from PostMenuButton on PostDetail.
import { useState, type ComponentProps } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { container } from '../../lib/container';
import { Modal, Text, Pressable, ScrollView, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import type { PostWithOwner } from '@kc/application';
import { makeUseStyles, radius, spacing, typography, useTheme } from '@kc/ui';
import { rtlTextAlignStart } from '../../lib/rtlTextAlignStart';
import { webTextRtl, webViewRtl } from '../../lib/webRtlStyle';
import { ConfirmActionModal } from './ConfirmActionModal';
import { ReportPostModal } from './ReportPostModal';
import { usePostMenuActions } from '../../hooks/usePostMenuActions';
import { usePostShare } from '../../hooks/usePostShare';
import { shouldShowPostExposureControls } from '../../hooks/usePostActorPrivacyModel';
import { PostMenuExposureBlock } from './PostMenuExposureBlock';
import { runAfterBottomSheetDismiss } from '../../lib/runAfterBottomSheetDismiss';

interface Props {
  visible: boolean;
  onClose: () => void;
  post: PostWithOwner;
  /** When false, share row is omitted (e.g. post detail has a header share button). */
  showShareInMenu?: boolean;
  viewerId: string | null;
  isSuperAdmin: boolean;
  isSaved: boolean;
  saveBusy: boolean;
  onToggleSave: () => void;
  onAfterRemoval: () => void;
  onEdit: () => void;
}

type ActiveModal = null | 'delete-owner' | 'admin-remove' | 'report';
type IoniconName = ComponentProps<typeof Ionicons>['name'];

export function PostMenuSheet({
  visible,
  onClose,
  post,
  showShareInMenu = true,
  viewerId,
  isSuperAdmin,
  isSaved,
  saveBusy,
  onToggleSave,
  onAfterRemoval,
  onEdit,
}: Props) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { colors } = useTheme();
  const styles = usePostMenuSheetStyles();
  const [active, setActive] = useState<ActiveModal>(null);
  const { busy, error, clearError, handleOwnerDelete, handleAdminRemove } =
    usePostMenuActions({ post, onAfterRemoval, onSettle: () => setActive(null) });
  const { canShare, share, busy: shareBusy } = usePostShare(post);

  const isOwner = viewerId !== null && post.ownerId === viewerId;
  const canEditPost = (isOwner || isSuperAdmin) && post.status === 'open';
  const showExposureBlock = viewerId !== null && shouldShowPostExposureControls(viewerId, post);

  function openModal(name: Exclude<ActiveModal, null>) {
    clearError();
    onClose();
    setActive(name);
  }

  function closeModal() {
    if (busy) return;
    setActive(null);
    clearError();
  }

  return (
    <>
      <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
        <Pressable style={styles.backdrop} onPress={onClose}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.handle} accessibilityElementsHidden importantForAccessibility="no" />
            <ScrollView keyboardShouldPersistTaps="handled" bounces={false}>
              <View style={[styles.actionsGroup, showExposureBlock && styles.actionsGroupBordered]}>
                {showShareInMenu && canShare ? (
                  <MenuItem
                    icon="share-outline"
                    label={t('post.menuShare')}
                    disabled={shareBusy}
                    onPress={() => {
                      if (shareBusy) return;
                      onClose();
                      runAfterBottomSheetDismiss(() => share());
                    }}
                  />
                ) : null}
                {!isOwner ? (
                  <MenuItem
                    icon="eye-off-outline"
                    label={t('post.menuHideFromFeed')}
                    onPress={() => {
                      onClose();
                      void container.socialFeed.hidePost(post.postId).then(() => {
                        void queryClient.invalidateQueries({ queryKey: ['feed'] });
                      });
                    }}
                  />
                ) : null}
                {isOwner ? null : (
                  <MenuItem
                    icon="flag-outline"
                    iconColor={colors.error}
                    label={t('post.report')}
                    labelColor={colors.error}
                    onPress={() => openModal('report')}
                  />
                )}
                <MenuItem
                  icon={isSaved ? 'bookmark' : 'bookmark-outline'}
                  label={isSaved ? t('post.menuUnsave') : t('post.menuSave')}
                  disabled={saveBusy}
                  onPress={() => {
                    if (saveBusy) return;
                    onToggleSave();
                    onClose();
                  }}
                />
                {canEditPost ? (
                  <MenuItem
                    icon="create-outline"
                    label={t('post.menuEdit')}
                    onPress={() => {
                      onClose();
                      onEdit();
                    }}
                  />
                ) : null}
                {isOwner ? (
                  <MenuItem
                    icon="trash-outline"
                    iconColor={colors.error}
                    label={t('post.menuDelete')}
                    labelColor={colors.error}
                    onPress={() => openModal('delete-owner')}
                  />
                ) : null}
                {isSuperAdmin ? (
                  <MenuItem
                    icon="shield-outline"
                    iconColor={colors.error}
                    label={t('post.menuAdminRemove')}
                    labelColor={colors.error}
                    onPress={() => openModal('admin-remove')}
                  />
                ) : null}
              </View>

              {showExposureBlock && viewerId ? (
                <PostMenuExposureBlock post={post} viewerId={viewerId} />
              ) : null}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      <ConfirmActionModal
        visible={active === 'delete-owner'}
        title={t('post.deleteConfirmTitle')}
        message={t('post.deleteConfirmBody')}
        confirmLabel={t('post.delete')}
        destructive
        isBusy={busy}
        errorMessage={error}
        onCancel={closeModal}
        onConfirm={handleOwnerDelete}
      />

      <ConfirmActionModal
        visible={active === 'admin-remove'}
        title={t('post.adminRemoveTitle')}
        message={t('post.adminRemoveBody', { title: post.title })}
        confirmLabel={t('post.adminRemoveCta')}
        destructive
        isBusy={busy}
        errorMessage={error}
        onCancel={closeModal}
        onConfirm={handleAdminRemove}
      />

      <ReportPostModal postId={post.postId} visible={active === 'report'} onClose={closeModal} />
    </>
  );
}

interface MenuItemProps {
  icon?: IoniconName;
  label: string;
  iconColor?: string;
  labelColor?: string;
  destructive?: boolean;
  disabled?: boolean;
  onPress: () => void;
}

function MenuItem({
  icon,
  label,
  iconColor,
  labelColor,
  destructive,
  disabled,
  onPress,
}: MenuItemProps) {
  const { colors } = useTheme();
  const styles = usePostMenuSheetStyles();
  const resolvedIconColor = iconColor ?? colors.textPrimary;
  let resolvedLabelColor = colors.textPrimary;
  if (labelColor) resolvedLabelColor = labelColor;
  else if (destructive) resolvedLabelColor = colors.error;

  return (
    <Pressable
      style={[styles.item, disabled && styles.itemDisabled]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled) }}
    >
      <Text style={[styles.itemLabel, { color: resolvedLabelColor }]}>{label}</Text>
      {icon ? <Ionicons name={icon} size={22} color={resolvedIconColor} /> : null}
    </Pressable>
  );
}

const usePostMenuSheetStyles = makeUseStyles(({ colors }) => ({
  backdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surface,
    paddingBottom: spacing.sm,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    maxHeight: '92%',
    ...webViewRtl,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  actionsGroup: {
    paddingTop: spacing.xs,
  },
  actionsGroupBordered: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    gap: spacing.sm,
    minHeight: 48,
  },
  itemDisabled: { opacity: 0.5 },
  itemLabel: {
    ...typography.body,
    textAlign: rtlTextAlignStart,
    flex: 1,
    ...webTextRtl,
  },
}));
