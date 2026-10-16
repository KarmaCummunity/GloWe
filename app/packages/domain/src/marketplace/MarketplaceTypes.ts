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

export interface MarketplaceListingOwner {
  readonly userId: string;
  readonly displayName: string | null;
  readonly avatarUrl: string | null;
  readonly shareHandle: string | null;
  readonly cityId: string | null;
}

export interface MarketplaceListingMedia {
  readonly storagePath: string;
  readonly sortOrder: number;
}

export interface MarketplaceListingDetail {
  readonly listingId: string;
  readonly ownerId: string;
  readonly worldSlug: string;
  readonly worldLabelEn: string;
  readonly worldLabelHe: string;
  readonly kindSlug: string;
  readonly kindLabelEn: string;
  readonly kindLabelHe: string;
  readonly direction: 'give' | 'request';
  readonly title: string;
  readonly summary: string | null;
  readonly details: Record<string, unknown>;
  readonly cityId: string | null;
  readonly urgencyLevel: number;
  readonly availabilityStatus: string;
  readonly publishedAt: string | null;
  readonly lat: number | null;
  readonly lng: number | null;
  readonly maxRadiusKm: number | null;
  readonly media: readonly MarketplaceListingMedia[];
  readonly owner: MarketplaceListingOwner | null;
}

export interface MarketplaceSimilarListing {
  readonly listingId: string;
  readonly title: string;
  readonly worldSlug: string;
  readonly kindSlug: string;
}

export interface ListingKindOption {
  readonly kindId: string;
  readonly slug: string;
  readonly labelEn: string;
  readonly labelHe: string;
  readonly direction: 'give' | 'request' | 'either';
  readonly detailSchema: Record<string, unknown>;
}

/** Primary donation worlds exposed in the create hub (PRD + medical for blood/organs). */
export const MARKETPLACE_CREATE_WORLD_SLUGS = [
  'money',
  'time',
  'items',
  'food',
  'rides',
  'housing',
  'knowledge',
  'medical',
] as const;

export type MarketplaceCreateWorldSlug = (typeof MARKETPLACE_CREATE_WORLD_SLUGS)[number];
