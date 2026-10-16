import type { SupabaseClient } from '@supabase/supabase-js';
import type { IMarketplaceRepository, MarketplaceBrowseFilters } from '@kc/application';
import type { MarketplaceBrowseRow, MarketplaceMapCluster } from '@kc/domain';
import type { Database } from '../database.types';

type BrowseRow = Database['public']['Functions']['browse_listings']['Returns'][number];

function mapBrowse(row: BrowseRow): MarketplaceBrowseRow {
  return {
    listingId: row.listing_id,
    worldSlug: row.world_slug,
    kindSlug: row.kind_slug,
    direction: row.direction as 'give' | 'request',
    title: row.title,
    summary: row.summary,
    urgencyLevel: row.urgency_level,
    availabilityStatus: row.availability_status,
    cityId: row.city_id,
    distanceKm: row.distance_km,
  };
}

export class SupabaseMarketplaceRepository implements IMarketplaceRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async browse(filters: MarketplaceBrowseFilters): Promise<MarketplaceBrowseRow[]> {
    const { data, error } = await this.client.rpc('browse_listings', {
      p_world_slug: filters.worldSlug ?? undefined,
      p_direction: filters.direction ?? undefined,
      p_urgency_min: filters.urgencyMin ?? undefined,
      p_availability: filters.availability ?? undefined,
      p_lat: filters.lat ?? undefined,
      p_lng: filters.lng ?? undefined,
      p_radius_km: filters.radiusKm ?? undefined,
      p_limit: filters.limit ?? 24,
      p_offset: filters.offset ?? 0,
    });
    if (error || !data) return [];
    return data.map(mapBrowse);
  }

  async search(query: string, worldSlug?: string | null, limit = 20): Promise<string[]> {
    const { data, error } = await this.client.rpc('marketplace_search', {
      p_query: query,
      p_world_slug: worldSlug ?? undefined,
      p_limit: limit,
    });
    if (error || !data) return [];
    return data.map((r) => r.listing_id);
  }

  async recommendForYou(limit = 12): Promise<string[]> {
    const { data, error } = await this.client.rpc('recommend_listings_for_user', { p_limit: limit });
    if (error || !data) return [];
    return data.map((r) => r.listing_id);
  }

  async mapClusters(bounds: {
    swLat: number;
    swLng: number;
    neLat: number;
    neLng: number;
    worldSlug?: string | null;
  }): Promise<MarketplaceMapCluster[]> {
    const { data, error } = await this.client.rpc('map_listing_clusters', {
      p_sw_lat: bounds.swLat,
      p_sw_lng: bounds.swLng,
      p_ne_lat: bounds.neLat,
      p_ne_lng: bounds.neLng,
      p_world_slug: bounds.worldSlug ?? undefined,
    });
    if (error || !data) return [];
    return data.map((c) => ({
      clusterKey: c.cluster_key,
      centerLat: c.center_lat,
      centerLng: c.center_lng,
      listingCount: c.listing_count,
      sampleListingId: c.sample_listing_id,
    }));
  }

  async getListingCard(listingId: string): Promise<MarketplaceBrowseRow | null> {
    const { data, error } = await this.client
      .from('listings')
      .select(
        'listing_id, world_slug, direction, title, summary, urgency_level, availability_status, city_id, kind_id',
      )
      .eq('listing_id', listingId)
      .maybeSingle();
    if (error || !data) return null;
    const { data: kindRow } = await this.client
      .from('listing_kinds')
      .select('slug')
      .eq('kind_id', data.kind_id)
      .maybeSingle();
    return {
      listingId: data.listing_id,
      worldSlug: data.world_slug,
      kindSlug: kindRow?.slug ?? '',
      direction: data.direction as 'give' | 'request',
      title: data.title,
      summary: data.summary,
      urgencyLevel: data.urgency_level,
      availabilityStatus: data.availability_status,
      cityId: data.city_id,
      distanceKm: null,
    };
  }

  async createListing(input: {
    kindId: string;
    title: string;
    summary?: string | null;
    details?: Record<string, unknown>;
    direction?: 'give' | 'request' | null;
    cityId?: string | null;
    urgencyLevel?: number;
    availabilityStatus?: string;
  }): Promise<string> {
    const { data, error } = await this.client.rpc('create_marketplace_listing', {
      p_kind_id: input.kindId,
      p_title: input.title,
      p_summary: input.summary ?? undefined,
      p_details: (input.details ?? {}) as Database['public']['Functions']['create_marketplace_listing']['Args']['p_details'],
      p_direction: input.direction ?? undefined,
      p_city_id: input.cityId ?? undefined,
      p_urgency_level: input.urgencyLevel ?? undefined,
      p_availability_status: input.availabilityStatus ?? undefined,
    });
    if (error || !data) throw error ?? new Error('create_marketplace_listing failed');
    return data as string;
  }

  async recordSignal(listingId: string, signal: 'view' | 'save' | 'response'): Promise<void> {
    await this.client.rpc('record_listing_signal', {
      p_listing_id: listingId,
      p_signal_type: signal,
    });
  }

  async shareToFeed(listingId: string): Promise<string> {
    const { data, error } = await this.client.rpc('share_listing_to_feed', { p_listing_id: listingId });
    if (error || !data) throw error ?? new Error('share_listing_to_feed failed');
    return data as string;
  }

  async startChat(listingId: string, openingMessage?: string | null): Promise<string> {
    const { data, error } = await this.client.rpc('start_listing_chat', {
      p_listing_id: listingId,
      p_opening_message: openingMessage ?? undefined,
    });
    if (error || !data) throw error ?? new Error('start_listing_chat failed');
    return data as string;
  }
}
