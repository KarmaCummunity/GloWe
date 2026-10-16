import React, { useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Platform, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { isAuthError } from '@kc/application';
import { useTheme } from '@kc/ui';
import { useAuthStore } from '../../store/authStore';
import {
  getOAuthRedirectUri,
  getSignInWithGoogleUseCase,
  getSignInWithAppleUseCase,
  redirectToGoogleSignInWeb,
} from '../../services/authComposition';
import { mapAuthErrorToHebrew } from '../../services/authMessages';
import { NotifyModal } from '../NotifyModal';
import { useWelcomeScreenStyles } from './welcomeScreen.styles';

/** Google + Apple (iOS) — FR-AUTH-002 / FR-AUTH-004; shared by email sign-in/up screens. */
export function AuthSocialSignInBlock() {
  const styles = useWelcomeScreenStyles();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busyRef = useRef(false);

  const finish = () => router.replace('/(tabs)');

  const handleGoogle = async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setGoogleLoading(true);
    try {
      if (Platform.OS === 'web') {
        await redirectToGoogleSignInWeb();
        return;
      }
      const { session } = await getSignInWithGoogleUseCase().execute({
        redirectTo: getOAuthRedirectUri(),
      });
      setSession(session);
      finish();
    } catch (err) {
      if (isAuthError(err) && err.message === 'oauth_dismissed') return;
      const message = isAuthError(err) ? mapAuthErrorToHebrew(err.code) : t('auth.networkError');
      setError(message);
    } finally {
      setGoogleLoading(false);
      busyRef.current = false;
    }
  };

  const handleApple = async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setAppleLoading(true);
    try {
      const { session } = await getSignInWithAppleUseCase().execute();
      setSession(session);
      finish();
    } catch (err) {
      if (isAuthError(err) && err.message === 'apple_dismissed') return;
      const message = isAuthError(err) ? mapAuthErrorToHebrew(err.code) : t('auth.networkError');
      setError(message);
    } finally {
      setAppleLoading(false);
      busyRef.current = false;
    }
  };

  return (
    <>
      <View style={styles.oauthDividerRow}>
        <View style={styles.oauthDividerLine} />
        <Text style={styles.oauthDividerText}>{t('auth.orDivider')}</Text>
        <View style={styles.oauthDividerLine} />
      </View>
      {Platform.OS === 'ios' ? (
        <TouchableOpacity
          style={[styles.authBtn, styles.appleBtn, appleLoading && styles.authBtnDisabled]}
          onPress={handleApple}
          disabled={appleLoading || googleLoading}
        >
          {appleLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Text style={[styles.authBtnText, styles.appleBtnText]}>{t('auth.continueWithApple')}</Text>
              <Ionicons name="logo-apple" size={20} color="#FFFFFF" />
            </>
          )}
        </TouchableOpacity>
      ) : null}
      <TouchableOpacity
        style={[styles.authBtn, styles.googleBtn, googleLoading && styles.authBtnDisabled]}
        onPress={handleGoogle}
        disabled={googleLoading || appleLoading}
      >
        {googleLoading ? (
          <ActivityIndicator color={colors.textPrimary} />
        ) : (
          <>
            <Text style={[styles.authBtnText, styles.googleBtnText]}>{t('auth.continueWithGoogle')}</Text>
            <Text style={styles.googleGLetter}>G</Text>
          </>
        )}
      </TouchableOpacity>
      <NotifyModal
        visible={error !== null}
        title={t('auth.signInFailedTitle')}
        message={error ?? ''}
        onDismiss={() => setError(null)}
      />
    </>
  );
}
