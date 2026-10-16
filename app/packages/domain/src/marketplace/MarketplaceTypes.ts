// Unified giving marketplace (Epic #893).

export const MARKETPLACE_WORLD_SLUGS = [
  'money',
  'items',
  'food',
  'medical',
  'housing',
  'rides',
  'knowledge',
  'time',
  'animals',
  'environment',
  'creative',
  'app_design',
] as const;

export type MarketplaceWorldSlug = (typeof MARKETPLACE_WORLD_SLUGS)[number];

export interface MarketplaceBrowseRow {
  readonly listingId: string;
  readonly worldSlug: string;
  readonly kindSlug: string;
  readonly direction: 'give' | 'request';
  readonly title: string;
  readonly summary: string | null;
  readonly urgencyLevel: number;
  readonly availabilityStatus: string;
  readonly cityId: string | null;
  readonly distanceKm: number | null;
}

export interface MarketplaceMapCluster {
  readonly clusterKey: string;
  readonly centerLat: number;
  readonly centerLng: number;
  readonly listingCount: number;
  readonly sampleListingId: string | null;
}
