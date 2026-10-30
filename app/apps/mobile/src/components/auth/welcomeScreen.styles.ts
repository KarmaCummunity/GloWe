import { Platform, type ViewStyle } from 'react-native';
import { makeUseStyles, radius, spacing, typography } from '@kc/ui';
import { rtlTextAlignStart } from '../../lib/rtlTextAlignStart';
import { isLayoutRtl } from '../../lib/rtlLayout';

/**
 * Trailing-edge inset for the absolutely-positioned auth-button icon.
 * Native auto-mirrors `end`; RN-Web ignores `start`/`end` for absolute
 * positioning, so on web we resolve RTL live and emit a physical key.
 */
function authBtnIconCornerEnd(): Pick<ViewStyle, 'left' | 'right' | 'end'> {
  if (Platform.OS !== 'web') return { end: spacing.lg };
  return isLayoutRtl() ? { left: spacing.lg } : { right: spacing.lg };
}

// Welcome / sign-in entry styles — theme-aware so the warm cream/white surfaces
// flip to warm-dark counterparts in dark mode.
export const useWelcomeScreenStyles = makeUseStyles(({ colors, isDark }) => ({
  container: {
    flex: 1,
    backgroundColor: colors.surfaceCream,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing['3xl'],
  },

  // ── Hero ──────────────────────────────────────────────────────────────
  hero: {
    alignItems: 'center' as const,
    paddingTop: spacing['4xl'],
    paddingBottom: spacing['2xl'],
  },
  logoRingWrapper: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginBottom: spacing.lg,
  },
  logoRing: {
    position: 'absolute' as const,
    width: 148,
    height: 148,
    borderRadius: 74,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  logo: {
    width: 108,
    height: 108,
    borderRadius: 24,
  },
  appName: {
    ...typography.h1,
    fontSize: 32,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    letterSpacing: -0.5,
  },
  tagline: {
    ...typography.bodyLarge,
    color: colors.textSecondary,
    textAlign: 'center' as const,
  },

  // ── Value props ───────────────────────────────────────────────────────
  valueProps: {
    marginBottom: spacing.lg,
    gap: spacing.base,
  },
  miniAboutWrap: {
    marginBottom: spacing['2xl'],
  },
  valuePropRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
    borderWidth: isDark ? 1 : 0,
    borderColor: isDark ? colors.border : 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: isDark ? 0 : 0.05,
    shadowRadius: 4,
    elevation: isDark ? 0 : 1,
  },
  valuePropIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.primarySurface,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  valuePropText: {
    ...typography.body,
    color: colors.textPrimary,
    flex: 1,
    textAlign: rtlTextAlignStart,
    fontWeight: '500' as const,
  },

  // ── Buttons ───────────────────────────────────────────────────────────
  buttons: {
    gap: spacing.sm,
  },
  authBtn: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    height: 56,
    borderRadius: radius.xl,
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  authBtnIconWrap: {
    position: 'absolute' as const,
    ...authBtnIconCornerEnd(),
    width: 24,
    height: 24,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  authBtnText: {
    ...typography.button,
    fontSize: 16,
    textAlign: 'center' as const,
  },
  authBtnDisabled: { opacity: 0.6 },

  // Google: surface card with hairline (matches surface in both modes)
  googleBtn: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0 : 0.06,
    shadowRadius: 6,
    elevation: isDark ? 0 : 2,
  },
  googleBtnText: { color: colors.textPrimary },
  googleGLetter: {
    fontSize: 18,
    fontWeight: '700' as const,
    // Google blue stays the same in both modes — brand-locked.
    color: '#4285F4',
  },

  // Apple: brand-locked black; on dark mode invert so it doesn't disappear.
  appleBtn: { backgroundColor: isDark ? '#FFFFFF' : '#000000' },
  appleBtnText: { color: isDark ? '#000000' : '#FFFFFF' },

  // Guest: ghost
  guestBtn: {
    marginTop: spacing.xs,
    alignItems: 'center' as const,
    paddingVertical: spacing.sm,
  },
  guestBtnText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  emailEntryText: {
    ...typography.body,
    color: colors.primary,
    textDecorationLine: 'underline' as const,
  },

  oauthDividerRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.sm,
    marginVertical: spacing.lg,
  },
  oauthDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  oauthDividerText: {
    ...typography.caption,
    color: colors.textSecondary,
  },

  // ── Legal ─────────────────────────────────────────────────────────────
  legal: {
    ...typography.caption,
    color: colors.textDisabled,
    textAlign: 'center' as const,
    marginTop: spacing.xl,
    lineHeight: 18,
  },
}));
