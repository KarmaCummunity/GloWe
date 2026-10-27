// app/apps/mobile/app/(admin)/admins/index.tsx
// FR-ADMIN-015 / FR-ADMIN-016 / FR-ADMIN-022 / FR-ADMIN-025 — Admin RBAC screen.
//
// Thin orchestrator: a list/tree view toggle + the grant affordance. The two
// view bodies (cards list, hierarchy tree) own their own data and live in
// AdminsListView / AdminsTreeView.
//
// Visibility per PERMISSION_MATRIX['admins.view']:
//   - super_admin: full list + grant + revoke (revoke on detail screen).
//   - moderator:   read-only list.
//   - support:     no access (denial card; AdminGate may also block earlier).
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { type AdminPermission, type AdminRole, hasPermission } from '@kc/domain';
import { makeUseStyles, useBreakpoint } from '@kc/ui';
import { useAdminRoles } from '../../../src/hooks/useAdminRoles';
import { rowDirectionStart } from '../../../src/lib/rtlLayout';
import { AdminScreenHeader } from '../../../src/components/admin/AdminScreenHeader';
import { GrantRoleModal } from '../../../src/components/admin/admins/GrantRoleModal';
import { AdminsListView } from '../../../src/components/admin/admins/AdminsListView';
import { AdminsTreeView } from '../../../src/components/admin/admins/AdminsTreeView';
import { useLocaleBundle } from '../../../src/i18n/useLocaleBundle';

type ViewMode = 'list' | 'tree';
const VIEW_MODES: readonly ViewMode[] = ['list', 'tree'];

export default function AdminsScreen() {
  const styles = useStyles();
  const L = useLocaleBundle();
  const router = useRouter();
  const isWide = useBreakpoint() !== 'mobile';
  const { roles, isLoading: rolesLoading } = useAdminRoles();
  const [grantOpen, setGrantOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  const can = (perm: AdminPermission) => hasPermission(roles as readonly AdminRole[], perm);

  if (rolesLoading) {
    return <View style={styles.center}><Text>{L.admin.admins.loading}</Text></View>;
  }
  if (!can('admins.view')) {
    return (
      <View style={styles.center}>
        <Text style={styles.deniedTitle}>{L.admin.admins.forbiddenTitle}</Text>
        <Text style={styles.deniedHint}>{L.admin.admins.forbiddenHint}</Text>
      </View>
    );
  }

  const canGrant = can('admins.grant_role');
  const openDetail = (userId: string) =>
    router.push({ pathname: '/(admin)/admins/[userId]' as never, params: { userId } } as never);

  return (
    <View style={styles.root}>
      <AdminScreenHeader title={L.admin.admins.title} />
      <View style={styles.headerControls}>
        <View style={styles.segment}>
          {VIEW_MODES.map((m) => (
            <Pressable
              key={m}
              accessibilityRole="button"
              onPress={() => setViewMode(m)}
              style={[styles.segmentBtn, viewMode === m && styles.segmentBtnActive]}
            >
              <Text style={[styles.segmentText, viewMode === m && styles.segmentTextActive]}>
                {m === 'list' ? L.admin.admins.viewList : L.admin.admins.viewTree}
              </Text>
            </Pressable>
          ))}
        </View>
        {canGrant && (
          <Pressable accessibilityRole="button" onPress={() => setGrantOpen(true)} style={styles.grantBtn}>
            <Text style={styles.grantBtnText}>{L.admin.admins.grantBtn}</Text>
          </Pressable>
        )}
      </View>

      {viewMode === 'list' ? (
        <AdminsListView isWide={isWide} onSelect={openDetail} />
      ) : (
        <AdminsTreeView isWide={isWide} isSuper={roles.includes('super_admin')} onSelect={openDetail} />
      )}

      {canGrant && <GrantRoleModal visible={grantOpen} onClose={() => setGrantOpen(false)} />}
    </View>
  );
}

const useStyles = makeUseStyles(({ colors }) => ({
  root:        { flex: 1, backgroundColor: colors.background },
  center:      { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 8 },
  deniedTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  deniedHint:  { fontSize: 13, opacity: 0.6, textAlign: 'center', color: colors.textSecondary },
  headerControls: {
    flexDirection: rowDirectionStart, alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, gap: 12,
  },
  segment:     { flexDirection: rowDirectionStart, backgroundColor: colors.surface, borderRadius: 999, padding: 3 },
  segmentBtn:  { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999 },
  segmentBtnActive: { backgroundColor: colors.primary },
  segmentText: { fontSize: 13, fontWeight: '700', color: colors.textSecondary },
  segmentTextActive: { color: colors.textInverse },
  grantBtn:    { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: colors.primary },
  grantBtnText: { color: colors.textInverse, fontWeight: '700', fontSize: 13 },
}));
