import React, { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { useTranslation } from 'react-i18next';
import { makeUseStyles, radius, spacing, typography, Text, TextInput } from '@kc/ui';
import type { ListingKindOption } from '@kc/domain';
import { RIDE_ROUTE_DETAIL_KEYS, validateListingDetails } from '@kc/domain';
import {
  findCreateCategory,
  hasCreateField,
  type CreateDirection,
} from '../../lib/unifiedCreate/createCategories';
import { buildListingCreatePayload } from '../../lib/unifiedCreate/unifiedCreatePayload';
import { CityPicker } from '../CityPicker';
import { ListingSchemaFields } from './ListingSchemaFields';
import { RideRouteFields } from '../giving/RideRouteFields';
import { ExternalBodyPicker } from './ExternalBodyPicker';
import { WorldSubcategoryPicker } from './WorldSubcategoryPicker';
import { useListingChipStyles } from './listingChipStyles';
import {
  pickListingImages,
  uploadListingImages,
  type PickedImage,
} from '../../services/listingImageUpload';
import { marketplaceRepository, getMarketplaceSupabaseClient } from '../../services/marketplaceComposition';
import { useAuthStore } from '../../store/authStore';
import {
  marketplaceRuleFieldError,
  marketplaceServerErrorKey,
  type MarketplaceRuleFieldError,
} from '../../lib/marketplaceCreateErrors';
import { trackActivationIfFirst, trackCoreLoop } from '../../lib/analyticsCoreLoop';

const useStyles = makeUseStyles(({ colors }) => ({
  body: { padding: spacing.lg, gap: spacing.md },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    color: colors.textPrimary,
  },
  label: { ...typography.caption, color: colors.textSecondary },
  hint: { ...typography.caption, color: colors.textSecondary },
  btn: { marginTop: spacing.lg, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.primary },
  btnText: { ...typography.body, color: colors.textInverse, textAlign: 'center' as const },
  err: { ...typography.caption, color: colors.error },
  thumb: { width: 72, height: 72, borderRadius: radius.sm },
}));

interface Props {
  worldSlug: string;
  onPublished: (listingId: string) => void;
  /** Unified create header (category picker + give/request toggle). */
  header: ReactNode;
  direction: CreateDirection;
  title: string;
  onTitleChange: (v: string) => void;
  summary: string;
  onSummaryChange: (v: string) => void;
}

export function MarketplaceCreateForm({
  worldSlug,
  onPublished,
  header,
  direction,
  title,
  onTitleChange: setTitle,
  summary,
  onSummaryChange: setSummary,
}: Props) {
  const { t, i18n } = useTranslation();
  const styles = useStyles();
  const chipStyles = useListingChipStyles();
  const userId = useAuthStore((s) => s.session?.userId ?? null);
  const [kinds, setKinds] = useState<ListingKindOption[]>([]);
  const [kindId, setKindId] = useState<string | null>(null);
  const [details, setDetails] = useState<Record<string, unknown>>({});
  const [city, setCity] = useState<{ id: string; name: string } | null>(null);
  const [radiusKm, setRadiusKm] = useState(25);
  const [org, setOrg] = useState<{ id: string; name: string } | null>(null);
  const config = findCreateCategory(worldSlug);
  const routedWorld = hasCreateField(config, direction, 'externalBody');
  const showWorldSubcategory = hasCreateField(config, direction, 'worldSubcategory');
  const [worldSubcategoryId, setWorldSubcategoryId] = useState<string | null>(null);
  const showRideRoute = hasCreateField(config, direction, 'rideRoute');
  const [picked, setPicked] = useState<PickedImage[]>([]);
  const [busy, setBusy] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [ruleError, setRuleError] = useState<MarketplaceRuleFieldError | null>(null);

  useEffect(() => {
    void marketplaceRepository()
      .listKindsForWorld(worldSlug)
      .then(setKinds);
  }, [worldSlug]);

  const directionKinds = useMemo(
    () => kinds.filter((k) => k.direction === 'either' || k.direction === direction),
    [kinds, direction],
  );
  const activeKind = useMemo(
    () => directionKinds.find((k) => k.kindId === kindId) ?? directionKinds[0] ?? null,
    [directionKinds, kindId],
  );

  useEffect(() => {
    setDetails({});
    setRuleError(null);
  }, [activeKind?.kindId]);

  if (!activeKind) {
    return (
      <ScrollView contentContainerStyle={styles.body}>
        {header}
        {kinds.length === 0 ? <ActivityIndicator style={{ marginTop: spacing.xl }} /> : null}
      </ScrollView>
    );
  }

  const kindLabel = i18n.language.startsWith('he') ? activeKind.labelHe : activeKind.labelEn;

  return (
    <ScrollView contentContainerStyle={styles.body}>
      {header}
      <Text style={styles.label}>{t('marketplace.fieldKind')}</Text>
      <View style={chipStyles.chipRow}>
        {directionKinds.map((k) => {
          const label = i18n.language.startsWith('he') ? k.labelHe : k.labelEn;
          return (
            <Pressable
              key={k.kindId}
              style={[chipStyles.chip, activeKind.kindId === k.kindId && chipStyles.chipOn]}
              onPress={() => setKindId(k.kindId)}
            >
              <Text style={chipStyles.chipText}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
      {showWorldSubcategory ? (
        <WorldSubcategoryPicker
          worldSlug={worldSlug}
          value={worldSubcategoryId}
          onChange={setWorldSubcategoryId}
          disabled={busy}
        />
      ) : null}
      <Text style={styles.label}>{t('marketplace.fieldTitle')}</Text>
      <TextInput style={styles.input} value={title} onChangeText={setTitle} />
      <Text style={styles.label}>{t('marketplace.fieldSummary')}</Text>
      <TextInput style={styles.input} value={summary} onChangeText={setSummary} multiline />
      <Text style={typography.bodySmall}>{kindLabel}</Text>
      {showRideRoute ? (
        <RideRouteFields
          key={activeKind.kindId}
          details={details}
          onChange={setDetails}
          onOriginCity={(c) => setCity((prev) => prev ?? c)}
          disabled={busy}
        />
      ) : null}
      <ListingSchemaFields
        schema={activeKind.detailSchema}
        values={details}
        onChange={setDetails}
        hiddenKeys={showRideRoute ? RIDE_ROUTE_DETAIL_KEYS : undefined}
      />
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
          style={chipStyles.chip}
          onPress={async () => {
            const next = await pickListingImages(picked.length);
            if (!next.length) return;
            setPicked((prev) => [...prev, ...next]);
          }}
        >
          <Text style={chipStyles.chipText}>+</Text>
        </Pressable>
      </View>
      {picked.length === 0 ? <Text style={styles.hint}>{t('marketplace.fieldPhotosHint')}</Text> : null}
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
            const id = await marketplaceRepository().createListing(
              buildListingCreatePayload({
                kindId: activeKind.kindId,
                kindDirection: activeKind.direction,
                direction,
                title,
                summary,
                details,
                cityId: city?.id ?? null,
                lat,
                lng,
                radiusKm,
                mediaPaths,
                routedWorld,
                externalBodyId: org?.id ?? null,
                worldSubcategoryId: showWorldSubcategory ? worldSubcategoryId : null,
              }),
            );
            trackCoreLoop('listing_created', { world: worldSlug, cityId: city?.id ?? null });
            void trackActivationIfFirst({
              world: worldSlug,
              cityId: city?.id ?? null,
              accountCreatedAt: useAuthStore.getState().session?.accountCreatedAt,
            });
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
