// app/apps/mobile/src/components/admin/admins/RoleBadge.tsx
// FR-ADMIN-022 — compact role pill used on the unified admin card and detail.
import { StyleSheet, View } from 'react-native';
import type { AdminRole } from '@kc/domain';
import { avatarPalette, makeUseStyles, radius, spacing, Text, typography } from '@kc/ui';
import { rowDirectionStart } from '../../../lib/rtlLayout';
import { useLocaleBundle } from '../../../i18n/useLocaleBundle';

// Accent per role, taken from the brand's categorical palette (spec 17 §4:
// admin screens introduce no colours of their own). Exhaustive by type. The
// accent marks the dot and border only; the label uses theme text colours so
// it meets AA in both light and dark mode.
const [orange, navy, green, pink, teal, amber, violet, blue] = avatarPalette.backgrounds;
const ROLE_ACCENT: Readonly<Record<AdminRole, string>> = {
  super_admin:       violet,
  moderator:         blue,
  support:           teal,
  operators_manager: green,
  operator:          green,
  org_admin:         orange,
  org_manager:       amber,
  volunteer_manager: pink,
  org_employee:      navy,
  org_volunteer:     navy,
};

export interface RoleBadgeProps {
  readonly role: AdminRole;
  readonly muted?: boolean;
}

export function RoleBadge({ role, muted }: RoleBadgeProps) {
  const styles = useStyles();
  const L = useLocaleBundle();
  const accent = ROLE_ACCENT[role];
  return (
    <View style={[styles.badge, { borderColor: accent }, muted && styles.muted]}>
      <View style={[styles.dot, { backgroundColor: accent }]} />
      <Text style={styles.text} numberOfLines={1}>
        {L.admin.roles[role]}
      </Text>
    </View>
  );
}

const useStyles = makeUseStyles(({ colors }) => ({
  badge: {
    flexDirection: rowDirectionStart, alignItems: 'center', gap: spacing.xs,
    paddingHorizontal: spacing.sm, paddingVertical: spacing.xs,
    borderRadius: radius.full, borderWidth: StyleSheet.hairlineWidth,
  },
  muted: { opacity: 0.5 },
  dot:   { width: 6, height: 6, borderRadius: radius.full },
  text:  { ...typography.caption, ...typography.bold, color: colors.textPrimary },
}));
