import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { useTranslation } from 'react-i18next';
import { makeUseStyles, spacing, typography } from '@kc/ui';
import type { ListingKindOption } from '@kc/domain';
import { ROUTED_WORLDS, validateListingDetails } from '@kc/domain';
import { CityPicker } from '../CityPicker';
import { ListingSchemaFields } from './ListingSchemaFields';
import { ExternalBodyPicker } from './ExternalBodyPicker';
import {
  pickListingImages,
  uploadListingImages,
  type PickedImage,
} from '../../services/listingImageUpload';
import { marketplaceRepository, getMarketplaceSupabaseClient } from '../../services/marketplaceComposition';
import { useAuthStore } from '../../store/authStore';
import {
import { track } from '../../lib/analytics';
  marketplaceRuleFieldError,
  marketplaceServerErrorKey,
  type MarketplaceRuleFieldError,
} from '../../lib/marketplaceCreateErrors';

const useStyles = makeUseStyles(({ colors }) => ({
  body: { padding: spacing.lg, gap: spacing.md },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
    color: colors.textPrimary,
  },
  label: { ...typography.caption, color: colors.textSecondary },
  hint: { ...typography.caption, color: colors.textSecondary },
  chipRow: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipOn: { borderColor: colors.primary, backgroundColor: colors.primarySurface },
  chipText: { ...typography.caption, color: colors.textPrimary },
  btn: { marginTop: spacing.lg, padding: spacing.md, borderRadius: 12, backgroundColor: colors.primary },
  btnText: { ...typography.body, color: colors.textInverse, textAlign: 'center' as const },
  err: { ...typography.caption, color: colors.error },
  thumb: { width: 72, height: 72, borderRadius: 8 },
}));

interface Props {
  worldSlug: string;
  onPublished: (listingId: string) => void;
}

