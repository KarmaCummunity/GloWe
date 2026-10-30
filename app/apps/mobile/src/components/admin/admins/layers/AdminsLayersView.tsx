// app/apps/mobile/src/components/admin/admins/layers/AdminsLayersView.tsx
// FR-ADMIN-028 — the "layers" tab of the admins screen.
//
// Renders the whole management structure as levels of the reporting chain —
// as many as the data holds — standing on the masked community base. Every
// organisation has a colour that follows its people through every level; the
// org chips focus the view on one org without refetching (the fold is
// in-memory).
import { useEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import type { HierarchyPyramid } from '@kc/domain';
import { makeUseStyles, useTheme } from '@kc/ui';
import { useHierarchyPyramid } from '../../../../hooks/useHierarchyPyramid';
import { SimpleRowListSkeleton } from '../../../skeletons/SimpleRowListSkeleton';
import { MotionEntry } from '../../../ui/MotionEntry';
import { OrgSwitcher } from '../OrgSwitcher';
import { HierarchyStatsStrip } from './HierarchyStatsStrip';
import { HierarchyLayerBand } from './HierarchyLayerBand';
import { MaskedCommunityBand } from './MaskedCommunityBand';
import { buildOrgAccents, layerPhoneInset, layerWidePct } from './layerVisuals';
import { useLocaleBundle } from '../../../../i18n/useLocaleBundle';

/** Stagger between consecutive bands of the entry animation, in ms. */
const BAND_STAGGER_MS = 80;

export interface AdminsLayersViewProps {
  readonly isWide: boolean;
  readonly onSelect: (userId: string) => void;
}

/** Band width: a tapering pyramid on wide screens, a gentle inset on phones. */
function bandWidthStyle(index: number, total: number, isWide: boolean) {
  return isWide
    ? { width: `${layerWidePct(index, total)}%` as const }
    : { alignSelf: 'stretch' as const, marginHorizontal: layerPhoneInset(index, total) };
}

interface PyramidBodyProps {
  readonly pyramid: HierarchyPyramid;
  readonly focusOrgId: string | null;
  readonly onFocus: (orgId: string | null) => void;
  readonly isWide: boolean;
  readonly onSelect: (userId: string) => void;
}

function PyramidBody({ pyramid, focusOrgId, onFocus, isWide, onSelect }: PyramidBodyProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  const L = useLocaleBundle();
  // `pyramid.orgs` always lists every visible org (independent of focus), so
  // accents and chip options stay stable while the user switches focus.
  const orgAccents = useMemo(() => buildOrgAccents(pyramid.orgs, colors.primary), [pyramid.orgs, colors.primary]);
  const verifiedOrgIds = useMemo(
    () => new Set(pyramid.orgs.filter((o) => o.isVerified).map((o) => o.orgId)),
    [pyramid.orgs],
  );
  const orgOptions = useMemo(() => pyramid.orgs.map((o) => ({ id: o.orgId, name: o.name })), [pyramid.orgs]);
  const total = pyramid.layers.length;

  return (
    <View style={styles.body}>
      <HierarchyStatsStrip
        communityTotal={pyramid.base.communityTotal}
        roleHolders={pyramid.visiblePeople}
        orgCount={pyramid.orgs.length}
        affiliated={pyramid.base.affiliatedCount}
      />
      {orgOptions.length > 1 && (
        <OrgSwitcher orgs={orgOptions} selected={focusOrgId} onSelect={onFocus} accents={orgAccents} />
      )}
      <View style={styles.stack}>
        {total === 0 && <Text style={styles.emptyText}>{L.admin.admins.layers.empty}</Text>}
        {pyramid.layers.map((layer, i) => (
          <MotionEntry
            key={layer.level}
            delay={i * BAND_STAGGER_MS}
            style={[styles.bandSlot, bandWidthStyle(i, total, isWide)]}
          >
            <HierarchyLayerBand
              layer={layer}
              orgAccents={orgAccents}
              verifiedOrgIds={verifiedOrgIds}
              onSelect={onSelect}
            />
            <View style={styles.connector} importantForAccessibility="no" />
          </MotionEntry>
        ))}
        <MotionEntry delay={total * BAND_STAGGER_MS} style={[styles.bandSlot, styles.baseSlot]}>
          <MaskedCommunityBand base={pyramid.base} />
        </MotionEntry>
      </View>
    </View>
  );
}

export function AdminsLayersView({ isWide, onSelect }: AdminsLayersViewProps) {
  const styles = useStyles();
  const L = useLocaleBundle();
  const [focusOrgId, setFocusOrgId] = useState<string | null>(null);
  const { pyramid, isRefetching, refetch, error } = useHierarchyPyramid(focusOrgId);

  // A refetch can drop the focused org (e.g. its last grant was revoked);
  // fall back to "all orgs" instead of rendering empty strata with no chip.
  useEffect(() => {
    if (focusOrgId !== null && pyramid !== null && !pyramid.orgs.some((o) => o.orgId === focusOrgId)) {
      setFocusOrgId(null);
    }
  }, [focusOrgId, pyramid]);

  // Branch on data, not on `isLoading`: while the persisted cache restores, a
  // query is pending without fetching, so "not loading" does not mean "failed".
  // Loaded data wins over an error: a failed background refetch keeps the last
  // good pyramid on screen instead of replacing it with the error state.
  let content;
  if (pyramid === null && error) {
    content = (
      <View style={styles.center}>
        <Text style={styles.errorText}>{L.admin.admins.layers.loadError}</Text>
        <Pressable accessibilityRole="button" onPress={refetch} style={styles.retryBtn}>
          <Text style={styles.retryText}>{L.admin.admins.layers.retry}</Text>
        </Pressable>
      </View>
    );
  } else if (pyramid === null) {
    content = <SimpleRowListSkeleton rows={6} rowHeight={88} />;
  } else {
    content = (
      <PyramidBody
        pyramid={pyramid}
        focusOrgId={focusOrgId}
        onFocus={setFocusOrgId}
        isWide={isWide}
        onSelect={onSelect}
      />
    );
  }

  return (
    <ScrollView
      contentContainerStyle={[styles.content, isWide && styles.contentWide]}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
    >
      {content}
    </ScrollView>
  );
}

const useStyles = makeUseStyles(({ colors }) => ({
  content:     { paddingHorizontal: 16, paddingBottom: 32 },
  contentWide: { width: '100%', maxWidth: 960, alignSelf: 'center' },
  body:        { gap: 12 },
  stack:       { alignItems: 'center' },
  bandSlot:    { alignItems: 'center' },
  baseSlot:    { alignSelf: 'stretch' },
  connector:   { width: 2, height: 14, backgroundColor: colors.border, borderRadius: 1 },
  center:      { alignItems: 'center', gap: 12, paddingVertical: 32 },
  errorText:   { fontSize: 14, color: colors.textSecondary, textAlign: 'center' },
  emptyText:   { fontSize: 13, color: colors.textSecondary, textAlign: 'center', paddingVertical: 16 },
  retryBtn:    { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, backgroundColor: colors.primary },
  retryText:   { color: colors.textInverse, fontWeight: '700', fontSize: 13 },
}));
