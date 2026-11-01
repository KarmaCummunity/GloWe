// Ride origin/destination picker: fills origin_*/dest_* (label, lat, lng, city_id) in
// listing details from public.cities, so riders never type coordinates (docs/spec/05 §5.3).
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { Text } from '@kc/ui';
import { withRideEndpoint } from '@kc/domain';
import { CityPicker } from '../CityPicker';
import { cityToRideEndpoint } from '../../services/ridesKnowledgeComposition';
import { hapticLightTap } from '../../lib/haptics';
import { useCreatePostStyles } from '../../screens/tabs/create.styles';

type City = { id: string; name: string };

type Details = Record<string, unknown>;

interface Props {
  /**
   * Applies an update to the latest details. An updater (not a value) because the endpoint
   * is resolved asynchronously: a value captured before the lookup would overwrite fields the
   * member edited meanwhile.
   */
  onChange: (update: (prev: Details) => Details) => void;
  /** Called with the origin city so the form can use it as the listing city. */
  onOriginCity?: (city: City) => void;
  disabled?: boolean;
}

export function RideRouteFields({ onChange, onOriginCity, disabled }: Props) {
  const { t } = useTranslation();
  const styles = useCreatePostStyles();
  const [origin, setOrigin] = useState<City | null>(null);
  const [dest, setDest] = useState<City | null>(null);

  const pick = async (end: 'origin' | 'dest', city: City) => {
    hapticLightTap();
    if (end === 'origin') {
      setOrigin(city);
      onOriginCity?.(city);
    } else {
      setDest(city);
    }
    const point = await cityToRideEndpoint(city).catch(() => null);
    onChange((prev) => withRideEndpoint(prev, end, point));
  };

  return (
    <>
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>
          {t('donations.rides.fieldOrigin')}
          <Text style={styles.required}> *</Text>
        </Text>
        <CityPicker value={origin} onChange={(c) => void pick('origin', c)} disabled={disabled} />
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>
          {t('donations.rides.fieldDest')}
          <Text style={styles.required}> *</Text>
        </Text>
        <CityPicker value={dest} onChange={(c) => void pick('dest', c)} disabled={disabled} />
      </View>
    </>
  );
}
