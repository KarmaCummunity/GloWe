// app/apps/mobile/src/components/admin/admins/layers/LayerPersonChip.tsx
// FR-ADMIN-028 — one named role-holder inside a hierarchy stratum.
//
// A compact vertical tile: avatar wrapped in an org-coloured ring, the name,
// and the person's highest role tinted by its role accent (+N when the person
// holds more roles in the same stratum). Tapping opens the admin-detail card.
import { Pressable, Text, View } from 'react-native';
import type { LayerPerson } from '@kc/domain';
import { makeUseStyles } from '@kc/ui';
import { AvatarInitials } from '../../../AvatarInitials';
import { ROLE_ACCENT } from '../RoleBadge';
import { rowDirectionStart } from '../../../../lib/rtlLayout';
import { useLocaleBundle } from '../../../../i18n/useLocaleBundle';

const AVATAR_SIZE = 40;
const RING_WIDTH = 2;
const FALLBACK_ROLE_ACCENT = '#475569';

export interface LayerPersonChipProps {
  readonly person: LayerPerson;
  readonly orgName: string;
  /** Ring colour identifying the person's organisation. */
  readonly orgAccent: string;
  readonly onSelect: (userId: string) => void;
}

export function LayerPersonChip({ person, orgName, orgAccent, onSelect }: LayerPersonChipProps) {
  const styles = useStyles();
  const L = useLocaleBundle();
  const name = person.displayName ?? L.admin.admins.row.unnamed;
  const [topRole] = person.roles;
  const roleLabel = topRole ? L.admin.roles[topRole] : '';
  const roleAccent = (topRole && ROLE_ACCENT[topRole]) ?? FALLBACK_ROLE_ACCENT;
  const extraRoles = person.roles.length - 1;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={L.admin.admins.layers.personA11y(name, roleLabel, orgName, extraRoles)}
      onPress={() => onSelect(person.userId)}
      style={({ pressed }) => [styles.chip, pressed && styles.pressed]}
    >
      <View style={[styles.ring, { borderColor: orgAccent }]}>
        <AvatarInitials name={name} avatarUrl={person.avatarUrl} size={AVATAR_SIZE} />
      </View>
      <Text style={styles.name} numberOfLines={1}>{name}</Text>
      <View style={styles.roleRow}>
        <Text style={[styles.role, { color: roleAccent }]} numberOfLines={1}>{roleLabel}</Text>
        {extraRoles > 0 && (
          <Text style={styles.more}>{L.admin.admins.layers.moreRoles(extraRoles)}</Text>
        )}
      </View>
    </Pressable>
  );
}

const useStyles = makeUseStyles(({ colors }) => ({
  chip: {
    width: 84, alignItems: 'center', gap: 4,
    paddingVertical: 8, paddingHorizontal: 4, borderRadius: 14,
  },
  pressed: { backgroundColor: colors.surfaceRaised, opacity: 0.85 },
  ring: {
    padding: 2, borderWidth: RING_WIDTH, borderRadius: (AVATAR_SIZE + 4 + RING_WIDTH * 2) / 2,
  },
  name:    { fontSize: 12, fontWeight: '700', color: colors.textPrimary, textAlign: 'center', maxWidth: 80 },
  roleRow: { flexDirection: rowDirectionStart, alignItems: 'center', gap: 3, maxWidth: 80 },
  role:    { fontSize: 10, fontWeight: '700', flexShrink: 1 },
  more:    { fontSize: 10, fontWeight: '800', color: colors.textSecondary },
}));
