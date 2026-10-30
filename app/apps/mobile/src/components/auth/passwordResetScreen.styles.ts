// Shared layout for the FR-AUTH-008 screens: `(auth)/forgot-password` and
// `auth/reset-password`. Mirrors the `auth/verify` landing screen.
import { makeUseStyles, radius, spacing, typography } from '@kc/ui';

export const usePasswordResetStyles = makeUseStyles(({ colors }) => ({
  screen: { flex: 1, backgroundColor: colors.background },
  content: {
    flexGrow: 1,
    justifyContent: 'center' as const,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
    gap: spacing.md,
    width: '100%' as const,
    maxWidth: 480,
    alignSelf: 'center' as const,
  },
  title: { ...typography.h2, color: colors.textPrimary, textAlign: 'center' as const },
  body: { ...typography.body, color: colors.textSecondary, textAlign: 'center' as const },
  error: { ...typography.caption, color: colors.error, textAlign: 'center' as const },
  primaryBtn: {
    marginTop: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center' as const,
  },
  primaryBtnDisabled: { opacity: 0.6 },
  primaryBtnText: { ...typography.button, color: colors.textInverse },
  linkBtn: { alignItems: 'center' as const, paddingVertical: spacing.sm },
  linkBtnText: { ...typography.body, color: colors.primary },
}));
