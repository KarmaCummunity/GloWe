import { useQuery } from '@tanstack/react-query';
import { resolveFeatureFlag, type FeatureFlagKey } from '../config/featureFlags';
import { fetchRemoteFeatureFlags } from '../services/featureFlagsComposition';

/** Remote flag value, falling back to the compiled default while loading / offline. */
export function useFeatureFlag(key: FeatureFlagKey): boolean {
  const { data } = useQuery({
    queryKey: ['app-flags'],
    queryFn: fetchRemoteFeatureFlags,
    staleTime: 5 * 60 * 1000,
  });
  return resolveFeatureFlag(key, data);
}
