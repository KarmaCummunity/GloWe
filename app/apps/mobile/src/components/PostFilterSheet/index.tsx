// PostFilterSheet — bottom-sheet for the Home Feed's sort + filter affordances.
// Mapped to SRS: FR-FEED-003 (text search), FR-FEED-004 (filter modal),
// FR-FEED-005 (persisted state), FR-FEED-006 (distance sort), FR-FEED-018,
// FR-FEED-020 (followers-only scope).
//
// All controls commit immediately to the parent store; the feed refetches in place.

import React, { useCallback } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import type {
  Category,
  FeedSortOrder,
  FeedStatusFilter,
  ItemCondition,
  LocationFilter,
  PostType,
} from '@kc/domain';
import { makeUseStyles, radius, spacing, typography, useTheme } from '@kc/ui';
import { useModalHardwareBack } from '../../hooks/useModalHardwareBack';
import { SortSection } from './SortSection';
import { FiltersSection } from './FiltersSection';
import { LocationFilterSection } from './LocationFilterSection';
import { SearchSection } from './SearchSection';

export interface PostFilterValue {
  type: PostType | null;
  categories: Category[];
  itemConditions: ItemCondition[];
  locationFilter: LocationFilter | null;
  statusFilter: FeedStatusFilter;
  sortOrder: FeedSortOrder;
  proximitySortCity: string | null;
  proximitySortCityName: string | null;
  followersOnly: boolean;
  searchQuery: string;
}

interface PostFilterSheetProps {
  visible: boolean;
  value: PostFilterValue;
  onPatch: (patch: Partial<PostFilterValue>) => void;
  onClear: () => void;
  onClose: () => void;
}

export function PostFilterSheet({
  visible,
  value,
  onPatch,
  onClear,
  onClose,
}: PostFilterSheetProps) {
  const { t } = useTranslation();
  const styles = usePostFilterSheetStyles();
  const { colors } = useTheme();

  const handleSearchQueryChange = useCallback(
    (q: string) => onPatch({ searchQuery: q }),
    [onPatch],
  );

  const handleClear = () => {
    onClear();
    onClose();
  };

  useModalHardwareBack(visible, onClose);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Pressable onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </Pressable>
            <Text style={styles.headerTitle}>{t('filters.header')}</Text>
            <Pressable onPress={handleClear} hitSlop={8}>
              <Text style={styles.clearText}>{t('filters.clearAll')}</Text>
            </Pressable>
          </View>

          <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
            {visible ? (
              <SearchSection
                searchQuery={value.searchQuery}
                sheetVisible={visible}
                onSearchQueryChange={handleSearchQueryChange}
              />
            ) : null}
            <SortSection
              sortOrder={value.sortOrder}
              proximitySortCity={
                value.proximitySortCity && value.proximitySortCityName
                  ? { id: value.proximitySortCity, name: value.proximitySortCityName }
                  : null
              }
              onSortOrderChange={(s) => onPatch({ sortOrder: s })}
              onProximitySortCityChange={(c) =>
                onPatch({
                  proximitySortCity: c?.id ?? null,
                  proximitySortCityName: c?.name ?? null,
                })
              }
            />
            <FiltersSection
              type={value.type}
              categories={value.categories}
              itemConditions={value.itemConditions}
              statusFilter={value.statusFilter}
              followersOnly={value.followersOnly}
              onTypeChange={(type) => onPatch({ type })}
              onCategoriesChange={(categories) => onPatch({ categories })}
              onItemConditionsChange={(itemConditions) => onPatch({ itemConditions })}
              onStatusFilterChange={(statusFilter) => onPatch({ statusFilter })}
              onFollowersOnlyChange={(followersOnly) => onPatch({ followersOnly })}
            />
            <LocationFilterSection
              value={value.locationFilter}
              onChange={(locationFilter) => onPatch({ locationFilter })}
            />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const usePostFilterSheetStyles = makeUseStyles(({ colors }) => ({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: colors.overlay },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: '58%',
    paddingBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: { ...typography.h3, color: colors.textPrimary },
  clearText: { ...typography.caption, color: colors.error, fontWeight: '600' as const },
  body: { flexGrow: 0 },
  bodyContent: { padding: spacing.sm, paddingBottom: spacing.md },
}));
