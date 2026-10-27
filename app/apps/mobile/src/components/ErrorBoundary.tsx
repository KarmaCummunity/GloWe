// Top-level error boundary. Mapped to TD-33 (AUDIT-P2-10).
// Catches unexpected throws from descendant components so the app shell
// renders a recoverable fallback instead of unmounting to a white screen.
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { makeUseStyles, typography, spacing, radius } from '@kc/ui';

type Props = { children: React.ReactNode };
type State = { error: Error | null };

function ErrorBoundaryFallback({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const styles = useStyles();
  const { t } = useTranslation();
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('errorBoundary.title')}</Text>
      <Text style={styles.body}>{t('errorBoundary.body')}</Text>
      {__DEV__ ? <Text style={styles.errMessage}>{error.message}</Text> : null}
      <TouchableOpacity style={styles.cta} onPress={onRetry} accessibilityRole="button">
        <Text style={styles.ctaText}>{t('general.retry')}</Text>
      </TouchableOpacity>
    </View>
  );
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    if (__DEV__) console.error('ErrorBoundary caught:', error, info.componentStack);
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { getSentryIfInit } = require('../lib/observability/sentry');
      const Sentry = getSentryIfInit();
      if (Sentry) {
        Sentry.captureException(error, { extra: { componentStack: info.componentStack ?? null } });
      }
    } catch { /* never crash the boundary */ }
  }

  reset = (): void => this.setState({ error: null });

  render(): React.ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;
    return <ErrorBoundaryFallback error={error} onRetry={this.reset} />;
  }
}

const useStyles = makeUseStyles(({ colors, isDark }) => ({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.base,
  },
  title: { ...typography.h1, color: colors.textPrimary, textAlign: 'center' },
  body: { ...typography.body, color: colors.textSecondary, textAlign: 'center' },
  errMessage: { ...typography.caption, color: colors.textDisabled, textAlign: 'center' },
  cta: {
    height: 52,
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.base,
  },
  ctaText: { ...typography.button, color: colors.textInverse },
}));
