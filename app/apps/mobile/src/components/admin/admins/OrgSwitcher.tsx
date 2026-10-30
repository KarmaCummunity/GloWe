// app/apps/mobile/src/components/admin/admins/OrgSwitcher.tsx
// FR-ADMIN-025 — org filter for the hierarchy tree. super_admin can switch
// between orgs (or view all); scoped admins are pinned to their org upstream.
import { ScrollView, Pressable, Text, View } from 'react-native';
import { makeUseStyles } from '@kc/ui';
import { rowDirectionStart } from '../../../lib/rtlLayout';
import { useLocaleBundle } from '../../../i18n/useLocaleBundle';

export interface OrgOption {
  readonly id: string;
  readonly name: string;
}

export interface OrgSwitcherProps {
  readonly orgs: readonly OrgOption[];
  readonly selected: string | null;
  readonly onSelect: (orgId: string | null) => void;
  /** Optional colour key per org (FR-ADMIN-028 layered view); renders a dot. */
  readonly accents?: ReadonlyMap<string, string>;
}

export function OrgSwitcher({ orgs, selected, onSelect, accents }: OrgSwitcherProps) {
  const styles = useStyles();
  const L = useLocaleBundle();
  const chip = (id: string | null, label: string) => {
    const accent = id === null ? undefined : accents?.get(id);
    return (
      <Pressable
        key={id ?? 'all'}
        accessibilityRole="button"
        accessibilityState={{ selected: selected === id }}
        onPress={() => onSelect(id)}
        style={[styles.chip, selected === id && styles.chipActive]}
      >
        {accent !== undefined && <View style={[styles.dot, { backgroundColor: accent }]} />}
        <Text style={[styles.chipText, selected === id && styles.chipTextActive]}>{label}</Text>
      </Pressable>
    );
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.bar}
    >
      {chip(null, L.admin.admins.tree.orgAll)}
      {orgs.map((o) => chip(o.id, o.name))}
    </ScrollView>
  );
}

const useStyles = makeUseStyles(({ colors }) => ({
  bar: { flexDirection: rowDirectionStart, gap: 8, paddingHorizontal: 16, paddingVertical: 8 },
  chip: {
    flexDirection: rowDirectionStart, alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999,
    backgroundColor: colors.surface,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  chipActive: { backgroundColor: colors.primary },
  chipText: { fontSize: 12, fontWeight: '700', color: colors.textSecondary },
  chipTextActive: { color: colors.textInverse },
}));
