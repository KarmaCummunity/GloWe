import { describe, it, expect } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseMarketplaceRepository } from '../SupabaseMarketplaceRepository';

describe('SupabaseMarketplaceRepository', () => {
  it('maps browse_listings rows', async () => {
    const client = {
      rpc: async (name: string) => {
        expect(name).toBe('browse_listings');
        return {
          data: [
            {
              listing_id: 'l1',
              world_slug: 'items',
              kind_slug: 'give_item',
              direction: 'give',
              title: 'Chair',
              summary: null,
              urgency_level: 2,
              availability_status: 'ongoing',
              city_id: 'tel-aviv',
              distance_km: 3,
              geo: null,
            },
          ],
          error: null,
        };
      },
    } as unknown as SupabaseClient;
    const repo = new SupabaseMarketplaceRepository(client);
    const out = await repo.browse({ limit: 5 });
    expect(out[0]?.listingId).toBe('l1');
    expect(out[0]?.worldSlug).toBe('items');
  });
});
