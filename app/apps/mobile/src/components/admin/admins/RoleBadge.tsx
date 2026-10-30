// app/apps/mobile/src/components/admin/admins/RoleBadge.tsx
// FR-ADMIN-022 — compact role pill used on the unified admin card and detail.
import { StyleSheet, Text, View } from 'react-native';
import type { AdminRole } from '@kc/domain';
import { makeUseStyles } from '@kc/ui';
import { useLocaleBundle } from '../../../i18n/useLocaleBundle';

// Semantic accent per role tier. Platform-wide roles lean on the brand primary;
// org-scoped roles use cooler neutrals so the hierarchy reads at a glance.
export const ROLE_ACCENT: Partial<Record<AdminRole, string>> = {
  super_admin:       '#7c3aed',
  moderator:         '#2563eb',
  support:           '#0891b2',
  operators_manager: '#0d9488',
  operator:          '#059669',
  org_admin:         '#ca8a04',
  org_manager:       '#d97706',
  volunteer_manager: '#dc2626',
  org_employee:      '#64748b',
  org_volunteer:     '#475569',
};

export interface RoleBadgeProps {
  readonly role: AdminRole;
  readonly muted?: boolean;
}

export function RoleBadge({ role, muted }: RoleBadgeProps) {
  const styles = useStyles();
  const L = useLocaleBundle();
  const accent = ROLE_ACCENT[role] ?? '#475569';
  return (
    <View style={[styles.badge, { borderColor: accent }, muted && styles.muted]}>
      <View style={[styles.dot, { backgroundColor: accent }]} />
      <Text style={[styles.text, { color: accent }]} numberOfLines={1}>
        {L.admin.roles[role]}
      </Text>
    </View>
  );
}

const useStyles = makeUseStyles(() => ({
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 999, borderWidth: StyleSheet.hairlineWidth,
  },
  muted: { opacity: 0.5 },
  dot:   { width: 6, height: 6, borderRadius: 3 },
  text:  { fontSize: 11, fontWeight: '700' },
}));
