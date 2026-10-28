// Native map (Apple Maps on iOS, Google Maps on Android) with clustered pins + ride route line.
import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, Polyline, type Region } from 'react-native-maps';
import { mapWorldColor } from '@kc/domain';
import { clusterGlyph, type KcMapProps } from './KcMap.types';

export function KcMap(p: Readonly<KcMapProps>) {
  const ref = useRef<MapView>(null);

  useEffect(() => {
    if (p.focus) ref.current?.animateToRegion(p.focus.region as Region, 350);
  }, [p.focus]);

  return (
    <MapView
      ref={ref}
      style={StyleSheet.absoluteFill}
      initialRegion={p.initialRegion as Region}
      showsUserLocation={p.userLocation != null}
      showsMyLocationButton={false}
      toolbarEnabled={false}
      rotateEnabled={false}
      pitchEnabled={false}
      onRegionChangeComplete={(r) => p.onRegionChange(r)}
      onPress={(e) => {
        if (e.nativeEvent.action !== 'marker-press') p.onPressMap();
      }}
    >
      {p.clusters.map((c) => {
        const multi = c.pins.length > 1;
        const selected = !multi && c.pins[0]?.listingId === p.selectedId;
        const color = mapWorldColor(c.worldSlug);
        return (
          <Marker
            key={c.key}
            coordinate={{ latitude: c.lat, longitude: c.lng }}
            onPress={() => p.onPressCluster(c)}
            tracksViewChanges={false}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View
              style={[
                multi ? styles.cluster : styles.pin,
                { backgroundColor: multi ? color : '#FFFFFF', borderColor: color },
                selected && styles.selected,
              ]}
            >
              <Text style={multi ? styles.clusterText : styles.pinText}>{clusterGlyph(c)}</Text>
            </View>
          </Marker>
        );
      })}
      {p.route ? (
        <>
          <Polyline
            coordinates={[
              { latitude: p.route.originLat, longitude: p.route.originLng },
              { latitude: p.route.destLat, longitude: p.route.destLng },
            ]}
            strokeColor={mapWorldColor('rides')}
            strokeWidth={4}
            lineDashPattern={[8, 6]}
          />
          <Marker coordinate={{ latitude: p.route.destLat, longitude: p.route.destLng }} pinColor="#2563EB" />
        </>
      ) : null}
    </MapView>
  );
}

const styles = StyleSheet.create({
  pin: {
    width: 36, height: 36, borderRadius: 18, borderWidth: 2, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 3,
  },
  cluster: {
    minWidth: 40, height: 40, paddingHorizontal: 6, borderRadius: 20, borderWidth: 3, alignItems: 'center',
    justifyContent: 'center', elevation: 3,
  },
  selected: { transform: [{ scale: 1.25 }], borderWidth: 3 },
  pinText: { fontSize: 18 },
  clusterText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
});
