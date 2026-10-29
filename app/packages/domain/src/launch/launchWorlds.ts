// Launch wedge: which donation/marketplace worlds are visible (#1041).
// Remote keys live in public.app_flags as `world_<slug>_enabled`.

export const LOD_CITY_ID = '7000';

export const LAUNCH_WORLD_FLAG_KEYS = [
  'world_items_enabled',
  'world_food_enabled',
  'world_money_enabled',
  'world_time_enabled',
  'world_rides_enabled',
  'world_knowledge_enabled',
  'world_housing_enabled',
  'world_medical_enabled',
  'world_animals_enabled',
  'world_environment_enabled',
  'world_creative_enabled',
  'world_app_design_enabled',
] as const;

export type LaunchWorldFlagKey = (typeof LAUNCH_WORLD_FLAG_KEYS)[number];

/** Compiled defaults when no remote row exists (launch wedge: items + food only). */
export const LAUNCH_WORLD_FLAG_DEFAULTS: Record<LaunchWorldFlagKey, boolean> = {
  world_items_enabled: true,
  world_food_enabled: true,
  world_money_enabled: false,
  world_time_enabled: false,
  world_rides_enabled: false,
  world_knowledge_enabled: false,
  world_housing_enabled: false,
  world_medical_enabled: false,
  world_animals_enabled: false,
  world_environment_enabled: false,
  world_creative_enabled: false,
  world_app_design_enabled: false,
};

export type RemoteAppFlags = Partial<Record<string, boolean>>;

export function launchWorldFlagKeyForSlug(worldSlug: string): LaunchWorldFlagKey | null {
  const key = `world_${worldSlug}_enabled` as LaunchWorldFlagKey;
  return (LAUNCH_WORLD_FLAG_KEYS as readonly string[]).includes(key) ? key : null;
}

export function resolveLaunchWorldEnabled(
  flagKey: LaunchWorldFlagKey,
  remote: RemoteAppFlags | undefined,
): boolean {
  const value = remote?.[flagKey];
  return typeof value === 'boolean' ? value : LAUNCH_WORLD_FLAG_DEFAULTS[flagKey];
}

export function isMarketplaceWorldLaunchEnabled(
  worldSlug: string,
  remote: RemoteAppFlags | undefined,
): boolean {
  const key = launchWorldFlagKeyForSlug(worldSlug);
  return key ? resolveLaunchWorldEnabled(key, remote) : true;
}

/** Donations hub tile keys → launch flag (transport → rides). */
export const HUB_TILE_LAUNCH_FLAG: Record<string, LaunchWorldFlagKey> = {
  items: 'world_items_enabled',
  food: 'world_food_enabled',
  money: 'world_money_enabled',
  time: 'world_time_enabled',
  housing: 'world_housing_enabled',
  transport: 'world_rides_enabled',
  knowledge: 'world_knowledge_enabled',
  animals: 'world_animals_enabled',
  medical: 'world_medical_enabled',
};

export function isHubTileLaunchEnabled(tileKey: string, remote: RemoteAppFlags | undefined): boolean {
  const flag = HUB_TILE_LAUNCH_FLAG[tileKey];
  return flag ? resolveLaunchWorldEnabled(flag, remote) : true;
}

/** Donation category screens (FR-DONATE-006) → launch flag. */
export const CATEGORY_SLUG_LAUNCH_FLAG: Record<string, LaunchWorldFlagKey> = {
  food: 'world_food_enabled',
  housing: 'world_housing_enabled',
  transport: 'world_rides_enabled',
  knowledge: 'world_knowledge_enabled',
  animals: 'world_animals_enabled',
  medical: 'world_medical_enabled',
};

export function categorySlugLaunchFlag(slug: string): LaunchWorldFlagKey | null {
  return CATEGORY_SLUG_LAUNCH_FLAG[slug] ?? null;
}

export function isCategorySlugLaunchEnabled(slug: string, remote: RemoteAppFlags | undefined): boolean {
  const flag = categorySlugLaunchFlag(slug);
  return flag ? resolveLaunchWorldEnabled(flag, remote) : true;
}

export function analyticsCitySegment(cityId: string | null | undefined): 'lod' | 'other' {
  return cityId === LOD_CITY_ID ? 'lod' : 'other';
}
