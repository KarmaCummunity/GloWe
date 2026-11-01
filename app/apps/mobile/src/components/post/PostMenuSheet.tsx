// FR-POST-014 AC4 + FR-POST-015 AC1 + FR-ADMIN-006 + FR-ADMIN-009.
// Bottom-sheet menu opened from PostMenuButton on PostDetail.
// The frame, dismissal and motion come from the kit `BottomSheet` (spec 17 §4.1).
import { useState, type ComponentProps } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { container } from '../../lib/container';
import { Pressable, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import type { PostWithOwner } from '@kc/application';
import { iconSize, makeUseStyles, spacing, typography, useTheme, Text } from '@kc/ui';
import { rtlTextAlignStart } from '../../lib/rtlTextAlignStart';
import { webTextRtl } from '../../lib/webRtlStyle';
import { BottomSheet } from '../ui/BottomSheet';
import { ConfirmActionModal } from './ConfirmActionModal';
import { ReportPostModal } from './ReportPostModal';
import { usePostMenuActions } from '../../hooks/usePostMenuActions';
import { usePostShare } from '../../hooks/usePostShare';
import { shouldShowPostExposureControls } from '../../hooks/usePostActorPrivacyModel';
import { PostMenuExposureBlock } from './PostMenuExposureBlock';
import { runAfterBottomSheetDismiss } from '../../lib/runAfterBottomSheetDismiss';
import { hapticLightTap } from '../../lib/haptics';
import { useFeedSessionStore } from '../../store/feedSessionStore';

interface Props {
  readonly visible: boolean;
  readonly onClose: () => void;
  readonly post: PostWithOwner;
  /** When false, share row is omitted (e.g. post detail has a header share button). */
  readonly showShareInMenu?: boolean;
  readonly viewerId: string | null;
  readonly isSuperAdmin: boolean;
  readonly isSaved: boolean;
  readonly saveBusy: boolean;
  readonly onToggleSave: () => void;
  readonly onAfterRemoval: () => void;
  readonly onEdit: () => void;
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
  const showToast = useFeedSessionStore((st) => st.showEphemeralToast);
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
      <BottomSheet visible={visible} onDismiss={onClose}>
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
          {!isOwner && viewerId ? (
            <MenuItem
              icon="volume-mute-outline"
              label={t('feedSettings.menuMuteUser')}
              onPress={() => {
                onClose();
                hapticLightTap();
                void container.socialFeed.addMuteFilter('user', post.ownerId).then(() => {
                  showToast(t('feedSettings.mutedUserToast'), 'success', 2200);
                  for (const key of ['feed', 'feed-mute-filters']) void queryClient.invalidateQueries({ queryKey: [key] });
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
      </BottomSheet>

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
  readonly icon?: IoniconName;
  readonly label: string;
  readonly iconColor?: string;
  readonly labelColor?: string;
  readonly destructive?: boolean;
  readonly disabled?: boolean;
  readonly onPress: () => void;
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
      {icon ? <Ionicons name={icon} size={iconSize.xl} color={resolvedIconColor} /> : null}
    </Pressable>
  );
}

const usePostMenuSheetStyles = makeUseStyles(({ colors }) => ({
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
    // No side padding: the sheet surface already holds the gutter.
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
