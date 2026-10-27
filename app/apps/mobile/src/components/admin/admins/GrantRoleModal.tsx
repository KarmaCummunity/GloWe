// app/apps/mobile/src/components/admin/admins/GrantRoleModal.tsx
// FR-ADMIN-016 — modal for granting moderator/support to an active user.
// Lookup queries `users` directly (RLS allows admin SELECT on active rows).
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal, Pressable, StyleSheet, Text, TextInput, View,
} from 'react-native';
import type { GrantableAdminRole } from '@kc/domain';
import { GRANTABLE_ADMIN_ROLES, isAdminRoleError } from '@kc/domain';
import { makeUseStyles } from '@kc/ui';
import { supabase } from '../../../lib/container';
import { useGrantAdminRole } from '../../../hooks/useAdminRoleMutations';
import { useLocaleBundle, type LocaleBundle } from '../../../i18n/useLocaleBundle';

export interface GrantRoleModalProps {
  readonly visible: boolean;
  readonly onClose: () => void;
}

interface UserMatch {
  readonly user_id: string;
  readonly display_name: string | null;
  readonly avatar_url: string | null;
}

async function lookupUsers(q: string): Promise<readonly UserMatch[]> {
  const trimmed = q.trim();
  if (trimmed.length < 2) return [];
  const { data, error } = await supabase
    .from('users')
    .select('user_id, display_name, avatar_url')
    .eq('account_status', 'active')
    .ilike('display_name', `%${trimmed}%`)
    .limit(8);
  if (error || !Array.isArray(data)) return [];
  return data as UserMatch[];
}

export function GrantRoleModal({ visible, onClose }: GrantRoleModalProps) {
  const styles = useStyles();
  const L = useLocaleBundle();
  const [query, setQuery] = useState('');
  const [matches, setMatches] = useState<readonly UserMatch[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [selected, setSelected] = useState<UserMatch | null>(null);
  const [role, setRole] = useState<GrantableAdminRole | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const grant = useGrantAdminRole();

  useEffect(() => {
    if (!visible) {
      setQuery(''); setMatches([]); setSelected(null);
      setRole(null); setErrorCode(null);
    }
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    if (selected) return;
    let cancelled = false;
    setLoadingMatches(true);
    const handle = setTimeout(async () => {
      const r = await lookupUsers(query);
      if (!cancelled) {
        setMatches(r);
        setLoadingMatches(false);
      }
    }, 280);
    return () => { cancelled = true; clearTimeout(handle); setLoadingMatches(false); };
  }, [query, selected, visible]);

  const canSubmit = selected !== null && role !== null && !grant.isPending;

  async function submit() {
    if (!selected || !role) return;
    setErrorCode(null);
    try {
      await grant.mutateAsync({ targetUserId: selected.user_id, role });
      onClose();
    } catch (e) {
      const code = isAdminRoleError(e) ? e.code : 'unknown';
      setErrorCode(code);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.title}>{L.admin.admins.grantModal.title}</Text>

          <Text style={styles.label}>{L.admin.admins.grantModal.searchLabel}</Text>
          {selected ? (
            <View style={styles.selectedRow}>
              <Text style={styles.selectedName} numberOfLines={1}>
                {selected.display_name ?? L.admin.admins.row.unnamed}
              </Text>
              <Pressable onPress={() => { setSelected(null); setQuery(''); }}>
                <Text style={styles.changeLink}>{L.admin.admins.grantModal.changeUser}</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <TextInput
                style={styles.input}
                value={query}
                onChangeText={setQuery}
                placeholder={L.admin.admins.grantModal.searchPlaceholder}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {loadingMatches && <ActivityIndicator style={{ marginTop: 8 }} />}
              {!loadingMatches && query.trim().length >= 2 && matches.length === 0 && (
                <Text style={styles.hint}>{L.admin.admins.grantModal.noMatches}</Text>
              )}
              {matches.map((m) => (
                <Pressable
                  key={m.user_id}
                  style={styles.matchRow}
                  onPress={() => setSelected(m)}
                >
                  <Text style={styles.matchName} numberOfLines={1}>
                    {m.display_name ?? L.admin.admins.row.unnamed}
                  </Text>
                </Pressable>
              ))}
            </>
          )}

          <Text style={[styles.label, { marginTop: 12 }]}>
            {L.admin.admins.grantModal.roleLabel}
          </Text>
          <View style={styles.roleRow}>
            {GRANTABLE_ADMIN_ROLES.map((r) => (
              <Pressable
                key={r}
                onPress={() => setRole(r)}
                style={[styles.roleChip, role === r && styles.roleChipActive]}
              >
                <Text style={[styles.roleChipText, role === r && styles.roleChipTextActive]}>
                  {L.admin.roles[r]}
                </Text>
              </Pressable>
            ))}
          </View>

          {errorCode !== null && (
            <Text style={styles.errorText}>
              {L.admin.admins.grantModal.errors[errorCode as keyof LocaleBundle['admin']['admins']['grantModal']['errors']]
                ?? L.admin.admins.grantModal.errors.unknown}
            </Text>
          )}

          <View style={styles.actions}>
            <Pressable style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>{L.admin.admins.grantModal.cancel}</Text>
            </Pressable>
            <Pressable
              style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
              disabled={!canSubmit}
              onPress={() => { void submit(); }}
            >
              <Text style={styles.submitBtnText}>{L.admin.admins.grantModal.submit}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const useStyles = makeUseStyles(({ colors }) => ({
  overlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 16 },
  sheet:      { backgroundColor: colors.surface, borderRadius: 14, padding: 16, gap: 6, maxHeight: '85%' },
  title:      { fontSize: 18, fontWeight: '700', marginBottom: 6 },
  label:      { fontSize: 12, opacity: 0.7, marginBottom: 4 },
  input: {
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, borderRadius: 8,
    padding: 10, fontSize: 14, textAlign: 'right',
  },
  selectedRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 10, paddingHorizontal: 12,
    backgroundColor: colors.secondaryLight, borderRadius: 8,
  },
  selectedName: { fontSize: 14, fontWeight: '600', flex: 1 },
  changeLink:   { fontSize: 12, color: colors.primary, fontWeight: '600' },
  hint:         { fontSize: 12, opacity: 0.6, marginTop: 6, textAlign: 'center' },
  matchRow:     { paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  matchName:    { fontSize: 14 },
  roleRow:      { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  roleChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8,
    backgroundColor: colors.secondaryLight,
  },
  roleChipActive: { backgroundColor: colors.primary },
  roleChipText:   { fontSize: 13, fontWeight: '600' },
  roleChipTextActive: { color: colors.textInverse },
  errorText:      { fontSize: 12, color: colors.error, marginTop: 8 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 16 },
  cancelBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8 },
  cancelBtnText: { fontSize: 14, fontWeight: '500' },
  submitBtn: {
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8,
    backgroundColor: colors.primary,
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { fontSize: 14, fontWeight: '700', color: colors.textInverse },
}));
