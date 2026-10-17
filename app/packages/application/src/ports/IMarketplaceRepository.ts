import type {
  ExternalBodyOption,
  GivingHandoffSnapshot,
  ListingKindOption,
  MarketplaceBrowseRow,
  MarketplaceListingDetail,
  MarketplaceMapCluster,
  MarketplaceSimilarListing,
  MyGivingHandoffRow,
  MyListingRow,
  ProfileListingRow,
} from '@kc/domain';

export interface MarketplaceBrowseFilters {
  worldSlug?: string | null;
  direction?: 'give' | 'request' | null;
  urgencyMin?: number | null;
  availability?: string | null;
  lat?: number | null;
  lng?: number | null;
  radiusKm?: number | null;
  limit?: number;
  offset?: number;
}

export interface IMarketplaceRepository {
  browse(filters: MarketplaceBrowseFilters): Promise<MarketplaceBrowseRow[]>;
  search(query: string, worldSlug?: string | null, limit?: number): Promise<string[]>;
  recommendForYou(limit?: number): Promise<string[]>;
  mapClusters(bounds: {
    swLat: number;
    swLng: number;
    neLat: number;
    neLng: number;
    worldSlug?: string | null;
  }): Promise<MarketplaceMapCluster[]>;
  getListingCard(listingId: string): Promise<MarketplaceBrowseRow | null>;
  getListingDetail(listingId: string): Promise<MarketplaceListingDetail | null>;
  similarListings(listingId: string, limit?: number): Promise<MarketplaceSimilarListing[]>;
  listKindsForWorld(worldSlug: string): Promise<ListingKindOption[]>;
  /** Active + verified organisations for a routed world (search_external_bodies). */
  searchExternalBodies(worldSlug: string, query?: string | null, limit?: number): Promise<ExternalBodyOption[]>;
  createListing(input: {
    kindId: string;
    title: string;
    summary?: string | null;
    details?: Record<string, unknown>;
    direction?: 'give' | 'request' | null;
    cityId?: string | null;
    lat?: number | null;
    lng?: number | null;
    maxRadiusKm?: number | null;
    mediaPaths?: string[];
    /** Required for routed worlds (medical / animals / environment). */
    externalBodyId?: string | null;
    urgencyLevel?: number;
    availabilityStatus?: string;
  }): Promise<string>;
  recordSignal(listingId: string, signal: 'view' | 'save' | 'response'): Promise<void>;
  shareToFeed(listingId: string): Promise<string>;
  startChat(listingId: string, openingMessage?: string | null): Promise<string>;
  listMyListings(limit?: number, offset?: number): Promise<MyListingRow[]>;
  listProfileListings(ownerId: string, limit?: number): Promise<ProfileListingRow[]>;
  updateMyListing(
    listingId: string,
    patch: {
      title?: string;
      summary?: string | null;
      details?: Record<string, unknown>;
      cityId?: string | null;
      maxRadiusKm?: number | null;
      urgencyLevel?: number;
      availabilityStatus?: string;
    },
  ): Promise<void>;
  pauseMyListing(listingId: string): Promise<void>;
  resumeMyListing(listingId: string): Promise<void>;
  fulfillMyListing(listingId: string): Promise<void>;
  deleteMyListing(listingId: string): Promise<void>;
  getListingHandoff(listingId: string): Promise<GivingHandoffSnapshot | null>;
  listMyGivingHandoffs(limit?: number): Promise<MyGivingHandoffRow[]>;
  reserveItemGiving(
    listingId: string,
    pickupMode?: 'pickup' | 'delivery',
    pickupWindowStart?: string | null,
    pickupWindowEnd?: string | null,
  ): Promise<GivingHandoffSnapshot>;
  confirmItemHandoff(handoffId: string): Promise<GivingHandoffSnapshot>;
  claimFoodGiving(
    listingId: string,
    pickupWindowStart?: string | null,
    pickupWindowEnd?: string | null,
  ): Promise<GivingHandoffSnapshot>;
  cancelGivingHandoff(handoffId: string): Promise<void>;
  markGivingHandedOver(handoffId: string): Promise<GivingHandoffSnapshot>;
  rateGivingHandoff(handoffId: string, rating: number, comment?: string | null): Promise<void>;
}
