import React from 'react';
import type { LaunchWorldFlagKey } from '@kc/domain';
import { launchWorldFlagKeyForSlug } from '@kc/domain';
import { useLaunchWorldEnabled, useMarketplaceWorldLaunchEnabled } from '../../hooks/useLaunchWorldFlags';
import { WorldComingSoonScreen } from './WorldComingSoonScreen';

export function WorldLaunchGateByFlag({
  flagKey,
  children,
}: {
  readonly flagKey: LaunchWorldFlagKey;
  readonly children: React.ReactNode;
}) {
  const enabled = useLaunchWorldEnabled(flagKey);
  if (!enabled) return <WorldComingSoonScreen />;
  return <>{children}</>;
}

export function WorldLaunchGateBySlug({
  worldSlug,
  children,
}: {
  readonly worldSlug: string;
  readonly children: React.ReactNode;
}) {
  const flagKey = launchWorldFlagKeyForSlug(worldSlug);
  const enabled = useMarketplaceWorldLaunchEnabled(worldSlug);
  if (flagKey && !enabled) return <WorldComingSoonScreen />;
  return <>{children}</>;
}
