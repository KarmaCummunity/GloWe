// app/apps/mobile/src/components/admin/admins/layers/MaskedCommunityBand.tsx
// FR-ADMIN-027 — the masked base of the hierarchy: the whole community.
//
// Identities are never shown here (the census RPC returns counts only). The
// band renders an abstract field of anonymous dots whose density follows the
// community size, a lock glyph, the masked count and — when present — the
// self-declared volunteer affiliates of the focused orgs.
import { useMemo } from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { CommunityBase } from '@kc/domain';
import { makeUseStyles, useTheme } from '@kc/ui';
import { rowDirectionStart, textAlignStart } from '../../../../lib/rtlLayout';
import { useLocaleBundle } from '../../../../i18n/useLocaleBundle';

/** Upper bound of rendered dots; the field is a symbol, not a 1:1 tally. */
const MAX_DOTS = 72;
const MIN_DOTS = 12;

/**
 * Deterministic opacity in [0.25, 0.85] per dot index (integer hash), so the
 * field looks organic yet never flickers between renders.
 */
function dotOpacity(index: number): number {
  const hashed = Math.imul(index + 1, 2654435761) >>> 0;
  return 0.25 + (hashed % 61) / 100;
}

/** Dots to draw: grows with the community, clamped to keep the band light. */
function dotCount(maskedCount: number): number {
  if (maskedCount <= 0) return 0;
  return Math.min(MAX_DOTS, Math.max(MIN_DOTS, Math.ceil(Math.sqrt(maskedCount) * 4)));
}

export interface MaskedCommunityBandProps {
  readonly base: CommunityBase;
}

export function MaskedCommunityBand({ base }: MaskedCommunityBandProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  const L = useLocaleBundle();
  const copy = L.admin.admins.layers.community;
  const opacities = useMemo(
    () => Array.from({ length: dotCount(base.maskedCount) }, (_, i) => dotOpacity(i)),
    [base.maskedCount],
  );

  return (
    <View style={styles.band}>
      <View style={styles.field} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        {opacities.map((opacity, i) => (
          <View key={i} style={[styles.dot, { opacity }]} />
        ))}
      </View>

      <View style={styles.header}>
        <View style={styles.lockBubble}>
          <Ionicons name="lock-closed" size={16} color={colors.textSecondary} />
        </View>
        <View style={styles.texts}>
          <Text style={styles.title}>{copy.title}</Text>
          <Text style={styles.count}>{copy.masked(base.maskedCount)}</Text>
          {base.affiliatedCount > 0 && (
            <Text style={styles.affiliated}>{copy.affiliated(base.affiliatedCount)}</Text>
          )}
        </View>
      </View>
      <Text style={styles.hint}>{copy.hint}</Text>
    </View>
  );
}

const useStyles = makeUseStyles(({ colors }) => ({
  band: {
    width: '100%', borderRadius: 18, overflow: 'hidden',
    borderWidth: 1, borderStyle: 'dashed', borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceCream, padding: 14, gap: 10,
  },
  field: {
    flexDirection: rowDirectionStart, flexWrap: 'wrap', justifyContent: 'center',
    gap: 6, paddingVertical: 4,
  },
  dot:        { width: 9, height: 9, borderRadius: 4.5, backgroundColor: colors.textDisabled },
  header:     { flexDirection: rowDirectionStart, alignItems: 'center', gap: 10 },
  lockBubble: {
    width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.skeleton,
  },
  texts:      { flex: 1, gap: 2 },
  title:      { fontSize: 15, fontWeight: '800', color: colors.textPrimary, textAlign: textAlignStart() },
  count:      { fontSize: 13, fontWeight: '700', color: colors.textSecondary, textAlign: textAlignStart() },
  affiliated: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, textAlign: textAlignStart() },
  hint:       { fontSize: 11, color: colors.textDisabled, textAlign: textAlignStart() },
}));
