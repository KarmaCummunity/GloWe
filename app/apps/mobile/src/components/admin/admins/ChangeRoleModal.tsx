// app/apps/mobile/src/components/admin/admins/ChangeRoleModal.tsx
// FR-ADMIN-030 — change one grant's role in place. The new role keeps the
// grant's org, direct manager and reports (atomic `admin_change_role`), so
// the person keeps their place in the hierarchy.
import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, View } from 'react-native';
import {
  changeTargetsFor, isAdminRoleError, type AdminGrant, type AuthorityGrant, type GrantableAdminRole,
} from '@kc/domain';
import { makeUseStyles, radius, spacing, Text, typography } from '@kc/ui';
import { useChangeAdminRole } from '../../../hooks/useAdminRoleMutations';
import { ChoiceChips } from './ChoiceChips';
import { roleScopeErrorText } from './roleErrors';
import { rowDirectionStart, textAlignStart } from '../../../lib/rtlLayout';
import { useLocaleBundle } from '../../../i18n/useLocaleBundle';

export interface ChangeRoleModalProps {
  /** The grant being changed; null hides the modal. */
  readonly grant: AdminGrant | null;
  /** Display name of the grant's org (or the platform). */
  readonly orgName: string;
  readonly viewer: readonly AuthorityGrant[];
  readonly onClose: () => void;
}

export function ChangeRoleModal({ grant, orgName, viewer, onClose }: ChangeRoleModalProps) {
  const styles = useStyles();
  const L = useLocaleBundle();
  const copy = L.admin.admins.team.changeModal;
  const change = useChangeAdminRole();
  const [role, setRole] = useState<GrantableAdminRole | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  // Fresh form for every grant the modal opens on.
  useEffect(() => {
    setRole(null);
    setErrorCode(null);
  }, [grant?.grantId]);

  const targets = useMemo(() => (grant ? changeTargetsFor(viewer, grant) : []), [viewer, grant]);
  const canSubmit = grant !== null && role !== null && !change.isPending;

  async function submit() {
    if (!grant || !role) return;
    setErrorCode(null);
    try {
      await change.mutateAsync({ grantId: grant.grantId, newRole: role });
      onClose();
    } catch (e) {
      setErrorCode(isAdminRoleError(e) ? e.code : 'unknown');
    }
  }

  return (
    <Modal visible={grant !== null} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.title}>{copy.title}</Text>
          {grant && <Text style={styles.current}>{copy.current(L.admin.roles[grant.role], orgName)}</Text>}
          <Text style={styles.hint}>{copy.hint}</Text>

          <Text style={styles.label}>{copy.roleLabel}</Text>
          {targets.length === 0 ? (
            <Text style={styles.hint}>{copy.noTargets}</Text>
          ) : (
            <ChoiceChips
              options={targets.map((r) => ({ key: r, label: L.admin.roles[r] }))}
              selected={role ?? undefined}
              onSelect={setRole}
            />
          )}

          {errorCode !== null && <Text style={styles.errorText}>{roleScopeErrorText(L, errorCode)}</Text>}

          <View style={styles.actions}>
            <Pressable accessibilityRole="button" style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>{copy.cancel}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
              disabled={!canSubmit}
              onPress={() => { void submit(); }}
            >
              <Text style={styles.submitBtnText}>{copy.submit}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const useStyles = makeUseStyles(({ colors }) => ({
  overlay:   { flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', padding: spacing.base },
  sheet: {
    backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.base, gap: spacing.sm,
    width: '100%', maxWidth: 520, alignSelf: 'center',
  },
  title:     { ...typography.h4, ...typography.bold, color: colors.textPrimary, textAlign: textAlignStart() },
  current:   { ...typography.body, ...typography.semiBold, color: colors.textPrimary, textAlign: textAlignStart() },
  hint:      { ...typography.bodySmall, color: colors.textSecondary, textAlign: textAlignStart() },
  label: {
    ...typography.caption, color: colors.textSecondary, marginTop: spacing.sm, textAlign: textAlignStart(),
  },
  errorText: { ...typography.bodySmall, color: colors.error, textAlign: textAlignStart() },
  actions:   { flexDirection: rowDirectionStart, justifyContent: 'flex-end', gap: spacing.sm, marginTop: spacing.sm },
  cancelBtn: { paddingHorizontal: spacing.md, paddingVertical: spacing.md, borderRadius: radius.sm },
  cancelBtnText: { ...typography.body, ...typography.medium, color: colors.textPrimary },
  submitBtn: {
    paddingHorizontal: spacing.base, paddingVertical: spacing.md, borderRadius: radius.sm,
    backgroundColor: colors.primary,
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { ...typography.body, ...typography.bold, color: colors.textInverse },
}));
