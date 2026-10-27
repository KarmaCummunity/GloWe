// Email verification landing route — FR-AUTH-006 (MVP gate).
// Receives `?token_hash=...&type=signup` from Supabase's confirmation URL,
// exchanges the token for a session, and lets AuthGate route to onboarding/tabs.
// Sibling of auth/callback.tsx (OAuth code exchange).
// docs/SSOT/spec/01_auth_and_onboarding.md
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Text, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { makeUseStyles, spacing, typography, useTheme } from '@kc/ui';
import { isAuthError } from '@kc/application';
import { getVerifyEmailUseCase } from '../../src/services/authComposition';
import { useAuthStore } from '../../src/store/authStore';
import { mapAuthErrorToHebrew } from '../../src/services/authMessages';

export default function AuthVerifyScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ token_hash?: string; type?: string }>();
  const setSession = useAuthStore((s) => s.setSession);
  const [error, setError] = useState<string | null>(null);

  const tokenHash = typeof params.token_hash === 'string' ? params.token_hash : undefined;

  useEffect(() => {
    if (!tokenHash) {
      setError(t('auth.verifyInvalidLink'));
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const { session } = await getVerifyEmailUseCase().execute({ tokenHash });
        if (cancelled) return;
        setSession(session);
        if (
          Platform.OS === 'web' &&
          typeof window !== 'undefined' &&
          window.opener &&
          !window.opener.closed
        ) {
          window.close();
        }
      } catch (err) {
        if (cancelled) return;
        const msg = isAuthError(err)
          ? mapAuthErrorToHebrew(err.code)
          : t('auth.verifyExpired');
        setError(msg);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tokenHash, setSession, t]);

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>{t('auth.verifyFailedTitle')}</Text>
        <Text style={styles.body}>{error}</Text>
        <TouchableOpacity style={styles.btn} onPress={() => router.replace('/(auth)/sign-in')}>
          <Text style={styles.btnText}>{t('auth.backToSignInCta')}</Text>
        </TouchableOpacity>
      </View>
    );
  }
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.body}>{t('auth.verifyingProgress')}</Text>
    </View>
  );
}

const useStyles = makeUseStyles(({ colors, isDark }) => ({
  center: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: colors.background, paddingHorizontal: spacing.xl, gap: spacing.md,
  },
  title: { ...typography.h2, color: colors.textPrimary, textAlign: 'center' },
  body: { ...typography.body, color: colors.textSecondary, textAlign: 'center' },
  btn: {
    marginTop: spacing.lg, backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: 12,
  },
  btnText: { ...typography.button, color: colors.textInverse },
}));
