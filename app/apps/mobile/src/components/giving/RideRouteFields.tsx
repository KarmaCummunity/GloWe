// Ride origin/destination picker: fills origin_*/dest_* (label, lat, lng, city_id) in
// listing details from public.cities, so riders never type coordinates.
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { makeUseStyles, typography, Text } from '@kc/ui';
import { withRideEndpoint } from '@kc/domain';
import { CityPicker } from '../CityPicker';
import { cityToRideEndpoint } from '../../services/ridesKnowledgeComposition';
import { hapticLightTap } from '../../lib/haptics';

const useStyles = makeUseStyles(({ colors }) => ({
  label: { ...typography.caption, color: colors.textSecondary },
}));

type City = { id: string; name: string };

interface Props {
  details: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
  /** Called with the origin city so the form can use it as the listing city. */
  onOriginCity?: (city: City) => void;
  disabled?: boolean;
}

export function RideRouteFields({ details, onChange, onOriginCity, disabled }: Props) {
  const { t } = useTranslation();
  const styles = useStyles();
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
    onChange(withRideEndpoint(details, end, point));
  };

  return (
    <>
      <Text style={styles.label}>{t('donations.rides.fieldOrigin')}</Text>
      <CityPicker value={origin} onChange={(c) => void pick('origin', c)} disabled={disabled} />
      <Text style={styles.label}>{t('donations.rides.fieldDest')}</Text>
      <CityPicker value={dest} onChange={(c) => void pick('dest', c)} disabled={disabled} />
    </>
  );
}
