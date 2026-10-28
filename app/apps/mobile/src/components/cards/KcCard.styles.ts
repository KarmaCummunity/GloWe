import { makeUseStyles, spacing, typography } from '@kc/ui';
import { rowDirectionStart } from '../../lib/rtlLayout';

export const useKcCardExtraStyles = makeUseStyles(({ colors }) => ({
  routeRow: { flexDirection: rowDirectionStart, alignItems: 'center' as const, gap: 4 },
  routeText: { ...typography.caption, fontWeight: '700' as const, color: colors.textPrimary, flexShrink: 1 },
  detailsRow: { flexDirection: rowDirectionStart, flexWrap: 'wrap' as const, gap: spacing.sm },
  detail: { flexDirection: rowDirectionStart, alignItems: 'center' as const, gap: 3 },
  detailText: { ...typography.caption, fontSize: 11, color: colors.textSecondary },
}));

/** Cell wrapper for 2-column card grids (equal width, centred card). */
export const kcGridCell = { width: '50%' as const, alignItems: 'center' as const, marginBottom: spacing.md };
