// FR-PROFILE-007 — city + city-dependent street picker + house number.
// When the user picks a different city the previously typed street + number
// reset to empty so a stale Tel Aviv street can never accompany a Jerusalem
// submission. The street-number input is editable only when a city is set.

import React, { useCallback } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { makeUseStyles, radius, spacing, typography, useTheme, Text, TextInput } from '@kc/ui';
import { CityPicker } from './CityPicker';
import { StreetPicker } from './StreetPicker';
import { applyAddressResetOnCityChange } from '../lib/addressResetOnCityChange';
import { rtlTextAlignStart } from '../lib/rtlTextAlignStart';

export interface EditProfileAddressBlockProps {
  readonly city: { id: string; name: string } | null;
  readonly onCityChange: (v: { id: string; name: string } | null) => void;
  readonly street: string;
  readonly streetNumber: string;
  readonly onStreetChange: (v: string) => void;
  readonly onStreetNumberChange: (v: string) => void;
  readonly disabled: boolean;
}

export function EditProfileAddressBlock({
  city,
  onCityChange,
  street,
  streetNumber,
  onStreetChange,
  onStreetNumberChange,
  disabled,
}: EditProfileAddressBlockProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  const { t } = useTranslation();

  const handleCityChange = useCallback(
    (next: { id: string; name: string } | null) => {
      const { street: nextStreet, streetNumber: nextNumber } =
        applyAddressResetOnCityChange({
          prevCityId: city?.id,
          nextCityId: next?.id,
          street,
          streetNumber,
        });
      if (nextStreet !== street) onStreetChange(nextStreet);
      if (nextNumber !== streetNumber) onStreetNumberChange(nextNumber);
      onCityChange(next);
    },
    [city?.id, street, streetNumber, onCityChange, onStreetChange, onStreetNumberChange],
  );

  const handleStreetChange = useCallback(
    (selection: { id: string; name: string }) => onStreetChange(selection.name),
    [onStreetChange],
  );

  return (
    <View style={styles.container}>
      <View style={styles.field}>
        <Text style={styles.label}>{t('profile.addressLabel')}</Text>
        <CityPicker value={city} onChange={handleCityChange} disabled={disabled} />
      </View>
      <View style={styles.field}>
        <View style={styles.streetRow}>
          <View style={styles.streetCol}>
            <StreetPicker
              cityId={city?.id ?? null}
              value={street ? { id: '', name: street } : null}
              onChange={handleStreetChange}
              disabled={disabled}
            />
          </View>
          <TextInput
            style={[styles.input, styles.streetInputHouse, !city ? styles.inputDisabled : null]}
            value={streetNumber}
            onChangeText={onStreetNumberChange}
            placeholder={t('profile.streetNumberShort')}
            placeholderTextColor={colors.textDisabled}
            textAlign={rtlTextAlignStart}
            editable={!disabled && !!city}
            maxLength={10}
          />
        </View>
      </View>
    </View>
  );
}

const useStyles = makeUseStyles(({ colors, isDark }) => ({
  container: { width: '100%', maxWidth: 500, alignSelf: 'center' },
  field: { marginVertical: spacing.xs, gap: spacing.xs },
  label: { ...typography.label, color: colors.textSecondary, textAlign: rtlTextAlignStart },
  streetRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start', width: '100%' },
  streetCol: { flex: 2, minWidth: 0 },
  streetInputHouse: { flex: 1, minWidth: 0, maxWidth: 120 },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    ...typography.body,
    color: colors.textPrimary,
    minHeight: 50,
  },
  inputDisabled: { opacity: 0.5 },
}));
