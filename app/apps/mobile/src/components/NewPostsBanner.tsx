// NewPostsBanner — sticky "↑ N new posts" pill above the feed. Tap to
// refresh + scroll to top. Mapped to FR-FEED-009 AC2 (no silent injection
// into the user's scroll position).

import React from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { makeUseStyles, radius, spacing, typography, useTheme, Text } from '@kc/ui';

interface NewPostsBannerProps {
  count: number;
  onPress: () => void;
}

export function NewPostsBanner({ count, onPress }: NewPostsBannerProps) {
  const styles = useNewPostsBannerStyles();
  const { colors } = useTheme();
  const { t } = useTranslation();
  if (count <= 0) return null;
  const label = count === 1 ? t('feed.newPostsOne') : t('feed.newPostsMany', { count });
  return (
    <View style={styles.wrap}>
      <Pressable style={styles.pill} onPress={onPress} accessibilityRole="button" accessibilityLabel={label}>
        <Ionicons name="arrow-up" size={16} color={colors.textInverse} />
        <Text style={styles.text}>{label}</Text>
      </Pressable>
    </View>
  );
}

const useNewPostsBannerStyles = makeUseStyles(({ colors, isDark }) => ({
  wrap: { alignItems: 'center' as const, paddingVertical: spacing.sm },
  pill: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.xs,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: isDark ? 0 : 0.25,
    shadowRadius: 10,
    elevation: isDark ? 0 : 4,
  },
  text: { ...typography.caption, color: colors.textInverse, fontWeight: '700' as const },
}));
