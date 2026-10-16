import { initSentry } from '../src/lib/observability/sentry';
initSentry();
import { startMark, finishMark } from '../src/lib/observability/perfMarks';
startMark('app.cold_start');
import '../src/i18n';
import i18n from '../src/i18n';
import React, { useEffect } from 'react';
import { Stack, usePathname } from 'expo-router';
import { I18nManager, Platform } from 'react-native';
import {
  getInitialLanguage,
  isRtlLanguage,
  applyLayoutDirection,
  loadStoredLanguageAsync,
  reloadApp,
  type AppLanguage,
} from '../src/i18n/language';
// Web parity for `I18nManager.forceRTL`: native flips the layout, but on RN-Web
// nothing reaches the DOM unless we set `dir`/`lang` on the html element. We do
// this at module load (not inside an effect) so the first paint is already RTL.
// Title + favicon overrides live here too: with `web.output: "single"` Expo
// builds from a default template that uses `expo.name`, so we can't use a
// `+html.tsx` (those only apply to `static` output).
// Register Service Worker so Chrome/Android installs the app as a proper PWA
// (WebAPK). With a SW present, tapping the home-screen icon activates the
// already-running instance instead of opening a new browser tab.
if (Platform.OS === 'web' && typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}

if (Platform.OS === 'web' && typeof document !== 'undefined') {
  // FR-SETTINGS-018: direction + lang follow the persisted UI language so the
  // first paint is already correct (RTL for Hebrew, LTR for English). Set at
  // module load, before any screen style module reads `isLayoutRtl()`.
  const initialLang = getInitialLanguage();
  document.documentElement.dir = isRtlLanguage(initialLang) ? 'rtl' : 'ltr';
  document.documentElement.lang = initialLang;
  document.title = i18n.t('appName');
  // Expo's prod export injects `<link rel="icon" href="/favicon.ico" />` from
  // `web.favicon`, but the dev server doesn't — inject it here so the tab icon
  // shows during local development too. No-op when the link already exists.
  if (!document.querySelector('link[rel="icon"]')) {
    const link = document.createElement('link');
    link.rel = 'icon';
    link.href = '/favicon.ico';
    document.head.appendChild(link);
  }
  // Lock the mobile-web viewport to device width so the app behaves like a
  // native app: no pinch-zoom, no horizontal pan, no iOS input auto-zoom.
  // Expo's `web.output: "single"` template hard-codes a permissive viewport
  // (`width=device-width, initial-scale=1, shrink-to-fit=no`) and ignores
  // `+html.tsx`, so we patch the tag at runtime.
  let viewportMeta = document.querySelector('meta[name="viewport"]') as HTMLMetaElement | null;
  if (!viewportMeta) {
    viewportMeta = document.createElement('meta');
    viewportMeta.name = 'viewport';
    document.head.appendChild(viewportMeta);
  }
  viewportMeta.content =
    'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover';

  // Belt-and-braces: even with the viewport locked, an absolutely-positioned
  // child with a negative offset (e.g. a decorative blob) can extend the
  // document past the viewport on web. Clip html/body horizontally.
  // RN-Web + `dir=rtl`: also force full viewport width on `#root` (see Screen.tsx).
  document.getElementById('kc-no-horizontal-scroll')?.remove();
  const layoutWebId = 'kc-web-viewport-layout';
  if (!document.getElementById(layoutWebId)) {
    const style = document.createElement('style');
    style.id = layoutWebId;
    style.textContent = `html, body {
  margin: 0;
  width: 100%;
  height: 100%;
  overflow-x: hidden;
  overscroll-behavior-x: none;
  -webkit-text-size-adjust: 100%;
}
#root {
  width: 100%;
  min-width: 100%;
  min-height: 100%;
  display: flex;
  flex: 1;
}`;
    document.head.appendChild(style);
  }

  // iOS Safari (and WebKit-based mobile browsers) zoom the viewport when a
  // focused text control's font-size is under 16px. RN-Web maps TextInput to
  // <input>/<textarea>; cap only on narrow viewports so desktop web typography
  // stays unchanged. Native apps never execute this branch.
  const mwebInputFontId = 'kc-mweb-form-16px-floor';
  if (!document.getElementById(mwebInputFontId)) {
    const style = document.createElement('style');
    style.id = mwebInputFontId;
    style.textContent = `@media (max-width: 767.98px) {
  input:not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="hidden"]),
  textarea,
  select {
    font-size: 16px !important;
  }
}`;
    document.head.appendChild(style);
  }
}
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { queryClient, persistOptions } from '../src/lib/queryPersist';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useTheme } from '@kc/ui';
import { ShellWithResponsiveChrome } from '../src/components/shell/ShellWithResponsiveChrome';
import { AppThemeProvider } from '../src/components/AppThemeProvider';
import { useAuthStore } from '../src/store/authStore';
import { container } from '../src/lib/container';
import {
  useActiveScreenStore,
  installForegroundHandler,
  installBadgeAutoClear,
  useNotificationTapRouting,
  registerCurrentDeviceIfPermitted,
} from '../src/lib/notifications';
import { ErrorBoundary } from '../src/components/ErrorBoundary';
import { SoftGateProvider } from '../src/components/OnboardingSoftGate';
import { AuthGate } from '../src/components/AuthGate';
import { useDetailStackScreenOptions } from '../src/navigation/detailStackScreenOptions';
import { rootStackGestureEnabled, rootStackScreenAnimation } from '../src/navigation/rootStackAnimation';
import { ConfigErrorScreen } from '../src/components/ConfigErrorScreen';
import { isSupabaseConfigured } from '../src/lib/supabasePublicConfig';
import { ensureAndroidNotificationChannel } from '../src/lib/pushSetup';
import { DevBanner } from '../src/components/DevBanner';
import { LegalConsentGate } from '../src/components/legal/LegalConsentGate';
import { ModalStackProvider } from '../src/components/legal/useActiveModalStack';
import { useMeRealtime } from '../src/hooks/useMeRealtime';

