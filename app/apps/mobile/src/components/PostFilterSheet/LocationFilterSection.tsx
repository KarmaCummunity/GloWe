import React from 'react';
import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { RADIUS_OPTIONS_KM, type LocationFilter } from '@kc/domain';
import { makeUseStyles, radius, spacing, typography, Text } from '@kc/ui';
import { CityPicker } from '../CityPicker';
import { rtlTextAlignStart } from '../../lib/rtlTextAlignStart';

interface LocationFilterSectionProps {
  value: LocationFilter | null;
  onChange: (next: LocationFilter | null) => void;
}

const DEFAULT_RADIUS_KM = 5;

export function LocationFilterSection({ value, onChange }: LocationFilterSectionProps) {
  const { t } = useTranslation();
  const styles = useLocationFilterSectionStyles();
  const cityValue = value ? { id: value.centerCity, name: value.centerCityName } : null;
  const radiusKm = value?.radiusKm ?? DEFAULT_RADIUS_KM;

  const handleCity = (selection: { id: string; name: string } | null) => {
    if (!selection) {
      onChange(null);
      return;
    }
    onChange({
      centerCity: selection.id,
      centerCityName: selection.name,
      radiusKm,
    });
  };

  const handleRadius = (km: number) => {
    if (!value) return;
    onChange({ ...value, radiusKm: km });
  };

  const handleClearAllCities = () => onChange(null);

  return (
    <View style={styles.section}>
      <View style={styles.titleRow}>
        {value && (
          <Pressable onPress={handleClearAllCities} hitSlop={8}>
            <Text style={styles.clearText}>{t('filters.allCities')}</Text>
          </Pressable>
        )}
        <Text style={styles.title}>{t('filters.sectionLocation')}</Text>
      </View>
      <CityPicker value={cityValue} onChange={handleCity} />
      {value && (
        <>
          <Text style={styles.subLabel}>{t('filters.radius')}</Text>
          <View style={styles.row}>
            {RADIUS_OPTIONS_KM.map((km) => (
              <RadiusChip key={km} km={km} active={radiusKm === km} onPress={() => handleRadius(km)} t={t} />
            ))}
          </View>
        </>
      )}
    </View>
  );
}

function RadiusChip({ km, active, onPress, t }: { km: number; active: boolean; onPress: () => void; t: TFunction }) {
  const styles = useRadiusChipStyles();
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive]}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      <Text style={[styles.text, active && styles.textActive]}>{t('filters.radiusKm', { km })}</Text>
    </Pressable>
  );
}

const useLocationFilterSectionStyles = makeUseStyles(({ colors }) => ({
  section: { gap: spacing.xs, marginBottom: spacing.md },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { ...typography.label, color: colors.textPrimary, textAlign: rtlTextAlignStart },
  subLabel: { ...typography.caption, color: colors.textSecondary, textAlign: rtlTextAlignStart },
  clearText: { ...typography.caption, color: colors.primary, fontWeight: '500' as const },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'flex-end' },
}));

const useRadiusChipStyles = makeUseStyles(({ colors }) => ({
  chip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipActive: { borderColor: colors.secondary, backgroundColor: colors.secondary },
  text: { ...typography.caption, fontWeight: '600' as const, color: colors.textPrimary },
  textActive: { color: colors.textInverse },
}));
