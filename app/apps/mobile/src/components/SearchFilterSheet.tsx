// Bottom sheet for advanced search filters (FR-FEED-017+).
// Local state mirrors store so the user can preview before applying.
import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, Text } from '@kc/ui';
import { ALL_CATEGORIES, DONATION_CATEGORY_SLUGS, RADIUS_OPTIONS_KM } from '@kc/domain';
import type { Category, DonationCategorySlug, PostType, SearchSortBy } from '@kc/domain';
import { useTranslation } from 'react-i18next';
import { useShallow } from 'zustand/react/shallow';
import { useModalHardwareBack } from '../hooks/useModalHardwareBack';
import { useSearchStore } from '../store/searchStore';
import { CityPicker } from './CityPicker';
import { SearchChip } from './search/SearchChip';
import { useSearchFilterSheetStyles } from './search/searchFilterSheet.styles';

const DEFAULT_RADIUS_KM = 5;

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function SearchFilterSheet({ visible, onClose }: Props) {
  useModalHardwareBack(visible, onClose);
  const styles = useSearchFilterSheetStyles();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const store = useSearchStore(
    useShallow((s) => ({
      postType: s.postType,
      category: s.category,
      donationCategory: s.donationCategory,
      city: s.city,
      cityName: s.cityName,
      radiusKm: s.radiusKm,
      sortBy: s.sortBy,
      setPostType: s.setPostType,
      setCategory: s.setCategory,
      setDonationCategory: s.setDonationCategory,
      setCity: s.setCity,
      setRadiusKm: s.setRadiusKm,
      setSortBy: s.setSortBy,
      clearFilters: s.clearFilters,
    })),
  );
  const [postType, setPostType] = useState<PostType | null>(store.postType);
  const [category, setCategory] = useState<Category | null>(store.category);
  const [donationCategory, setDonationCategory] = useState<DonationCategorySlug | null>(store.donationCategory);
  const [city, setCity] = useState<{ id: string; name: string } | null>(
    store.city ? { id: store.city, name: store.cityName ?? '' } : null,
  );
  const [radiusKm, setRadiusKm] = useState<number | null>(store.radiusKm);
  const [sortBy, setSortBy] = useState<SearchSortBy>(store.sortBy);

  // Whenever the city changes, gate the radius accordingly: pick a sensible
  // default the first time a city is set; drop the radius when the city is
  // cleared (radius alone is meaningless).
  const handleCityChange = (next: { id: string; name: string } | null) => {
    setCity(next);
    if (!next) {
      setRadiusKm(null);
    } else if (radiusKm == null) {
      setRadiusKm(DEFAULT_RADIUS_KM);
    }
  };

  const handleApply = () => {
    store.setPostType(postType);
    store.setCategory(category);
    store.setDonationCategory(donationCategory);
    store.setCity(city?.id ?? null, city?.name ?? null);
    store.setRadiusKm(city ? radiusKm : null);
    store.setSortBy(sortBy);
    onClose();
  };

  const handleClear = () => {
    setPostType(null);
    setCategory(null);
    setDonationCategory(null);
    setCity(null);
    setRadiusKm(null);
    setSortBy('relevance');
    store.clearFilters();
    onClose();
  };

  const sortLabels: Record<string, string> = {
    relevance: t('search.sortRelevance'),
    newest: t('search.sortNewest'),
    followers: t('search.sortFollowers'),
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Pressable onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </Pressable>
            <Text style={styles.headerTitle}>{t('search.filters')}</Text>
            <Pressable onPress={handleClear}>
              <Text style={styles.clearText}>{t('search.clearFilters')}</Text>
            </Pressable>
          </View>

          <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
            <Text style={styles.sectionTitle}>{t('search.sortBy')}</Text>
            <View style={styles.chipRow}>
              {(['relevance', 'newest', 'followers'] as SearchSortBy[]).map((s) => (
                <SearchChip key={s} label={sortLabels[s] ?? s} active={sortBy === s} onPress={() => setSortBy(s)} />
              ))}
            </View>

            <Text style={styles.sectionTitle}>{t('search.filterPostType')}</Text>
            <View style={styles.chipRow}>
              <SearchChip label={t('search.all')} active={!postType} onPress={() => setPostType(null)} />
              <SearchChip label={t('search.give')} active={postType === 'Give'} onPress={() => setPostType(postType === 'Give' ? null : 'Give')} />
              <SearchChip label={t('search.request')} active={postType === 'Request'} onPress={() => setPostType(postType === 'Request' ? null : 'Request')} />
            </View>

            <Text style={styles.sectionTitle}>{t('search.filterCategory')}</Text>
            <View style={styles.chipRow}>
              <SearchChip label={t('search.all')} active={!category} onPress={() => setCategory(null)} />
              {ALL_CATEGORIES.map((c) => (
                <SearchChip
                  key={c}
                  label={t(`search.categories.${c}`)}
                  active={category === c}
                  onPress={() => setCategory(category === c ? null : c)}
                />
              ))}
            </View>

            <Text style={styles.sectionTitle}>{t('search.filterDonationCategory')}</Text>
            <View style={styles.chipRow}>
              <SearchChip label={t('search.all')} active={!donationCategory} onPress={() => setDonationCategory(null)} />
              {DONATION_CATEGORY_SLUGS.map((slug) => (
                <SearchChip
                  key={slug}
                  label={t(`search.donationCategories.${slug}`)}
                  active={donationCategory === slug}
                  onPress={() => setDonationCategory(donationCategory === slug ? null : slug)}
                />
              ))}
            </View>

            <Text style={styles.sectionTitle}>{t('search.filterCity')}</Text>
            <CityPicker
              value={city}
              onChange={(sel: { id: string; name: string }) => handleCityChange(sel)}
            />

            {/* Radius picker — only visible after a city is selected. Mirrors
                the PostFilterSheet pattern (FR-FEED-006). */}
            {city && (
              <>
                <Text style={styles.sectionTitle}>{t('search.filterRadius')}</Text>
                <View style={styles.chipRow}>
                  {RADIUS_OPTIONS_KM.map((km) => (
                    <SearchChip
                      key={km}
                      label={t('search.radiusKm').replace('{km}', String(km))}
                      active={radiusKm === km}
                      onPress={() => setRadiusKm(km)}
                    />
                  ))}
                </View>
              </>
            )}
          </ScrollView>

          <View style={styles.footer}>
            <Pressable
              style={({ pressed }) => [styles.applyBtn, pressed && styles.applyBtnPressed]}
              onPress={handleApply}
            >
              <Text style={styles.applyBtnText}>{t('search.applyFilters')}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
