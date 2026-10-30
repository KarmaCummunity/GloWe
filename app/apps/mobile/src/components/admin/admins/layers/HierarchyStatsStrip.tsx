// app/apps/mobile/src/components/admin/admins/layers/HierarchyStatsStrip.tsx
// FR-ADMIN-027 — headline numbers above the layered hierarchy.
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { makeUseStyles, useTheme } from '@kc/ui';
import type { LayerIconName } from './layerVisuals';
import { rowDirectionStart } from '../../../../lib/rtlLayout';
import { useLocaleBundle } from '../../../../i18n/useLocaleBundle';

export interface HierarchyStatsStripProps {
  readonly communityTotal: number;
  readonly roleHolders: number;
  readonly orgCount: number;
  readonly affiliated: number;
}

interface Stat {
  readonly key: string;
  readonly icon: LayerIconName;
  readonly value: number;
  readonly label: string;
}

export function HierarchyStatsStrip({ communityTotal, roleHolders, orgCount, affiliated }: HierarchyStatsStripProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  const copy = useLocaleBundle().admin.admins.layers.stats;
  const stats: readonly Stat[] = [
    { key: 'community',   icon: 'people',    value: communityTotal, label: copy.community },
    { key: 'roleHolders', icon: 'ribbon',    value: roleHolders,    label: copy.roleHolders },
    { key: 'orgs',        icon: 'business',  value: orgCount,       label: copy.orgs },
    { key: 'affiliated',  icon: 'hand-left', value: affiliated,     label: copy.affiliated },
  ];

  return (
    <View style={styles.strip}>
      {stats.map((s) => (
        <View key={s.key} style={styles.tile} accessible accessibilityLabel={`${s.label}: ${s.value}`}>
          <Ionicons name={s.icon} size={16} color={colors.primary} />
          <Text style={styles.value}>{s.value}</Text>
          <Text style={styles.label} numberOfLines={2}>{s.label}</Text>
        </View>
      ))}
    </View>
  );
}

const useStyles = makeUseStyles(({ colors }) => ({
  strip: { flexDirection: rowDirectionStart, flexWrap: 'wrap', gap: 8 },
  tile: {
    flexGrow: 1, flexBasis: '22%', minWidth: 72, alignItems: 'center', gap: 2,
    paddingVertical: 10, paddingHorizontal: 6, borderRadius: 14,
    backgroundColor: colors.primarySurface,
  },
  value: { fontSize: 18, fontWeight: '800', color: colors.textPrimary },
  label: { fontSize: 11, fontWeight: '600', color: colors.textSecondary, textAlign: 'center' },
}));
