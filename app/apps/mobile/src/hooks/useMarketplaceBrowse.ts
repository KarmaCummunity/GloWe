import { useQuery } from '@tanstack/react-query';
import type { MarketplaceBrowseFilters } from '@kc/application';
import { marketplaceRepository } from '../services/marketplaceComposition';

export function useMarketplaceBrowse(filters: MarketplaceBrowseFilters) {
  return useQuery({
    queryKey: ['marketplace-browse', filters],
    queryFn: () => marketplaceRepository().browse(filters),
  });
}

export function useMarketplaceSearchResults(
  query: string,
  worldSlug: string | null,
  limit = 30,
) {
  const trimmed = query.trim();
  return useQuery({
    queryKey: ['marketplace-search', trimmed, worldSlug, limit],
    enabled: trimmed.length >= 2,
    queryFn: async () => {
      const ids = await marketplaceRepository().search(trimmed, worldSlug, limit);
      const rows = await Promise.all(ids.map((id) => marketplaceRepository().getListingCard(id)));
      return rows.filter((r): r is NonNullable<typeof r> => r !== null);
    },
  });
}

export function useMarketplaceRecommendations(limit = 8) {
  return useQuery({
    queryKey: ['marketplace-for-you', limit],
    queryFn: async () => {
      const ids = await marketplaceRepository().recommendForYou(limit);
      const rows = await Promise.all(ids.map((id) => marketplaceRepository().getListingCard(id)));
      return rows.filter((r): r is NonNullable<typeof r> => r !== null);
    },
  });
}
