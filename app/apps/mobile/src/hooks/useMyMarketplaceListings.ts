import { useQuery, useQueryClient } from '@tanstack/react-query';
import { marketplaceRepository } from '../services/marketplaceComposition';

export function useMyMarketplaceListings() {
  return useQuery({
    queryKey: ['marketplace', 'my-listings'],
    queryFn: () => marketplaceRepository().listMyListings(50, 0),
    staleTime: 30_000,
  });
}

export function useInvalidateMyListings() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ['marketplace', 'my-listings'] });
}

export function useProfileMarketplaceListings(ownerId: string | undefined) {
  return useQuery({
    queryKey: ['marketplace', 'profile-listings', ownerId],
    queryFn: () => marketplaceRepository().listProfileListings(ownerId!, 24),
    enabled: Boolean(ownerId),
    staleTime: 60_000,
  });
}
