// app/apps/mobile/src/components/admin/admins/layers/HierarchyLayerBand.tsx
// FR-ADMIN-028 — one level of the layered hierarchy.
//
// A card with an accent rail, a header (top-role icon, level title, the roles
// present, headcount) and one cluster per organisation. Large clusters are
// capped and expand on demand so a level with hundreds of volunteers stays
// scannable.
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { HierarchyLayer, LayerOrgGroup } from '@kc/domain';
import { makeUseStyles, useTheme } from '@kc/ui';
import { LayerPersonChip } from './LayerPersonChip';
import { ROLE_ICON, layerAccent } from './layerVisuals';
import { rowDirectionStart, textAlignStart } from '../../../../lib/rtlLayout';
import { useLocaleBundle } from '../../../../i18n/useLocaleBundle';

/** People shown per org cluster before the "+N more" affordance. */
const CLUSTER_PREVIEW = 12;

export interface HierarchyLayerBandProps {
  readonly layer: HierarchyLayer;
  readonly orgAccents: ReadonlyMap<string, string>;
  readonly verifiedOrgIds: ReadonlySet<string>;
  readonly onSelect: (userId: string) => void;
}

interface OrgClusterProps {
  readonly group: LayerOrgGroup;
  readonly accent: string;
  readonly isVerified: boolean;
  readonly onSelect: (userId: string) => void;
}

function OrgCluster({ group, accent, isVerified, onSelect }: OrgClusterProps) {
  const styles = useStyles();
  const L = useLocaleBundle();
  const [expanded, setExpanded] = useState(false);
  const hidden = group.people.length - CLUSTER_PREVIEW;
  const shown = expanded || hidden <= 0 ? group.people : group.people.slice(0, CLUSTER_PREVIEW);

  return (
    <View style={styles.cluster}>
      <View style={styles.clusterHeader}>
        <View style={[styles.orgDot, { backgroundColor: accent }]} />
        <Text style={styles.orgName} numberOfLines={1}>{group.orgName}</Text>
        {isVerified && (
          <Ionicons
            name="checkmark-circle"
            size={13}
            color={accent}
            accessibilityLabel={L.admin.admins.layers.verified}
          />
        )}
        <Text style={styles.orgCount}>{group.people.length}</Text>
      </View>
      <View style={styles.people}>
        {shown.map((person) => (
          <LayerPersonChip
            key={person.userId}
            person={person}
            orgName={group.orgName}
            orgAccent={accent}
            onSelect={onSelect}
          />
        ))}
      </View>
      {hidden > 0 && (
        <Pressable accessibilityRole="button" onPress={() => setExpanded((v) => !v)} style={styles.moreBtn}>
          <Text style={[styles.moreText, { color: accent }]}>
            {expanded ? L.admin.admins.layers.showLess : L.admin.admins.layers.showMore(hidden)}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

export function HierarchyLayerBand({ layer, orgAccents, verifiedOrgIds, onSelect }: HierarchyLayerBandProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  const L = useLocaleBundle();
  const copy = L.admin.admins.layers;
  const accent = layerAccent(layer.level);
  const [topRole] = layer.roles;
  const title = layer.level === 0 ? copy.apexTitle : copy.levelTitle(layer.level);
  // The hint names the roles present, so a deep chain stays self-explanatory.
  const hint = layer.roles.map((role) => L.admin.roles[role]).join(' · ');

  return (
    <View style={[styles.band, { borderTopColor: accent }]}>
      <View style={styles.header}>
        <View style={[styles.iconBubble, { backgroundColor: `${accent}1F` }]}>
          {topRole && <Ionicons name={ROLE_ICON[topRole]} size={18} color={accent} />}
        </View>
        <View style={styles.headerTexts}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.hint} numberOfLines={2}>{hint}</Text>
        </View>
        <View
          accessible
          accessibilityLabel={L.admin.admins.layers.headcountA11y(layer.headcount)}
          style={[styles.count, { backgroundColor: accent }]}
        >
          <Text style={styles.countText}>{layer.headcount}</Text>
        </View>
      </View>

      {layer.groups.map((group) => (
        <OrgCluster
          key={group.orgId}
          group={group}
          accent={orgAccents.get(group.orgId) ?? colors.primary}
          isVerified={verifiedOrgIds.has(group.orgId)}
          onSelect={onSelect}
        />
      ))}
    </View>
  );
}

const useStyles = makeUseStyles(({ colors }) => ({
  band: {
    alignSelf: 'center', width: '100%',
    backgroundColor: colors.surface, borderRadius: 18, borderTopWidth: 3,
    paddingHorizontal: 14, paddingVertical: 12, gap: 10,
    shadowColor: colors.shadow, shadowOpacity: 0.08, shadowRadius: 10, shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  header:      { flexDirection: rowDirectionStart, alignItems: 'center', gap: 10 },
  iconBubble:  { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  headerTexts: { flex: 1, gap: 2 },
  title:       { fontSize: 15, fontWeight: '800', color: colors.textPrimary, textAlign: textAlignStart() },
  hint:        { fontSize: 12, color: colors.textSecondary, textAlign: textAlignStart() },
  count: {
    minWidth: 32, height: 26, paddingHorizontal: 8, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center',
  },
  countText:   { fontSize: 13, fontWeight: '800', color: colors.textInverse },
  cluster: {
    borderRadius: 14, backgroundColor: colors.background, padding: 8, gap: 4,
  },
  clusterHeader: { flexDirection: rowDirectionStart, alignItems: 'center', gap: 6, paddingHorizontal: 4 },
  orgDot:      { width: 8, height: 8, borderRadius: 4 },
  orgName:     { flexShrink: 1, fontSize: 12, fontWeight: '700', color: colors.textSecondary, textAlign: textAlignStart() },
  orgCount:    { marginStart: 'auto', fontSize: 11, fontWeight: '700', color: colors.textDisabled },
  people:      { flexDirection: rowDirectionStart, flexWrap: 'wrap', justifyContent: 'center' },
  moreBtn:     { alignSelf: 'center', paddingVertical: 4, paddingHorizontal: 10 },
  moreText:    { fontSize: 12, fontWeight: '800' },
}));
