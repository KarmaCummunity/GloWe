// Mapped to spec: FR-FEED-020 AC3. "Publish request" and "publish offer" side by side, for a
// world whose feed lists both directions together (rides, D75); each opens the create form
// preset to the world and direction.
import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { makeUseStyles, spacing } from '@kc/ui';
import { PrimaryButton, SecondaryButton } from '../ui/Buttons';
import { createRouteFor, type CreateCategoryId } from '../../lib/unifiedCreate/createCategories';

export function WorldPublishButtons({ worldSlug }: { readonly worldSlug: CreateCategoryId }) {
  const { t } = useTranslation();
  const router = useRouter();
  const styles = useStyles();
  return (
    <View style={styles.row}>
      <View style={styles.cell}>
        <SecondaryButton
          testID="world-publish-request"
          size="md"
          label={t('donations.worldFeed.publishRequest')}
          onPress={() => router.push(createRouteFor(worldSlug, 'request'))}
          fullWidth
        />
      </View>
      <View style={styles.cell}>
        <PrimaryButton
          testID="world-publish-offer"
          size="md"
          label={t('donations.worldFeed.publishOffer')}
          onPress={() => router.push(createRouteFor(worldSlug, 'give'))}
          fullWidth
        />
      </View>
    </View>
  );
}

const useStyles = makeUseStyles(() => ({
  row: { flexDirection: 'row' as const, gap: spacing.sm, paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  cell: { flex: 1 },
}));
