// app/apps/mobile/src/components/admin/admins/GrantManagerSection.tsx
// FR-ADMIN-025 — direct-manager + subordinates for a single grant, with an
// assign/change/clear affordance gated by `admins.set_manager`. The read-only
// display lives in ManagerSummary; this owns the mutation + picker.
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { isOrgHierarchyError, type OrgTreeMember } from '@kc/domain';
import { makeUseStyles, radius, Text } from '@kc/ui';
import { RoleBadge } from './RoleBadge';
import { ManagerSummary } from './ManagerSummary';
import { ManagerPickerModal } from './ManagerPickerModal';
import { useSetManager } from '../../../hooks/useSetManager';
import { rowDirectionStart } from '../../../lib/rtlLayout';
import { useLocaleBundle } from '../../../i18n/useLocaleBundle';

export interface GrantManagerSectionProps {
  readonly member: OrgTreeMember;
  readonly members: readonly OrgTreeMember[];
  readonly canManage: boolean;
}

function sameScope(a: OrgTreeMember, b: OrgTreeMember): boolean {
  return a.orgId === b.orgId || a.isPlatform;
}

export function GrantManagerSection({ member, members, canManage }: GrantManagerSectionProps) {
  const styles = useStyles();
  const L = useLocaleBundle();
  const setManager = useSetManager();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const manager = useMemo(
    () => members.find((m) => m.grantId === member.managerGrantId) ?? null,
    [members, member.managerGrantId],
  );
  const subordinates = useMemo(
    () => members.filter((m) => m.managerGrantId === member.grantId),
    [members, member.grantId],
  );
  const candidates = useMemo(
    () => members.filter((m) => m.grantId !== member.grantId && sameScope(m, member)),
    [members, member],
  );

  async function pick(managerGrantId: string | null): Promise<void> {
    setErr(null);
    try {
      await setManager.mutateAsync({ grantId: member.grantId, managerGrantId });
      setPickerOpen(false);
    } catch (e) {
      setErr(isOrgHierarchyError(e) ? e.code : 'unknown');
    }
  }

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <RoleBadge role={member.role} />
        {member.orgName !== null && <Text style={styles.org}>{member.orgName}</Text>}
      </View>

      <ManagerSummary
        managerName={manager?.displayName ?? null}
        subordinates={subordinates}
        errCode={err}
      />

      {canManage && (
        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            disabled={setManager.isPending}
            onPress={() => { setErr(null); setPickerOpen(true); }}
            style={styles.assignBtn}
          >
            <Text style={styles.assignText}>
              {manager ? L.admin.admins.detail.changeManager : L.admin.admins.detail.assignManager}
            </Text>
          </Pressable>
          {manager && (
            <Pressable
              accessibilityRole="button"
              disabled={setManager.isPending}
              onPress={() => { void pick(null); }}
              style={styles.clearBtn}
            >
              <Text style={styles.clearText}>{L.admin.admins.detail.clearManager}</Text>
            </Pressable>
          )}
        </View>
      )}

      <ManagerPickerModal
        visible={pickerOpen}
        candidates={candidates}
        busy={setManager.isPending}
        onPick={(id) => { void pick(id); }}
        onClose={() => setPickerOpen(false)}
      />
    </View>
  );
}

const useStyles = makeUseStyles(({ colors }) => ({
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 14, gap: 4, marginTop: 8 },
  head: { flexDirection: rowDirectionStart, alignItems: 'center', gap: 8, marginBottom: 4 },
  org:  { fontSize: 12, color: colors.textSecondary },
  actions: { flexDirection: rowDirectionStart, gap: 8, marginTop: 10 },
  assignBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: colors.primary },
  assignText: { color: colors.textInverse, fontWeight: '700', fontSize: 13 },
  clearBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: colors.surfaceCream },
  clearText: { color: colors.textSecondary, fontWeight: '700', fontSize: 13 },
}));
