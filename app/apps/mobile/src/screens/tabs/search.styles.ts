// Styles for /(tabs)/search.tsx. Extracted so the screen file stays under the
// architecture file-size budget after the visual redesign (search bar now uses
// the welcome-screen idiom: 52h rounded-xl white card with soft shadow + light
// border, filter button matches at radius.lg).
import { Platform, StyleSheet, type ViewStyle } from 'react-native';
import { makeUseStyles, radius, spacing, typography } from '@kc/ui';
import { rtlTextAlignEnd, rtlTextAlignStart } from '../../lib/rtlTextAlignStart';
import { isLayoutRtl, layoutDirectionStyle, rowDirectionStart } from '../../lib/rtlLayout';

/**
 * Pin the filter-count badge to the button's reading-end corner.
 * Native auto-mirrors `end`; RN-Web ignores `start`/`end` for absolute
 * positioning, so on web we resolve RTL live and emit a physical key.
 */
function filterBadgeCornerEnd(): Pick<ViewStyle, 'left' | 'right' | 'end'> {
  if (Platform.OS !== 'web') return { end: -4 };
  return isLayoutRtl() ? { left: -4 } : { right: -4 };
}

export const useSearchScreenStyles = makeUseStyles(({ colors, isDark }) => ({
  container: { flex: 1, backgroundColor: colors.surfaceCream },

  // ── Search bar + filter button (welcome-screen idiom) ─────────────────
  searchRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.sm,
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  searchInput: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.base,
    height: 52,
    gap: spacing.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0 : 0.05,
    shadowRadius: 6,
    elevation: isDark ? 0 : 2,
  },
  searchIcon: { marginLeft: spacing.xs },
  searchText: { flex: 1, ...typography.body, color: colors.textPrimary },
  filterBtn: {
    width: 52,
    height: 52,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    borderWidth: 1.5,
    borderColor: colors.border,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0 : 0.05,
    shadowRadius: 6,
    elevation: isDark ? 0 : 2,
  },
  filterBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterBadge: {
    position: 'absolute' as const,
    top: -4,
    ...filterBadgeCornerEnd(),
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.error,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  filterBadgeText: { ...typography.caption, color: colors.textInverse, fontSize: 10 },

  // ── Category / sort chips ─────────────────────────────────────────────
  chipContainer: { backgroundColor: 'transparent', maxHeight: 52 },
  chipRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.sm,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { ...typography.caption, fontWeight: '600' as const, color: colors.textPrimary },
  chipTextActive: { color: colors.textInverse },
  chipDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.border,
    marginHorizontal: spacing.xs,
  },
  sortChip: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
  },
  sortChipActive: { backgroundColor: colors.secondary, borderColor: colors.secondary },
  sortChipText: { fontSize: 10, fontWeight: '500' as const, color: colors.textSecondary },
  sortChipTextActive: { color: colors.textInverse },

  // ── Content + sections ────────────────────────────────────────────────
  content: { flex: 1 },
  contentInner: { padding: spacing.base, paddingBottom: spacing['2xl'] },
  section: { marginBottom: spacing.lg },
  sectionHeader: {
    flexDirection: rowDirectionStart,
    ...layoutDirectionStyle(),
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: spacing.sm,
  },
  sectionTitleRow: {
    flexDirection: rowDirectionStart,
    ...layoutDirectionStyle(),
    alignItems: 'center' as const,
    gap: spacing.xs,
    flexShrink: 1,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    textAlign: rtlTextAlignStart,
  },
  sectionCount: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: rtlTextAlignStart,
  },
  showAllBtn: { flexShrink: 0 },
  showAllText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600' as const,
    textAlign: rtlTextAlignEnd,
  },

  // ── Recent searches ───────────────────────────────────────────────────
  recentRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  recentRowPressed: { backgroundColor: colors.background },
  recentText: { flex: 1, ...typography.body, color: colors.textPrimary, textAlign: rtlTextAlignStart },
  clearRecentText: {
    ...typography.caption,
    color: colors.error,
    fontWeight: '500' as const,
    textAlign: rtlTextAlignEnd,
  },

  // ── Empty / loading states ────────────────────────────────────────────
  emptyState: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingVertical: spacing['3xl'],
    gap: spacing.md,
  },
  emptyTitle: { ...typography.h3, color: colors.textPrimary, textAlign: 'center' as const },
  emptySubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center' as const,
    maxWidth: 260,
  },
  loadingWrap: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingVertical: spacing['3xl'],
    gap: spacing.md,
  },
  loadingText: { ...typography.body, color: colors.textSecondary },

  // ── National links note ───────────────────────────────────────────────
  nationalNote: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'flex-end' as const,
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  nationalNoteText: { ...typography.caption, color: colors.textSecondary, fontStyle: 'italic' as const },
}));
