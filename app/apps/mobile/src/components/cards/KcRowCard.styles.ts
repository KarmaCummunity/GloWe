import { StyleSheet } from 'react-native';
import { makeUseStyles, radius, shadow, spacing, typography } from '@kc/ui';
import { rowDirectionStart } from '../../lib/rtlLayout';
import { rtlTextAlignStart } from '../../lib/rtlTextAlignStart';

export const useKcRowCardStyles = makeUseStyles(({ colors }) => ({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadow.card,
  },
  closed: { opacity: 0.72 },
  main: { flexDirection: rowDirectionStart, alignItems: 'center' as const, gap: spacing.md },
  thumb: { borderRadius: radius.md, overflow: 'hidden' as const, alignItems: 'center' as const, justifyContent: 'center' as const },
  thumbGive: { backgroundColor: colors.primarySurface },
  thumbRequest: { backgroundColor: `${colors.secondary}18` },
  image: { ...StyleSheet.absoluteFillObject },
  body: { flex: 1, minWidth: 0, gap: 3 },
  chips: { flexDirection: rowDirectionStart, flexWrap: 'wrap' as const, gap: spacing.xs },
  pill: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.full },
  givePill: { backgroundColor: colors.primarySurface },
  requestPill: { backgroundColor: `${colors.secondary}18` },
  pillText: { ...typography.label, fontSize: 10, fontWeight: '700' as const },
  givePillText: { color: colors.giveTag },
  requestPillText: { color: colors.secondary },
  mutedPill: { backgroundColor: colors.border },
  mutedPillText: { color: colors.textSecondary },
  statusPill: { backgroundColor: colors.primaryLight },
  statusPillText: { color: colors.primary },
  title: { ...typography.body, fontWeight: '600' as const, color: colors.textPrimary, textAlign: rtlTextAlignStart },
  meta: { ...typography.caption, color: colors.textSecondary, textAlign: rtlTextAlignStart },
  openLink: { flexDirection: rowDirectionStart, alignItems: 'center' as const, gap: 2 },
  openLinkText: { ...typography.caption, fontWeight: '600' as const, color: colors.primary },
  trailing: { flexShrink: 0 },
  footer: { flexDirection: rowDirectionStart, flexWrap: 'wrap' as const, gap: spacing.md, marginTop: spacing.sm },
}));
