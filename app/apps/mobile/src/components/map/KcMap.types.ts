import type { MapPinCluster, MapRegion, MarketplaceMapPin } from '@kc/domain';

export interface KcMapFocus {
  readonly region: MapRegion;
  /** Bump to re-apply the same region. */
  readonly nonce: number;
}

export interface KcMapProps {
  readonly initialRegion: MapRegion;
  readonly clusters: readonly MapPinCluster[];
  readonly selectedId: string | null;
  readonly route: MarketplaceMapPin['route'];
  readonly userLocation: { lat: number; lng: number } | null;
  readonly focus: KcMapFocus | null;
  readonly onRegionChange: (r: MapRegion) => void;
  readonly onPressCluster: (c: MapPinCluster) => void;
  readonly onPressMap: () => void;
}

const WORLD_GLYPH: Record<string, string> = {
  items: '🎁',
  food: '🍲',
  rides: '🚗',
  knowledge: '📚',
  time: '⏳',
  money: '💰',
};

export function clusterGlyph(c: MapPinCluster): string {
  if (c.pins.length > 1) return String(c.pins.length > 99 ? '99+' : c.pins.length);
  return WORLD_GLYPH[c.worldSlug ?? ''] ?? '📍';
}
