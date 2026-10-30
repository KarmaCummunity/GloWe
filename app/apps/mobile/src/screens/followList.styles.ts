import { makeUseStyles, radius, spacing, typography } from '@kc/ui';
import { rowDirectionStart } from '../lib/rtlLayout';
import { rtlTextAlignStart } from '../lib/rtlTextAlignStart';

// Shared by the followers and following list screens (FR-PROFILE-010), which
// render the same search row and user rows; `menuBtn` is the followers-only
// "remove follower" control.
export const useFollowListStyles = makeUseStyles(({ colors }) => ({
  container: { flex: 1, backgroundColor: colors.background },
  searchRow: {
    flexDirection: rowDirectionStart, alignItems: 'center', gap: spacing.xs,
    backgroundColor: colors.surface, margin: spacing.base, padding: spacing.sm,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
  },
  searchInput: { flex: 1, ...typography.body, color: colors.textPrimary, textAlign: rtlTextAlignStart },
  row: {
    flexDirection: rowDirectionStart, alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.base, paddingVertical: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  rowText: { flex: 1 },
  name: { ...typography.body, color: colors.textPrimary, textAlign: rtlTextAlignStart },
  city: { ...typography.caption, color: colors.textSecondary, textAlign: rtlTextAlignStart },
  menuBtn: { padding: spacing.xs },
  empty: { ...typography.body, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.lg },
}));
