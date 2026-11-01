import type { SupabaseClient } from '@supabase/supabase-js';
import { isRidePlaceKind, type RidePlace } from '@kc/domain';
import type { IRidePlaceRepository } from '@kc/application';
import type { Database } from '../database.types';

type Client = SupabaseClient<Database>;
type PlaceRow = Database['public']['Functions']['list_ride_places']['Returns'][number];

/** Official ride places over `list_ride_places` (0512; docs/spec/05_giving_worlds.md §5.3, D71). */
export class SupabaseRidePlaceRepository implements IRidePlaceRepository {
  constructor(private readonly client: Client) {}

  async listPlaces(): Promise<RidePlace[]> {
    const { data, error } = await this.client.rpc('list_ride_places');
    if (error) throw new Error(error.message);
    return (data ?? []).flatMap((row) => {
      const place = mapPlaceRow(row);
      return place ? [place] : [];
    });
  }
}

/** Maps one catalog row; a row of an unknown kind or without coordinates is dropped. */
export function mapPlaceRow(row: PlaceRow): RidePlace | null {
  if (!isRidePlaceKind(row.place_kind) || !Number.isFinite(row.lat) || !Number.isFinite(row.lng)) return null;
  return {
    kind: row.place_kind,
    id: row.place_id,
    label: row.label,
    lat: row.lat,
    lng: row.lng,
    cityId: row.city_id ?? null,
  };
}
