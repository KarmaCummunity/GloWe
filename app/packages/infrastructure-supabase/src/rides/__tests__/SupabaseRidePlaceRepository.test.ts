import { describe, expect, it, vi } from 'vitest';
import { SupabaseRidePlaceRepository } from '../SupabaseRidePlaceRepository';

type AnyClient = ConstructorParameters<typeof SupabaseRidePlaceRepository>[0];

function repoWith(result: { data: unknown; error: { message: string } | null }) {
  const rpc = vi.fn().mockResolvedValue(result);
  return { rpc, repo: new SupabaseRidePlaceRepository({ rpc, from: vi.fn() } as unknown as AnyClient) };
}

const CITY = { place_kind: 'city', place_id: '6500', label: 'חדרה', city_id: '6500', lat: 32.43, lng: 34.91 };
const JUNCTION = { place_kind: 'junction', place_id: '106', label: 'מחלף גלילות מערב', city_id: null, lat: 32.14, lng: 34.8 };

describe('SupabaseRidePlaceRepository', () => {
  it('maps cities and junctions to ride places', async () => {
    const { rpc, repo } = repoWith({ data: [CITY, JUNCTION], error: null });
    await expect(repo.listPlaces()).resolves.toEqual([
      { kind: 'city', id: '6500', label: 'חדרה', lat: 32.43, lng: 34.91, cityId: '6500' },
      { kind: 'junction', id: '106', label: 'מחלף גלילות מערב', lat: 32.14, lng: 34.8, cityId: null },
    ]);
    expect(rpc).toHaveBeenCalledWith('list_ride_places');
  });

  it('drops rows of an unknown kind or without coordinates', async () => {
    const { repo } = repoWith({ data: [{ ...CITY, place_kind: 'mall' }, { ...JUNCTION, lat: null }], error: null });
    await expect(repo.listPlaces()).resolves.toEqual([]);
  });

  it('throws the server error', async () => {
    const { repo } = repoWith({ data: null, error: { message: 'boom' } });
    await expect(repo.listPlaces()).rejects.toThrow('boom');
  });
});
