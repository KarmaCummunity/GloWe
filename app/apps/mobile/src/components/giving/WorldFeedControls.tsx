// Mapped to spec: FR-FEED-020 AC2 · docs/spec/04 "World hub template" block 1.
// Top of a giving world's feed: search within the world, the seeker / offerer toggle, the publish
// button of the current mode (opens the create form preset to the world and direction), and
// the subcategory + distance refinements where the world has them.
import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { iconSize, makeUseStyles, radius, spacing, typography, useTheme, Text, TextInput } from '@kc/ui';
import { PrimaryButton } from '../ui/Buttons';
import { BrowseRefineChips } from '../marketplace/BrowseRefineChips';
import { createRouteFor } from '../../lib/unifiedCreate/createCategories';
import { publishDirectionFor, type WorldFeedMode } from '../../lib/worldFeed/worldFeedMode';
import type { useWorldFeed } from '../../hooks/useWorldFeed';

type WorldFeedState = ReturnType<typeof useWorldFeed>;

interface Props {
  readonly worldSlug: string;
  readonly feed: WorldFeedState;
  /** Worlds with subcategories / distance (items, food) show the refinement chips. */
  readonly withRefinements: boolean;
}

export function WorldFeedControls({ worldSlug, feed, withRefinements }: Props) {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useStyles();
  const worldLabel = t(`marketplace.world.${worldSlug}`);
  const publishDirection = publishDirectionFor(feed.mode);

  return (
    <View style={styles.wrap}>
      <View style={styles.search}>
        <Ionicons name="search-outline" size={iconSize.lg} color={colors.textSecondary} />
        <TextInput // brand-guard-allow: world search bar, not a form field (spec 17 §4.1)
          testID="world-feed-search"
          style={styles.searchInput}
          value={feed.query}
          onChangeText={feed.setQuery}
          placeholder={t('donations.worldFeed.searchPlaceholder', { world: worldLabel })}
          placeholderTextColor={colors.textDisabled}
          returnKeyType="search"
          accessibilityLabel={t('donations.worldFeed.searchPlaceholder', { world: worldLabel })}
        />
      </View>

      <View style={styles.toggle} accessibilityRole="radiogroup" accessibilityLabel={t('donations.worldFeed.modeA11y')}>
        <ModeButton mode="seeker" current={feed.mode} onPress={feed.setMode} testID="world-feed-mode-seeker" />
        <ModeButton mode="offerer" current={feed.mode} onPress={feed.setMode} testID="world-feed-mode-offerer" />
      </View>

      <PrimaryButton
        testID="world-feed-publish"
        size="md"
        icon="add-circle-outline"
        label={t(publishDirection === 'request' ? 'donations.worldFeed.publishRequest' : 'donations.worldFeed.publishOffer')}
        onPress={() => router.push(createRouteFor(worldSlug, publishDirection))}
        fullWidth
      />

      {withRefinements && !feed.searching ? (
        <BrowseRefineChips
          worldSlug={worldSlug}
          categoryId={feed.categoryId}
          onCategoryChange={feed.setCategoryId}
          radiusKm={feed.radiusKm}
          onRadiusChange={feed.setRadiusKm}
        />
      ) : null}

      <Text style={styles.sectionTitle}>
        {t(feed.mode === 'seeker' ? 'donations.worldFeed.offersTitle' : 'donations.worldFeed.requestsTitle')}
      </Text>
    </View>
  );
}

interface ModeButtonProps {
  readonly mode: WorldFeedMode;
  readonly current: WorldFeedMode;
  readonly onPress: (mode: WorldFeedMode) => void;
  readonly testID: string;
}

/** One half of the seeker / offerer toggle. */
function ModeButton({ mode, current, onPress, testID }: ModeButtonProps) {
  const { t } = useTranslation();
  const styles = useStyles();
  const on = mode === current;
  return (
    <TouchableOpacity
      testID={testID}
      style={[styles.modeBtn, on && styles.modeBtnOn]}
      onPress={() => onPress(mode)}
      accessibilityRole="radio"
      aria-checked={on}
    >
      <Text style={[styles.modeText, on && styles.modeTextOn]}>{t(`donations.worldFeed.${mode}`)}</Text>
    </TouchableOpacity>
  );
}

const useStyles = makeUseStyles(({ colors, isDark }) => ({
  wrap: { gap: spacing.md, paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  search: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.sm,
    paddingHorizontal: spacing.base,
    borderRadius: radius.lg,
    borderWidth: isDark ? 1 : 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  searchInput: { flex: 1, ...typography.body, color: colors.textPrimary, paddingVertical: spacing.md },
  toggle: {
    flexDirection: 'row' as const,
    borderRadius: radius.lg,
    borderWidth: isDark ? 1 : 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    overflow: 'hidden' as const,
  },
  modeBtn: { flex: 1, alignItems: 'center' as const, paddingVertical: spacing.md },
  modeBtnOn: { backgroundColor: colors.primarySurface },
  modeText: { ...typography.button, color: colors.textSecondary },
  modeTextOn: { color: colors.primary },
  sectionTitle: { ...typography.h4, color: colors.textPrimary },
}));
