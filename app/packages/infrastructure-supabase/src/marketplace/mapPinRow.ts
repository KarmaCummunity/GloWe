import type { MarketplaceMapPin } from '@kc/domain';
import type { Database } from '../database.types';

type PinRow = Database['public']['Functions']['map_listing_pins']['Returns'][number];

/** Pure mapper: map_listing_pins row -> domain pin (rides get route + summary). */
export function mapPinRow(r: PinRow): MarketplaceMapPin {
  const isRide = r.world_slug === 'rides';
  const hasRoute =
    isRide && r.origin_lat != null && r.origin_lng != null && r.dest_lat != null && r.dest_lng != null;
  return {
    listingId: r.listing_id,
    worldSlug: r.world_slug,
    kindSlug: r.kind_slug,
    direction: r.direction === 'request' ? 'request' : 'give',
    title: r.title,
    summary: r.summary,
    lat: r.lat,
    lng: r.lng,
    route: hasRoute
      ? { originLat: r.origin_lat!, originLng: r.origin_lng!, destLat: r.dest_lat!, destLng: r.dest_lng! }
      : null,
    ride: isRide
      ? { originLabel: r.origin_label, destLabel: r.dest_label, departsAt: r.departs_at, seats: r.seats }
      : null,
  };
}
