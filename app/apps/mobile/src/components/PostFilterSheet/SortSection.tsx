import React from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { FeedSortOrder } from '@kc/domain';
import { makeUseStyles, spacing, typography, Text } from '@kc/ui';
import { Chip } from './Chip';
import { CityPicker } from '../CityPicker';
import { rtlTextAlignStart } from '../../lib/rtlTextAlignStart';

interface SortSectionProps {
  sortOrder: FeedSortOrder;
  proximitySortCity: { id: string; name: string } | null;
  onSortOrderChange: (s: FeedSortOrder) => void;
  onProximitySortCityChange: (c: { id: string; name: string } | null) => void;
}

const SORT_KEYS: Record<FeedSortOrder, string> = {
  newest: 'filters.sortNewest',
  oldest: 'filters.sortOldest',
  distance: 'filters.sortDistance',
  personalized: 'filters.sortPersonalized',
};

const SORT_ORDER_ENTRIES: FeedSortOrder[] = ['newest', 'personalized', 'oldest', 'distance'];

export function SortSection({
  sortOrder,
  proximitySortCity,
  onSortOrderChange,
  onProximitySortCityChange,
}: SortSectionProps) {
  const { t } = useTranslation();
  const styles = useSortSectionStyles();
  return (
    <View style={styles.section}>
      <Text style={styles.title}>{t('filters.sectionSort')}</Text>
      <View style={styles.row}>
        {SORT_ORDER_ENTRIES.map((s) => (
          <Chip
            key={s}
            label={t(SORT_KEYS[s])}
            active={sortOrder === s}
            onPress={() => onSortOrderChange(s)}
          />
        ))}
      </View>
      {sortOrder === 'distance' && (
        <View style={styles.cityWrap}>
          <Text style={styles.subLabel}>{t('filters.sortDistanceCenterHint')}</Text>
          <CityPicker value={proximitySortCity} onChange={onProximitySortCityChange} />
        </View>
      )}
    </View>
  );
}

const useSortSectionStyles = makeUseStyles(({ colors }) => ({
  section: { gap: spacing.xs, marginBottom: spacing.md },
  title: { ...typography.label, color: colors.textPrimary, textAlign: rtlTextAlignStart },
  subLabel: { ...typography.caption, color: colors.textSecondary, textAlign: rtlTextAlignStart },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'flex-end' },
  cityWrap: { gap: spacing.xs, marginTop: spacing.sm },
}));
