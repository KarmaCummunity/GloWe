// app/apps/mobile/src/components/admin/admins/AdminRow.tsx
// FR-ADMIN-015 — single admin row with optional revoke action.
import { Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import type { AdminGrant } from '@kc/domain';
import { makeUseStyles } from '@kc/ui';
import { useLocaleBundle, type LocaleBundle } from '../../../i18n/useLocaleBundle';

export interface AdminRowProps {
  readonly grant: AdminGrant;
  readonly canRevoke: boolean;
  readonly onRevoke: (grantId: string) => void;
  readonly busy?: boolean;
}

function fmtLastSeen(L: LocaleBundle, d: Date | null): string {
  if (d === null) return L.admin.admins.row.neverSeen;
  const ms = Date.now() - d.getTime();
  if (ms < 60 * 60 * 1000) return L.admin.admins.row.seenMinutesAgo(Math.max(1, Math.floor(ms / 60_000)));
  if (ms < 24 * 60 * 60 * 1000) return L.admin.admins.row.seenHoursAgo(Math.floor(ms / 3_600_000));
  return L.admin.admins.row.seenDaysAgo(Math.floor(ms / 86_400_000));
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString('he-IL', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

async function confirmRevoke(L: LocaleBundle, name: string): Promise<boolean> {
  const msg = L.admin.admins.row.revokeConfirm(name);
  if (Platform.OS === 'web') {
    return typeof window !== 'undefined' && window.confirm(msg);
  }
  return new Promise<boolean>((resolve) => {
    Alert.alert(L.admin.admins.row.revokeTitle, msg, [
      { text: L.admin.admins.row.revokeCancel, style: 'cancel', onPress: () => resolve(false) },
      { text: L.admin.admins.row.revokeConfirmAction, style: 'destructive', onPress: () => resolve(true) },
    ]);
  });
}

export function AdminRow({ grant, canRevoke, onRevoke, busy }: AdminRowProps) {
  const styles = useStyles();
  const L = useLocaleBundle();
  const name = grant.displayName ?? L.admin.admins.row.unnamed;
  const revoked = grant.revokedAt !== null;

  const onRevokePress = async () => {
    const ok = await confirmRevoke(L, name);
    if (ok) onRevoke(grant.grantId);
  };

  return (
    <View style={[styles.root, revoked && styles.rootRevoked]}>
      <View style={styles.main}>
        <Text style={styles.name} numberOfLines={1}>{name}</Text>
        <Text style={styles.meta}>
          {revoked
            ? L.admin.admins.row.revokedAt(fmtDate(grant.revokedAt!))
            : fmtLastSeen(L, grant.lastSeenAt)}
        </Text>
        <Text style={styles.metaSmall}>
          {L.admin.admins.row.grantedAt(fmtDate(grant.grantedAt))}
          {grant.grantedByDisplayName ? ` · ${L.admin.admins.row.grantedBy(grant.grantedByDisplayName)}` : ''}
        </Text>
      </View>
      {canRevoke && !revoked && (
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={() => { void onRevokePress(); }}
          style={[styles.revokeBtn, busy && styles.revokeBtnDisabled]}
        >
          <Text style={styles.revokeBtnText}>{L.admin.admins.row.revokeShort}</Text>
        </Pressable>
      )}
    </View>
  );
}

const useStyles = makeUseStyles(({ colors }) => ({
  root: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border,
  },
  rootRevoked: { opacity: 0.55 },
  main:        { flex: 1, gap: 2 },
  name:        { fontSize: 15, fontWeight: '600' },
  meta:        { fontSize: 12, opacity: 0.75 },
  metaSmall:   { fontSize: 11, opacity: 0.55 },
  revokeBtn: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8,
    backgroundColor: colors.errorLight,
  },
  revokeBtnDisabled: { opacity: 0.5 },
  // TD-130: no on-errorLight token in light palette yet — same as CaseActions btnTextDanger.
  revokeBtnText: { fontSize: 13, fontWeight: '600', color: '#7f1d1d' },
}));
