import React from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  ALL_CATEGORIES,
  type Category,
  type FeedStatusFilter,
  type ItemCondition,
  type PostType,
} from '@kc/domain';
import { makeUseStyles, spacing, typography, Text } from '@kc/ui';
import { Chip } from '../ui/Chip';
import { rtlTextAlignStart } from '../../lib/rtlTextAlignStart';

interface FiltersSectionProps {
  type: PostType | null;
  categories: Category[];
  itemConditions: ItemCondition[];
  statusFilter: FeedStatusFilter;
  followersOnly: boolean;
  onTypeChange: (t: PostType | null) => void;
  onCategoriesChange: (c: Category[]) => void;
  onItemConditionsChange: (i: ItemCondition[]) => void;
  onStatusFilterChange: (s: FeedStatusFilter) => void;
  onFollowersOnlyChange: (v: boolean) => void;
}

const ITEM_CONDITION_KEYS: Record<ItemCondition, string> = {
  New: 'filters.conditionNew',
  LikeNew: 'filters.conditionLikeNew',
  Good: 'filters.conditionGood',
  Fair: 'filters.conditionFair',
  Damaged: 'filters.conditionDamaged',
};

const STATUS_KEYS: Record<FeedStatusFilter, string> = {
  all: 'filters.all',
  open: 'filters.statusOpenOnly',
  closed: 'filters.statusClosedOnly',
};

const ITEM_CONDITIONS: ItemCondition[] = ['New', 'LikeNew', 'Good', 'Fair', 'Damaged'];

function toggleInArray<T>(arr: T[], value: T): T[] {
  return arr.includes(value) ? arr.filter((x) => x !== value) : [...arr, value];
}

export function FiltersSection({
  type,
  categories,
  itemConditions,
  statusFilter,
  followersOnly,
  onTypeChange,
  onCategoriesChange,
  onItemConditionsChange,
  onStatusFilterChange,
  onFollowersOnlyChange,
}: FiltersSectionProps) {
  const { t } = useTranslation();
  const styles = useFiltersSectionStyles();
  return (
    <>
      <View style={styles.section}>
        <Text style={styles.title}>{t('filters.sectionType')}</Text>
        <View style={styles.row}>
          <Chip size="sm" label={t('filters.all')} selected={type === null} onPress={() => onTypeChange(null)} />
          <Chip size="sm" label={t('filters.typeGive')} selected={type === 'Give'} onPress={() => onTypeChange('Give')} />
          <Chip size="sm" label={t('filters.typeRequest')} selected={type === 'Request'} onPress={() => onTypeChange('Request')} />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.title}>{t('filters.sectionCategory')}</Text>
        <View style={styles.row}>
          <Chip
            size="sm"
            label={t('filters.all')}
            selected={categories.length === 0}
            onPress={() => onCategoriesChange([])}
          />
          {ALL_CATEGORIES.map((c) => (
            <Chip
              size="sm"
              key={c}
              label={t(`post.category.${c}`)}
              selected={categories.includes(c)}
              onPress={() => onCategoriesChange(toggleInArray(categories, c))}
            />
          ))}
        </View>
      </View>

      {type === 'Give' && (
        <View style={styles.section}>
          <Text style={styles.title}>{t('filters.sectionCondition')}</Text>
          <View style={styles.row}>
            <Chip
              size="sm"
              label={t('filters.all')}
              selected={itemConditions.length === 0}
              onPress={() => onItemConditionsChange([])}
            />
            {ITEM_CONDITIONS.map((i) => (
              <Chip
                size="sm"
                key={i}
                label={t(ITEM_CONDITION_KEYS[i])}
                selected={itemConditions.includes(i)}
                onPress={() => onItemConditionsChange(toggleInArray(itemConditions, i))}
              />
            ))}
          </View>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.title}>{t('filters.sectionStatus')}</Text>
        <View style={styles.row}>
          {(['all', 'open', 'closed'] as FeedStatusFilter[]).map((s) => (
            <Chip
              size="sm"
              key={s}
              label={t(STATUS_KEYS[s])}
              selected={statusFilter === s}
              onPress={() => onStatusFilterChange(s)}
            />
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.title}>{t('filters.sectionSource')}</Text>
        <View style={styles.row}>
          <Chip
            size="sm"
            label={t('filters.all')}
            selected={!followersOnly}
            onPress={() => onFollowersOnlyChange(false)}
          />
          <Chip
            size="sm"
            label={t('filters.followersOnly')}
            selected={followersOnly}
            onPress={() => onFollowersOnlyChange(true)}
          />
        </View>
      </View>
    </>
  );
}

const useFiltersSectionStyles = makeUseStyles(({ colors }) => ({
  section: { gap: spacing.xs, marginBottom: spacing.md },
  title: { ...typography.label, color: colors.textPrimary, textAlign: rtlTextAlignStart },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'flex-end' },
}));