export function MarketplaceCreateForm({ worldSlug, onPublished }: Props) {
  const { t, i18n } = useTranslation();
  const styles = useStyles();
  const userId = useAuthStore((s) => s.session?.userId ?? null);
  const [kinds, setKinds] = useState<ListingKindOption[]>([]);
  const [kindId, setKindId] = useState<string | null>(null);
  const [direction, setDirection] = useState<'give' | 'request'>('give');
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [details, setDetails] = useState<Record<string, unknown>>({});
  const [city, setCity] = useState<{ id: string; name: string } | null>(null);
  const [radiusKm, setRadiusKm] = useState(25);
  const [org, setOrg] = useState<{ id: string; name: string } | null>(null);
  const routedWorld = (ROUTED_WORLDS as readonly string[]).includes(worldSlug);
  const [picked, setPicked] = useState<PickedImage[]>([]);
  const [busy, setBusy] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [ruleError, setRuleError] = useState<MarketplaceRuleFieldError | null>(null);

  useEffect(() => {
    void marketplaceRepository()
      .listKindsForWorld(worldSlug)
      .then((rows) => {
        setKinds(rows);
        setKindId(rows[0]?.kindId ?? null);
        const d = rows[0]?.direction;
        if (d === 'request' || d === 'give') setDirection(d);
      });
  }, [worldSlug]);

  const activeKind = useMemo(() => kinds.find((k) => k.kindId === kindId) ?? null, [kinds, kindId]);

  useEffect(() => {
    setDetails({});
    setRuleError(null);
    if (activeKind?.direction === 'give' || activeKind?.direction === 'request') {
      setDirection(activeKind.direction);
    }
  }, [activeKind?.kindId]);

  if (!activeKind || !kindId) {
    return <ActivityIndicator style={{ marginTop: spacing.xl }} />;
  }

  const kindLabel = i18n.language.startsWith('he') ? activeKind.labelHe : activeKind.labelEn;

  return (
    <ScrollView contentContainerStyle={styles.body}>
      <Text style={typography.h2}>{t('marketplace.createTitle', { world: worldSlug })}</Text>
      <Text style={styles.label}>{t('marketplace.fieldKind')}</Text>
      <View style={styles.chipRow}>
        {kinds.map((k) => {
          const label = i18n.language.startsWith('he') ? k.labelHe : k.labelEn;
          return (
            <Pressable
              key={k.kindId}
              style={[styles.chip, kindId === k.kindId && styles.chipOn]}
              onPress={() => setKindId(k.kindId)}
            >
              <Text style={styles.chipText}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
      {activeKind.direction === 'either' ? (
        <>
          <Text style={styles.label}>{t('marketplace.fieldDirection')}</Text>
          <View style={styles.chipRow}>
            {(['give', 'request'] as const).map((d) => (
              <Pressable
                key={d}
                style={[styles.chip, direction === d && styles.chipOn]}
                onPress={() => setDirection(d)}
              >
                <Text style={styles.chipText}>{d}</Text>
              </Pressable>
            ))}
          </View>
        </>
      ) : null}
      <Text style={styles.label}>{t('marketplace.fieldTitle')}</Text>
      <TextInput style={styles.input} value={title} onChangeText={setTitle} />
      <Text style={styles.label}>{t('marketplace.fieldSummary')}</Text>
      <TextInput style={styles.input} value={summary} onChangeText={setSummary} multiline />
      <Text style={typography.bodySmall}>{kindLabel}</Text>
      <ListingSchemaFields schema={activeKind.detailSchema} values={details} onChange={setDetails} />
      {ruleError?.field === 'details' ? <Text style={styles.err}>{t(ruleError.key)}</Text> : null}
      {routedWorld ? (
        <>
          <Text style={styles.label}>{t('marketplace.orgPicker.label')}</Text>
          <Text style={styles.hint}>{t('marketplace.orgPicker.hint')}</Text>
          <ExternalBodyPicker
            worldSlug={worldSlug}
            value={org}
            disabled={busy}
            onChange={(sel) => {
              setOrg(sel);
              if (ruleError?.field === 'org') setRuleError(null);
            }}
          />
          {ruleError?.field === 'org' ? <Text style={styles.err}>{t(ruleError.key)}</Text> : null}
        </>
      ) : null}
      <Text style={styles.label}>{t('marketplace.fieldCity')}</Text>
      <CityPicker value={city} onChange={setCity} disabled={busy} />
      <Text style={styles.label}>{t('marketplace.fieldRadius', { km: Math.round(radiusKm) })}</Text>
      <Slider minimumValue={5} maximumValue={120} step={5} value={radiusKm} onValueChange={setRadiusKm} />
      <Text style={styles.label}>{t('marketplace.fieldPhotos')}</Text>
      <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
        {picked.map((p) => (
          <Image key={p.uri} source={{ uri: p.uri }} style={styles.thumb} />
        ))}
        <Pressable
          style={styles.chip}
          onPress={async () => {
            const next = await pickListingImages(picked.length);
            if (!next.length) return;
            setPicked((prev) => [...prev, ...next]);
            if (ruleError?.field === 'photos') setRuleError(null);
          }}
        >
          <Text style={styles.chipText}>+</Text>
        </Pressable>
      </View>
      {ruleError?.field === 'photos' ? <Text style={styles.err}>{t(ruleError.key)}</Text> : null}
      {validationError ? <Text style={styles.err}>{validationError}</Text> : null}
      <Pressable
        style={styles.btn}
        disabled={busy || title.trim().length < 2 || !userId}
        onPress={async () => {
          if (!userId) return;
          const schemaErr = validateListingDetails(activeKind.detailSchema, details);
          if (schemaErr) {
            setValidationError(t('marketplace.validationFailed', { code: schemaErr }));
            return;
          }
          const rule = marketplaceRuleFieldError({
            worldSlug,
            details,
            photoCount: picked.length,
            externalBodyId: org?.id ?? null,
          });
          setRuleError(rule);
          if (rule) {
            setValidationError(null);
            return;
          }
          setValidationError(null);
          setBusy(true);
          try {
            let lat: number | null = null;
            let lng: number | null = null;
            if (city?.id) {
              const { data } = await getMarketplaceSupabaseClient()
                .from('cities')
                .select('lat, lon')
                .eq('city_id', city.id)
                .maybeSingle();
              if (data?.lat != null && data.lon != null) {
                lat = Number(data.lat);
                lng = Number(data.lon);
              }
            }
            const mediaPaths = picked.length > 0 ? await uploadListingImages(userId, picked) : [];
            const id = await marketplaceRepository().createListing({
              kindId,
              title: title.trim(),
              summary: summary.trim() || null,
              details,
              direction: activeKind.direction === 'either' ? direction : null,
              cityId: city?.id ?? null,
              lat,
              lng,
              maxRadiusKm: radiusKm,
              mediaPaths,
              externalBodyId: routedWorld ? (org?.id ?? null) : null,
            });
            track('listing_created', { world: worldSlug });
            onPublished(id);
          } catch (err) {
            setValidationError(t(marketplaceServerErrorKey(err)));
          } finally {
            setBusy(false);
          }
        }}
      >
        <Text style={styles.btnText}>{busy ? t('marketplace.publishing') : t('marketplace.publish')}</Text>
      </Pressable>
    </ScrollView>
  );
}