function MeRealtimeMount() { useMeRealtime(); return null; }

SplashScreen.preventAutoHideAsync();

function NotificationsBridge(): null {
  const userId = useAuthStore((s) => s.session?.userId ?? null);
  const setRoute = useActiveScreenStore((s) => s.setRoute);

  useNotificationTapRouting();

  useEffect(() => {
    installForegroundHandler();
    installBadgeAutoClear();
    void ensureAndroidNotificationChannel();
  }, []);

  const pathname = usePathname();
  useEffect(() => {
    setRoute(pathname ?? null);
  }, [pathname, setRoute]);

  useEffect(() => {
    if (!userId) return;
    registerCurrentDeviceIfPermitted(userId, { deviceRepo: container.deviceRepo }).catch(
      console.error,
    );
  }, [userId]);

  return null;
}

// Inner wiring lives after AppThemeProvider so screen options that depend on
// the active palette (web html bg, surface backgrounds in screen headers,
// StatusBar style) read fresh values when the user toggles dark mode.
function ThemedRootShell() {
  React.useEffect(() => { finishMark('app.cold_start'); }, []);
  const { colors, isDark } = useTheme();
  const detailStackScreenOptions = useDetailStackScreenOptions();

  React.useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      // Paint html/body with the active surface so the area outside the app
      // root (and any iOS overscroll bounce on mobile-web) matches the theme.
      document.documentElement.style.backgroundColor = colors.background;
      if (document.body) document.body.style.backgroundColor = colors.background;
    }
  }, [colors.background]);

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <DevBanner />
      <NotificationsBridge />
      <AuthGate>
        <ModalStackProvider>
          <LegalConsentGate>
            <SoftGateProvider>
              <ShellWithResponsiveChrome>
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.background },
                // Subtle cross-fade across every platform so screen
                // changes feel like part of the same surface, not a
                // hard hand-off. 220 ms matches the welcome-screen
                // hero entry, giving the whole app one motion vocab.
                animation: rootStackScreenAnimation(),
                animationDuration: Platform.OS === 'web' ? 220 : undefined,
                gestureEnabled: rootStackGestureEnabled,
                fullScreenGestureEnabled: Platform.OS === 'ios',
              }}
            >
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(guest)" />
              <Stack.Screen name="(onboarding)" />
              <Stack.Screen name="(tabs)" />
              {/* FR-ADMIN-011 AC1 — register the admin group at the root so
                  native stack navigation can resolve `/(admin)` targets.
                  Without this, `router.push('/(admin)')` is a no-op on iOS /
                  Android (web URL routing falls back to resolved path). */}
              <Stack.Screen name="(admin)" />
              <Stack.Screen name="auth/callback" />
              <Stack.Screen name="auth/verify" />
              {/* FR-MOD-010 AC4 — terminal screen for blocked accounts. */}
              <Stack.Screen name="account-blocked" options={{ headerShown: true, headerTitle: '', headerBackVisible: false, headerStyle: { backgroundColor: colors.surface } }} />
              <Stack.Screen name="settings" />
              <Stack.Screen name="about" options={{ headerShown: false }} />
              <Stack.Screen name="about-site" options={{ headerShown: false }} />
              {/* FR-RESEARCH-001 — public web survey; no auth shell */}
              <Stack.Screen name="research" options={{ headerShown: false }} />
              <Stack.Screen name="edit-profile" options={{ ...detailStackScreenOptions, headerTitle: i18n.t('settings.editProfileTitle') }} />
              <Stack.Screen name="post/[id]" options={{ ...detailStackScreenOptions, headerTitle: i18n.t('post.detailTitle') }} />
              {/* user/[handle]/* owns its own header via the nested _layout */}
              <Stack.Screen name="user/[handle]" options={{ headerShown: false }} />
              {/* In-screen `ChatConversationHeader` owns the top bar; a native-stack header
                  must stay off so it never sits above the custom bar on web/mobile (taps). */}
              <Stack.Screen name="chat/[id]" options={{ headerShown: false }} />
              {/* chat/index renders its own header inside the screen — disable the Stack one to avoid doubling. */}
              <Stack.Screen name="chat/index" options={{ headerShown: false }} />
            </Stack>
              </ShellWithResponsiveChrome>
            </SoftGateProvider>
          </LegalConsentGate>
        </ModalStackProvider>
      </AuthGate>
    </>
  );
}

