import { useGlobalSearchParams, useSegments, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing } from '@kc/ui';
import { useAuthStore } from '../store/authStore';
import { parseTruthyQueryParam } from '../lib/query/parseTruthyQueryParam';
import { isAboutMarketingPath } from './aboutMarketingPaths';

// Effective visual height of the floating-pill bar above the safe area
// (pill 64 + one 12 floating-offset). Consumers that position screen-local
// elements like FABs already add `insets.bottom` themselves, so the inset
// itself is not folded into this constant.
const TAB_BAR_HEIGHT = 76;

/** Whether the global shell should render the bottom tab bar + reserve padding. */
export function useShellTabBarVisibility(): boolean {
  const segments = useSegments() as string[];
  const pathname = usePathname() ?? '';
  const params = useGlobalSearchParams<{ hideBottomBar?: string | string[] }>();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);

  const head = segments[0] as string | undefined;
  const isAuthLanding = head === 'auth' && (segments[1] === 'callback' || segments[1] === 'verify');
  // Chat conversation screen renders its own message composer at the bottom
  // edge of the viewport, so the floating pill would overlap the input. The
  // list screen at `chat` (segments[1] is undefined) keeps the bar — only the
  // dynamic `[id]` route hides it.
  const onChatConversation = head === 'chat' && segments[1] === '[id]';
  const onAboutSurface = isAboutMarketingPath(pathname);
  const onResearchSurface = head === 'research';
  const hideBottomBar = onAboutSurface && parseTruthyQueryParam(params.hideBottomBar);

  const base =
    !isLoading &&
    isAuthenticated &&
    head !== '(auth)' &&
    head !== '(guest)' &&
    head !== '(onboarding)' &&
    !isAuthLanding &&
    !onChatConversation &&
    !onResearchSurface;

  return base && !hideBottomBar;
}

export function shellTabBarHeightPx(visible: boolean): number {
  return visible ? TAB_BAR_HEIGHT : 0;
}

/** Bottom inset for scroll content above the floating shell tab bar. */
export function useShellTabBarScrollInset(extraBottom: number = spacing.lg): number {
  const insets = useSafeAreaInsets();
  return extraBottom + shellTabBarHeightPx(useShellTabBarVisibility()) + insets.bottom;
}
