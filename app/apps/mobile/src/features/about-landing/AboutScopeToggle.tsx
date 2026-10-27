import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { makeUseStyles, typography, spacing, radius } from '@kc/ui';
import { useTranslation } from 'react-i18next';
import { useAboutContentScope } from './AboutContentScopeContext';
import { aboutRtlText, aboutRtlRow } from './aboutWebRtlStyle';

export interface AboutScopeToggleProps {
  /** Shown in accessibilityLabel alongside the option name. */
  readonly sectionA11yName: string;
}

export function AboutScopeToggle({ sectionA11yName }: AboutScopeToggleProps) {
  const { t } = useTranslation();
  const styles = useAboutScopeToggleStyles();
  const { scope, setScope } = useAboutContentScope();

  return (
    <View style={styles.wrap} accessibilityRole="summary">
      <View style={styles.track}>
        <Pressable
          style={[styles.pill, scope === 'mvp' && styles.pillOn]}
          onPress={() => setScope('mvp')}
          accessibilityRole="button"
          accessibilityState={{ selected: scope === 'mvp' }}
          accessibilityLabel={`${sectionA11yName}: ${t('aboutContent.scopeToggleMvp')}`}
        >
          <Text style={[styles.pillText, scope === 'mvp' && styles.pillTextOn]}>
            {t('aboutContent.scopeToggleMvp')}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.pill, scope === 'vision' && styles.pillOnVision]}
          onPress={() => setScope('vision')}
          accessibilityRole="button"
          accessibilityState={{ selected: scope === 'vision' }}
          accessibilityLabel={`${sectionA11yName}: ${t('aboutContent.scopeToggleVision')}`}
        >
          <Text style={[styles.pillText, scope === 'vision' && styles.pillTextOn]}>
            {t('aboutContent.scopeToggleVision')}
          </Text>
        </Pressable>
      </View>
      <Text style={styles.hint}>{t('aboutContent.scopeToggleHint')}</Text>
    </View>
  );
}

const useAboutScopeToggleStyles = makeUseStyles(({ colors }) => ({
  wrap: { gap: spacing.sm, marginBottom: spacing.md },
  track: {
    flexDirection: aboutRtlRow,
    gap: spacing.xs,
    padding: spacing.xs,
    borderRadius: radius.lg,
    backgroundColor: colors.primarySurface,
    borderWidth: 1,
    borderColor: colors.primaryLight,
  },
  pill: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillOn: {
    backgroundColor: colors.primary,
    shadowColor: colors.primaryDark,
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  pillOnVision: {
    backgroundColor: colors.secondary,
    shadowColor: colors.secondary,
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  pillText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '700',
    ...aboutRtlText,
  },
  pillTextOn: { color: colors.textInverse },
  hint: {
    ...typography.caption,
    color: colors.textSecondary,
    ...aboutRtlText,
    lineHeight: 20,
  },
}));
