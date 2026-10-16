import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';
import { useRouter } from 'expo-router';
import type { MarketplaceMapCluster } from '@kc/domain';
import { marketplaceRepository } from '../../services/marketplaceComposition';

const DEFAULT_REGION: Region = {
  latitude: 32.0853,
  longitude: 34.7818,
  latitudeDelta: 0.35,
  longitudeDelta: 0.35,
};

export function MarketplaceMapView() {
  const router = useRouter();
  const [region, setRegion] = useState(DEFAULT_REGION);
  const [loading, setLoading] = useState(false);
  const [clusters, setClusters] = useState<MarketplaceMapCluster[]>([]);

  const loadClusters = useCallback(async (r: Region) => {
    setLoading(true);
    try {
      const swLat = r.latitude - r.latitudeDelta / 2;
      const neLat = r.latitude + r.latitudeDelta / 2;
      const swLng = r.longitude - r.longitudeDelta / 2;
      const neLng = r.longitude + r.longitudeDelta / 2;
      const rows = await marketplaceRepository().mapClusters({ swLat, swLng, neLat, neLng });
      setClusters(rows);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadClusters(region);
  }, []);

  return (
    <View style={styles.fill}>
      <MapView
        style={styles.fill}
        initialRegion={region}
        onRegionChangeComplete={(r) => {
          setRegion(r);
          void loadClusters(r);
        }}
      >
        {clusters.map((c) => (
          <Marker
            key={c.clusterKey}
            coordinate={{ latitude: c.centerLat, longitude: c.centerLng }}
            title={`${c.listingCount}`}
            onPress={() => {
              if (c.sampleListingId) {
                router.push(`/(tabs)/donations/marketplace/${c.sampleListingId}`);
              }
            }}
          />
        ))}
      </MapView>
      {loading ? <ActivityIndicator style={styles.loader} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  loader: { position: 'absolute', top: 16, alignSelf: 'center' },
});
