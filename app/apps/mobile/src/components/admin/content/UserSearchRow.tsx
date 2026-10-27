// app/apps/mobile/src/components/admin/content/UserSearchRow.tsx
// FR-ADMIN-019 — single row for the admin users search.
// V2-ADMIN-USERS-6 — inline "Ban" affordance routes the admin through the
// existing FR-ADMIN-004 BanUserModal without forcing them through the user
// profile screen first.
import { useState } from 'react';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { type AdminPermission, type AdminRole, hasPermission } from '@kc/domain';
import type { AdminUserSearchResult } from '@kc/domain';
import { makeUseStyles } from '@kc/ui';
import { useAdminRoles } from '../../../hooks/useAdminRoles';
import { BanUserModal } from '../../profile/BanUserModal';
import { useLocaleBundle, type LocaleBundle } from '../../../i18n/useLocaleBundle';

export interface UserSearchRowProps {
  readonly row: AdminUserSearchResult;
}

function statusTone(status: string): 'good' | 'warn' | 'bad' | 'muted' {
  if (status === 'active') return 'good';
  if (status === 'pending_verification') return 'warn';
  if (status === 'banned' || status === 'deleted') return 'bad';
  return 'muted';
}

// Banning is permanent in MVP (FR-ADMIN-004 AC3) — only offer it to users who
// aren't already banned / deleted; deleted accounts are immutable.
function canShowBanButton(status: string): boolean {
  return status !== 'banned' && status !== 'deleted';
}

export function UserSearchRow({ row }: UserSearchRowProps) {
  const styles = useStyles();
  const L = useLocaleBundle();
  const tone = statusTone(row.accountStatus);
  const { roles } = useAdminRoles();
  const can = (perm: AdminPermission) => hasPermission(roles as readonly AdminRole[], perm);
  const showBan = can('reports.permanent_ban') && canShowBanButton(row.accountStatus);
  const [banOpen, setBanOpen] = useState(false);

  return (
    <>
      <Pressable
        style={styles.root}
        onPress={() => {
          if (row.shareHandle) {
            router.push({ pathname: '/user/[handle]', params: { handle: row.shareHandle } });
          }
        }}
      >
        <View style={styles.main}>
          <Text style={styles.name} numberOfLines={1}>
            {row.displayName ?? L.admin.admins.row.unnamed}
          </Text>
          {row.shareHandle && <Text style={styles.handle} numberOfLines={1}>@{row.shareHandle}</Text>}
          {row.cityName && <Text style={styles.meta} numberOfLines={1}>{row.cityName}</Text>}
        </View>
        <View style={[styles.chip, styles[`chip_${tone}` as const]]}>
          <Text style={styles.chipText}>
            {L.admin.content.userStatus[row.accountStatus as keyof LocaleBundle['admin']['content']['userStatus']]
              ?? row.accountStatus}
          </Text>
        </View>
        {showBan && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={L.admin.content.userInline.ban}
            onPress={(e) => {
              e.stopPropagation();
              setBanOpen(true);
            }}
            style={styles.actionBtn}
          >
            <Text style={styles.actionText}>{L.admin.content.userInline.ban}</Text>
          </Pressable>
        )}
      </Pressable>
      {showBan && (
        <BanUserModal
          targetUserId={row.userId}
          visible={banOpen}
          onClose={() => setBanOpen(false)}
        />
      )}
    </>
  );
}

const useStyles = makeUseStyles(({ colors }) => ({
  root: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border,
  },
  main:        { flex: 1, gap: 2 },
  name:        { fontSize: 15, fontWeight: '600' },
  handle:      { fontSize: 12, color: colors.primary },
  meta:        { fontSize: 11, opacity: 0.55 },
  chip:        { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  chip_good:   { backgroundColor: colors.successLight },
  chip_warn:   { backgroundColor: colors.warningLight },
  chip_bad:    { backgroundColor: colors.errorLight },
  chip_muted:  { backgroundColor: colors.border },
  chipText:    { fontSize: 11, fontWeight: '700' },
  actionBtn:   {
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6,
    backgroundColor: colors.errorLight,
  },
  actionText:  { fontSize: 11, fontWeight: '700', color: colors.error },
}));
