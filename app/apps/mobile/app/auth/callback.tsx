// OAuth redirect landing route. The provider redirects here with `?code=...`; we
// exchange the code for a session, store it, and continue to the app shell.
// Mapped to SRS: FR-AUTH-003 / FR-AUTH-007 (Google path completion).
// AuthGate in `app/_layout.tsx` whitelists this route so unauth users can reach it.
// docs/SSOT/spec/01_auth_and_onboarding.md
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Text, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { makeUseStyles, spacing, typography, useTheme } from '@kc/ui';
import { isAuthError } from '@kc/application';
import { exchangeOAuthCode } from '../../src/services/authComposition';
import { useAuthStore } from '../../src/store/authStore';
import { mapAuthErrorToHebrew } from '../../src/services/authMessages';

export default function AuthCallbackScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const { t } = useTranslation();
  const params = useLocalSearchParams<{
    code?: string;
    error?: string;
    error_description?: string;
  }>();
  const setSession = useAuthStore((s) => s.setSession);
  const [error, setError] = useState<string | null>(null);

  const code = typeof params.code === 'string' ? params.code : undefined;
  const oauthError = typeof params.error === 'string' ? params.error : undefined;
  const oauthErrorDesc =
    typeof params.error_description === 'string' ? params.error_description : undefined;

  useEffect(() => {
    if (oauthError) {
      setError(oauthErrorDesc || oauthError);
      return;
    }
    if (!code) {
      setError(t('auth.callbackInvalidLink'));
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const session = await exchangeOAuthCode(code);
        if (cancelled) return;
        setSession(session);
        // On web the OAuth provider redirects this route inside a popup window
        // (window.opener !== null). Supabase persists the session to localStorage
        // during the exchange, so the parent window's onAuthStateChange listener
        // (subscribeToSession in app/_layout.tsx) picks it up via the storage
        // event. Closing the popup hands control back to the parent, which then
        // routes to (onboarding) / (tabs) based on onboarding_state.
        if (
          Platform.OS === 'web' &&
          typeof window !== 'undefined' &&
          window.opener &&
          !window.opener.closed
        ) {
          window.close();
          return;
        }
        // Native in-app browser and same-tab web fallthrough: AuthGate routes us.
      } catch (err) {
        if (cancelled) return;
        const msg = isAuthError(err)
          ? mapAuthErrorToHebrew(err.code)
          : t('auth.callbackGenericError');
        setError(msg);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code, oauthError, oauthErrorDesc, router, setSession, t]);

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>{t('auth.callbackFailedTitle')}</Text>
        <Text style={styles.body}>{error}</Text>
        <TouchableOpacity style={styles.btn} onPress={() => router.replace('/(auth)')}>
          <Text style={styles.btnText}>{t('auth.backToSignInCta')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.body}>{t('auth.callbackCompleting')}</Text>
    </View>
  );
}

const useStyles = makeUseStyles(({ colors, isDark }) => ({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  title: { ...typography.h2, color: colors.textPrimary, textAlign: 'center' },
  body: { ...typography.body, color: colors.textSecondary, textAlign: 'center' },
  btn: {
    marginTop: spacing.lg,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 12,
  },
  btnText: { ...typography.button, color: colors.textInverse },
}));
