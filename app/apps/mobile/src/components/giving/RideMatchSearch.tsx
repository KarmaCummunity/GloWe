// Rides hub: pick from/to cities → PostGIS corridor match (find_ride_listing_matches, 0392).
import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { makeUseStyles, spacing, typography } from '@kc/ui';
import type { RideEndpoint } from '@kc/domain';
import { CityPicker } from '../CityPicker';
import { worldHubBaseStyles } from './worldHubStyles';
import { cityToRideEndpoint, ridesKnowledgeRpcs } from '../../services/ridesKnowledgeComposition';
import { hapticLightTap } from '../../lib/haptics';

const useStyles = makeUseStyles(({ colors }) => ({
  ...worldHubBaseStyles(colors),
  box: { gap: spacing.sm, paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  title: { ...typography.h3, color: colors.textPrimary },
  label: { ...typography.caption, color: colors.textSecondary },
  results: { marginTop: spacing.sm },
}));

type City = { id: string; name: string };

export function RideMatchSearch() {
  const { t, i18n } = useTranslation();
  const styles = useStyles();
  const router = useRouter();
  const [from, setFrom] = useState<{ city: City; point: RideEndpoint | null } | null>(null);
  const [to, setTo] = useState<{ city: City; point: RideEndpoint | null } | null>(null);

  const pick = async (set: typeof setFrom, city: City) => {
    hapticLightTap();
    set({ city, point: await cityToRideEndpoint(city).catch(() => null) });
  };

  const a = from?.point;
  const b = to?.point;
  const matches = useQuery({
    queryKey: ['ride-matches', a?.cityId, b?.cityId],
    enabled: Boolean(a && b),
    queryFn: () =>
      ridesKnowledgeRpcs.findMatches({
        originLat: a!.lat, originLng: a!.lng, destLat: b!.lat, destLng: b!.lng, radiusKm: 15,
      }),
    staleTime: 30_000,
  });

  const fmt = (iso: string) =>
    new Date(iso).toLocaleString(i18n.language, { weekday: 'short', hour: '2-digit', minute: '2-digit' });

  return (
    <View style={styles.box}>
      <Text style={styles.title}>{t('donations.rides.matchTitle')}</Text>
      <Text style={styles.label}>{t('donations.rides.fieldOrigin')}</Text>
      <CityPicker value={from?.city ?? null} onChange={(c) => void pick(setFrom, c)} />
      <Text style={styles.label}>{t('donations.rides.fieldDest')}</Text>
      <CityPicker value={to?.city ?? null} onChange={(c) => void pick(setTo, c)} />
      {a && b && matches.data ? (
        <View style={styles.results}>
          {matches.data.length === 0 ? <Text style={styles.label}>{t('donations.rides.empty')}</Text> : null}
          {matches.data.map((m) => (
            <Pressable
              key={m.listing_id}
              style={styles.row}
              testID={`ride-match-${m.listing_id}`}
              onPress={() =>
                router.push({
                  pathname: '/(tabs)/donations/marketplace/[listingId]',
                  params: { listingId: m.listing_id },
                } as never)
              }
            >
              <Text style={styles.rowTitle}>{m.title}</Text>
              <Text style={styles.rowMeta}>
                {[m.origin_label, m.dest_label].filter(Boolean).join(' → ')} · {fmt(m.departs_at)} ·{' '}
                {t('donations.rides.seats', { count: m.seats_left })}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}