function RootLayoutContent() {
  useEffect(() => {
    // FR-SETTINGS-018: keep layout direction aligned with the active UI language.
    // Web resolved its direction at module load from localStorage; here we align
    // I18nManager. Native reconciles the async-persisted preference and reloads
    // once if the reading direction has to flip (RN bakes RTL at load time).
    if (Platform.OS === 'web') {
      applyLayoutDirection(i18n.language === 'en' ? 'en' : 'he');
      return;
    }
    let cancelled = false;
    void (async () => {
      const stored = await loadStoredLanguageAsync();
      if (cancelled) return;
      const desired: AppLanguage = stored ?? (i18n.language === 'en' ? 'en' : 'he');
      const needsReload = I18nManager.isRTL !== isRtlLanguage(desired);
      if (desired !== i18n.language) await i18n.changeLanguage(desired);
      applyLayoutDirection(desired);
      if (needsReload) reloadApp();
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1, width: '100%', alignSelf: 'stretch' }}>
      <SafeAreaProvider>
        <ErrorBoundary>
          <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
            <MeRealtimeMount />
            <AppThemeProvider>
              <ThemedRootShell />
            </AppThemeProvider>
          </PersistQueryClientProvider>
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default function RootLayout() {
  if (!isSupabaseConfigured()) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <ConfigErrorScreen />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }
  return <RootLayoutContent />;
}
