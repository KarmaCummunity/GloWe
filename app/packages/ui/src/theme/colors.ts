// ─────────────────────────────────────────────
// Color Tokens — Karma Community Design System
// ─────────────────────────────────────────────
//
// Two palettes share the same token shape so the rest of the app can swap
// at runtime via `useTheme()` (see `theme/ThemeContext.tsx`). The static
// `colors` export keeps pointing at the light palette as the legacy default
// for files that haven't migrated to the hook yet (tracked under TD-199).

export interface ColorPalette {
  // Brand — warm orange, symbolizes generosity (light `primary` darkened for AA, D66)
  primary: string;
  primaryDark: string;
  primaryLight: string;
  primarySurface: string;

  // Secondary — navy from the logo (K and globe ring), D66
  secondary: string;
  secondaryLight: string;

  // Semantic
  success: string;
  successLight: string;
  error: string;
  errorLight: string;
  warning: string;
  warningLight: string;
  info: string;
  infoLight: string;

  // Backgrounds — `surfaceCream` is a semantic alias for the app-wide backdrop;
  // primitives that intend the backdrop explicitly stay readable even if
  // `background` drifts later.
  background: string;
  surfaceCream: string;
  surface: string;
  surfaceRaised: string;

  // Borders
  border: string;
  borderStrong: string;

  // Text
  textPrimary: string;
  textSecondary: string;
  textDisabled: string;
  textInverse: string;

  // Tab bar & navigation
  tabActive: string;
  tabInactive: string;
  // Glass pill background (TabBar). On web, layered with backdrop-filter blur.
  tabBarGlass: string;

  // Post type tags
  giveTag: string;
  giveTagBg: string;
  requestTag: string;
  requestTagBg: string;

  // Visibility badges
  publicBadge: string;
  followersOnlyBadge: string;
  onlyMeBadge: string;

  // Misc
  overlay: string;
  skeleton: string;
  shadow: string;
}

export const lightColors: ColorPalette = {
  primary: '#C2410C',  // AA: 5.2:1 with white text (D66); vivid #F97316 stays for decoration
  primaryDark: '#9A3412',  // pressed state
  primaryLight: '#FED7AA',
  primarySurface: '#FFF7ED',

  secondary: '#203050',  // logo navy (D66)
  secondaryLight: '#E3E8F2',

  success: '#22C55E',
  successLight: '#DCFCE7',
  error: '#DC2626',  // AA on white
  errorLight: '#FEE2E2',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  info: '#3B82F6',
  infoLight: '#DBEAFE',

  background: '#FFFBF7',
  surfaceCream: '#FFFBF7',
  surface: '#FFFFFF',
  surfaceRaised: '#FFFFFF',

  border: '#E5E7EB',
  borderStrong: '#D1D5DB',

  textPrimary: '#111827',
  textSecondary: '#6B7280',
  textDisabled: '#9CA3AF',
  textInverse: '#FFFFFF',

  tabActive: '#C2410C',
  tabInactive: '#7A818C',  // 3.9:1 on white (UI glyph AA)
  tabBarGlass: 'rgba(255, 255, 255, 0.72)',

  giveTag: '#C2410C',
  giveTagBg: '#FFF7ED',
  requestTag: '#FFF7ED',
  requestTagBg: '#C2410C',

  publicBadge: '#6B7280',
  followersOnlyBadge: '#8B5CF6',
  onlyMeBadge: '#6B7280',

  overlay: 'rgba(0, 0, 0, 0.5)',
  skeleton: '#F3F4F6',
  shadow: '#000000',
};

// Warm-tinted dark palette — keeps the community/karma feel by avoiding pure
// black and instead using warm-leaning dark neutrals. Orange primary stays
// (it has strong contrast against dark surfaces); the "primarySurface" tint
// flips to a deep orange-brown so brand chips remain readable.
export const darkColors: ColorPalette = {
  primary: '#FB923C',          // slightly lighter than light-mode primary so it pops on dark
  primaryDark: '#F97316',
  primaryLight: '#7C2D12',     // used for soft-brand tints on dark surfaces
  primarySurface: '#2A1810',   // deep warm brown for brand-chip backgrounds

  secondary: '#A5B8DC',  // logo navy, lifted for dark surfaces
  secondaryLight: '#1F2E4E',

  // Semantic — lifted toward HSL "brighter" variants for AA contrast on dark
  success: '#4ADE80',
  successLight: '#14532D',
  error: '#F87171',
  errorLight: '#7F1D1D',
  warning: '#FBBF24',
  warningLight: '#78350F',
  info: '#60A5FA',
  infoLight: '#1E3A8A',

  // Backgrounds — warm-tinted neutrals (slight orange-brown bias instead of
  // bluish slate) so the app keeps its warm identity in dark mode.
  background: '#15110D',       // page backdrop — warm near-black
  surfaceCream: '#15110D',
  surface: '#1F1A14',          // cards / sections
  surfaceRaised: '#2A231B',    // modals, popovers, raised affordances

  border: '#332B22',
  borderStrong: '#48402F',

  textPrimary: '#F5EFE6',      // off-white with warm cream cast
  textSecondary: '#B8AFA1',
  textDisabled: '#766C5D',
  textInverse: '#15110D',

  tabActive: '#FB923C',
  tabInactive: '#766C5D',
  // Glass pill is darker + a bit translucent so the underlying content (warm
  // brown bg) reads through the blur on web.
  tabBarGlass: 'rgba(31, 26, 20, 0.78)',

  giveTag: '#FB923C',
  giveTagBg: '#2A1810',
  requestTag: '#2A1810',
  requestTagBg: '#FB923C',

  publicBadge: '#B8AFA1',
  followersOnlyBadge: '#A78BFA',
  onlyMeBadge: '#B8AFA1',

  overlay: 'rgba(0, 0, 0, 0.65)',
  skeleton: '#2A231B',
  shadow: '#000000',
};

export type ColorToken = keyof ColorPalette;

// Legacy export — files that haven't migrated to `useTheme()` keep importing
// `colors` and silently render in light. Tracked under TD-199 (FE).
export const colors: ColorPalette = lightColors;
