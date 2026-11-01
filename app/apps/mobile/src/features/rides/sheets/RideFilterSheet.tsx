// FR-RIDE-002 — ride hub filter bottom sheet (mirrors SearchFilterSheet).
// The frame, footer and dismissal come from `FilterSheetFrame` (kit `BottomSheet`, spec 17 §4.1).
import React, { useState } from 'react';
import { View } from 'react-native';
import { endOfDay, startOfDay } from 'date-fns';
import { useTranslation } from 'react-i18next';
import type { RideMode } from '@kc/domain';
import { Text } from '@kc/ui';
import { CityPicker } from '../../../components/CityPicker';
import { SearchChip } from '../../../components/search/SearchChip';
import { FilterSheetFrame } from '../../../components/search/FilterSheetFrame';
import { useSearchFilterSheetStyles } from '../../../components/search/searchFilterSheet.styles';
import { useRidesFilterStore } from '../store/ridesFilterStore';

interface Props {
  readonly visible: boolean;
  readonly onClose: () => void;
}

export function RideFilterSheet({ visible, onClose }: Props) {
  const { t } = useTranslation();
  const styles = useSearchFilterSheetStyles();
  const store = useRidesFilterStore();

  const [originCity, setOriginCity] = useState<{ id: string; name: string } | null>(
    store.originCityId ? { id: store.originCityId, name: store.originCityName ?? '' } : null,
  );
  const [destCity, setDestCity] = useState<{ id: string; name: string } | null>(
    store.destCityId ? { id: store.destCityId, name: store.destCityName ?? '' } : null,
  );
  const [mode, setMode] = useState<RideMode | null>(store.mode);
  const [dateToday, setDateToday] = useState(Boolean(store.departFrom || store.departTo));

  const handleApply = () => {
    store.setOriginCity(originCity?.id ?? null, originCity?.name ?? null);
    store.setDestCity(destCity?.id ?? null, destCity?.name ?? null);
    store.setMode(mode);
    if (dateToday) {
      const now = new Date();
      store.setDepartRange(startOfDay(now).toISOString(), endOfDay(now).toISOString());
    } else {
      store.setDepartRange(null, null);
    }
    onClose();
  };

  const handleClear = () => {
    setOriginCity(null);
    setDestCity(null);
    setMode(null);
    setDateToday(false);
    store.clearFilters();
    onClose();
  };

  return (
    <FilterSheetFrame
      visible={visible}
      onDismiss={onClose}
      title={t('donations.rides.filtersTitle')}
      applyLabel={t('donations.rides.applyFilters')}
      onApply={handleApply}
      clearLabel={t('donations.rides.clearFilters')}
      onClear={handleClear}
    >
      <Text style={styles.sectionTitle}>{t('donations.rides.filterMode')}</Text>
      <View style={styles.chipRow}>
        <SearchChip label={t('donations.rides.modeAll')} active={!mode} onPress={() => setMode(null)} />
        <SearchChip
          label={t('donations.rides.modeOffer')}
          active={mode === 'offer'}
          onPress={() => setMode(mode === 'offer' ? null : 'offer')}
        />
        <SearchChip
          label={t('donations.rides.modeRequest')}
          active={mode === 'request'}
          onPress={() => setMode(mode === 'request' ? null : 'request')}
        />
      </View>

      <Text style={styles.sectionTitle}>{t('donations.rides.filterOrigin')}</Text>
      <CityPicker value={originCity} onChange={setOriginCity} />

      <Text style={styles.sectionTitle}>{t('donations.rides.filterDest')}</Text>
      <CityPicker value={destCity} onChange={setDestCity} />

      <Text style={styles.sectionTitle}>{t('donations.rides.filterDepart')}</Text>
      <View style={styles.chipRow}>
        <SearchChip
          label={t('donations.rides.departToday')}
          active={dateToday}
          onPress={() => setDateToday(!dateToday)}
        />
      </View>
    </FilterSheetFrame>
  );
}
