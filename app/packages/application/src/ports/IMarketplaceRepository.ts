import type { MarketplaceBrowseRow, MarketplaceMapCluster } from '@kc/domain';

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
  createListing(input: {
    kindId: string;
    title: string;
    summary?: string | null;
    details?: Record<string, unknown>;
    direction?: 'give' | 'request' | null;
    cityId?: string | null;
    urgencyLevel?: number;
    availabilityStatus?: string;
  }): Promise<string>;
  recordSignal(listingId: string, signal: 'view' | 'save' | 'response'): Promise<void>;
  shareToFeed(listingId: string): Promise<string>;
  startChat(listingId: string, openingMessage?: string | null): Promise<string>;
}
