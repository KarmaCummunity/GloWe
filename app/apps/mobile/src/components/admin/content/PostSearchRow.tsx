// app/apps/mobile/src/components/admin/content/PostSearchRow.tsx
// FR-ADMIN-019 — single row for the admin posts search.
// V2-ADMIN-POSTS-6 — inline "Remove" / "Restore" affordance so admins can act
// straight from the search results instead of opening every post detail.
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { type AdminPermission, type AdminRole, hasPermission } from '@kc/domain';
import type { AdminPostSearchResult } from '@kc/domain';
import { makeUseStyles } from '@kc/ui';
import { useAdminRoles } from '../../../hooks/useAdminRoles';
import { container } from '../../../lib/container';
import { confirmAction as platformConfirm } from '../../../services/platformConfirm';
import { useLocaleBundle, type LocaleBundle } from '../../../i18n/useLocaleBundle';

export interface PostSearchRowProps {
  readonly row: AdminPostSearchResult;
}

function statusTone(status: string): 'good' | 'warn' | 'bad' | 'muted' {
  if (status === 'open') return 'good';
  if (status === 'closed_delivered') return 'muted';
  if (status === 'removed_admin' || status === 'expired') return 'bad';
  return 'warn';
}

function confirmAction(message: string, L: LocaleBundle): Promise<boolean> {
  return platformConfirm(L.admin.tasks.detail.confirmTitle, message, {
    confirmLabel: L.admin.tasks.detail.confirmOk,
    cancelLabel:  L.admin.tasks.detail.cancel,
  });
}

export function PostSearchRow({ row }: PostSearchRowProps) {
  const styles = useStyles();
  const L = useLocaleBundle();
  const tone = statusTone(row.status);
  const { roles } = useAdminRoles();
  const queryClient = useQueryClient();
  const can = (perm: AdminPermission) => hasPermission(roles as readonly AdminRole[], perm);
  const [busy, setBusy] = useState(false);

  const canRemove  = can('reports.confirm_or_dismiss') && row.status === 'open';
  const canRestore = can('reports.restore_target')    && row.status === 'removed_admin';

  async function doRemove() {
    const ok = await confirmAction(L.admin.content.postInline.confirmRemove, L);
    if (!ok) return;
    setBusy(true);
    try {
      await container.adminRemovePost.execute({ postId: row.postId });
      void queryClient.invalidateQueries({ queryKey: ['admin.search.posts'] });
    } finally {
      setBusy(false);
    }
  }

  async function doRestore() {
    const ok = await confirmAction(L.admin.content.postInline.confirmRestore, L);
    if (!ok) return;
    setBusy(true);
    try {
      await container.restoreTarget.execute({ targetType: 'post', targetId: row.postId });
      void queryClient.invalidateQueries({ queryKey: ['admin.search.posts'] });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Pressable
      style={styles.root}
      onPress={() => router.push({ pathname: '/post/[id]', params: { id: row.postId } })}
    >
      <View style={styles.main}>
        <Text style={styles.title} numberOfLines={2}>
          {row.title ?? L.admin.content.untitled}
        </Text>
        <View style={styles.metaRow}>
          {row.ownerDisplayName && (
            <Text style={styles.meta} numberOfLines={1}>
              {L.admin.content.byOwner(row.ownerDisplayName)}
            </Text>
          )}
          <View style={[styles.chip, styles[`chip_${tone}` as const]]}>
            <Text style={styles.chipText}>
              {L.admin.content.postStatus[row.status as keyof LocaleBundle['admin']['content']['postStatus']]
                ?? row.status}
            </Text>
          </View>
        </View>
      </View>
      {canRemove && (
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={(e) => { e.stopPropagation(); void doRemove(); }}
          style={[styles.actionBtnRemove, busy && styles.actionBtnDisabled]}
        >
          <Text style={styles.actionTextRemove}>{L.admin.content.postInline.remove}</Text>
        </Pressable>
      )}
      {canRestore && (
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={(e) => { e.stopPropagation(); void doRestore(); }}
          style={[styles.actionBtnRestore, busy && styles.actionBtnDisabled]}
        >
          <Text style={styles.actionTextRestore}>{L.admin.content.postInline.restore}</Text>
        </Pressable>
      )}
    </Pressable>
  );
}

const useStyles = makeUseStyles(({ colors }) => ({
  root: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 12, paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border,
  },
  main:       { flex: 1, gap: 4 },
  title:      { fontSize: 14, fontWeight: '600' },
  metaRow:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  meta:       { fontSize: 11, opacity: 0.6, flex: 1 },
  chip:       { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  chip_good:  { backgroundColor: colors.successLight },
  chip_warn:  { backgroundColor: colors.warningLight },
  chip_bad:   { backgroundColor: colors.errorLight },
  chip_muted: { backgroundColor: colors.border },
  chipText:   { fontSize: 11, fontWeight: '700' },
  actionBtnRemove:  { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, backgroundColor: colors.errorLight },
  actionTextRemove: { fontSize: 11, fontWeight: '700', color: colors.error },
  actionBtnRestore:  { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, backgroundColor: colors.successLight },
  actionTextRestore: { fontSize: 11, fontWeight: '700', color: colors.success },
  actionBtnDisabled: { opacity: 0.5 },
}));
