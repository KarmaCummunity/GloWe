import '../src/lib/polyfills';
import { initSentry } from '../src/lib/observability/sentry';
import { initPosthog } from '../src/lib/observability/posthog';
void initSentry();
void initPosthog();
import { startMark, finishMark } from '../src/lib/observability/perfMarks';
startMark('app.cold_start');
import '../src/i18n';
import i18n from '../src/i18n';
import React, { useEffect } from 'react';
import { RevenueCatSync } from '../src/services/purchases/RevenueCatSync';
import { Stack } from 'expo-router';
import { I18nManager, Platform } from 'react-native';
import {
  isRtlLanguage,
  applyLayoutDirection,
  loadStoredLanguageAsync,
  reloadApp,
  type AppLanguage,
} from '../src/i18n/language';
import '../src/lib/webDocumentBootstrap';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { queryClient, persistOptions } from '../src/lib/queryPersist';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useTheme } from '@kc/ui';
import { ShellWithResponsiveChrome } from '../src/components/shell/ShellWithResponsiveChrome';
import { AppThemeProvider } from '../src/components/AppThemeProvider';
import { NotificationsBridge } from '../src/components/NotificationsBridge';
import { ErrorBoundary } from '../src/components/ErrorBoundary';
import { SoftGateProvider } from '../src/components/OnboardingSoftGate';
import { AuthGate } from '../src/components/AuthGate';
import { useDetailStackScreenOptions } from '../src/navigation/detailStackScreenOptions';
import { rootStackGestureEnabled, rootStackScreenAnimation } from '../src/navigation/rootStackAnimation';
import { ConfigErrorScreen } from '../src/components/ConfigErrorScreen';
import { isSupabaseConfigured } from '../src/lib/supabasePublicConfig';
import { DevBanner } from '../src/components/DevBanner';
import { LegalConsentGate } from '../src/components/legal/LegalConsentGate';
import { ModalStackProvider } from '../src/components/legal/useActiveModalStack';
import { useMeRealtime } from '../src/hooks/useMeRealtime';
import { useOnlinePresenceLifecycle } from '../src/hooks/useOnlinePresence';
import { useCoreLoopReturnVisit } from '../src/hooks/useCoreLoopReturnVisit';
import { NavigationBar } from 'expo-navigation-bar';

function MeRealtimeMount() {
  useMeRealtime();
  useOnlinePresenceLifecycle();
  useCoreLoopReturnVisit();
  return null;
}

void SplashScreen.preventAutoHideAsync();


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
      <NavigationBar style={isDark ? 'dark' : 'light'} />
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
              <Stack.Screen
                name="notifications/inbox"
                options={{ ...detailStackScreenOptions, headerTitle: i18n.t('notifications.inboxTitle') }}
              />
              <Stack.Screen name="matches" options={{ ...detailStackScreenOptions, headerTitle: i18n.t('matches.title') }} />
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
              <Stack.Screen name="chat/index" options={{ headerShown: true }} />
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
            <RevenueCatSync />
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
