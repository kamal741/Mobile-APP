// src/screens/agent/RoutePlanning/screens/MiniMap.tsx
import React from 'react';
import {
  Modal,
  TouchableOpacity,
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, {
  Polyline,
  Marker,
  PROVIDER_GOOGLE,
  type LatLng,
  type Region,
} from 'react-native-maps';
import { RoutePlanResponse } from '@/lib/agentRoutePlanningAPI';
import { decodePolyline } from '@/lib/utils';

interface MiniMapProps {
  stops: RoutePlanResponse['stops'];
  start?: RoutePlanResponse['start'] | null;
  overviewPolyline?: string | null;
  viewport?: string | null;
}

function isValidCoordinate(coordinate: LatLng): boolean {
  return (
    Number.isFinite(coordinate.latitude)
    && Number.isFinite(coordinate.longitude)
    && Math.abs(coordinate.latitude) <= 90
    && Math.abs(coordinate.longitude) <= 180
  );
}

function regionForCoordinates(coordinates: LatLng[]): Region | undefined {
  if (coordinates.length === 0) return undefined;

  const latitudes = coordinates.map((coordinate) => coordinate.latitude);
  const longitudes = coordinates.map((coordinate) => coordinate.longitude);
  const minLatitude = Math.min(...latitudes);
  const maxLatitude = Math.max(...latitudes);
  const minLongitude = Math.min(...longitudes);
  const maxLongitude = Math.max(...longitudes);

  return {
    latitude: (minLatitude + maxLatitude) / 2,
    longitude: (minLongitude + maxLongitude) / 2,
    latitudeDelta: Math.max((maxLatitude - minLatitude) * 1.35, 0.02),
    longitudeDelta: Math.max((maxLongitude - minLongitude) * 1.35, 0.02),
  };
}

function toFiniteNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const numeric = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function coordinateFromUnknown(latitude: unknown, longitude: unknown): LatLng | null {
  const parsedLatitude = toFiniteNumber(latitude);
  const parsedLongitude = toFiniteNumber(longitude);
  if (parsedLatitude === null || parsedLongitude === null) return null;
  const coordinate: LatLng = {
    latitude: parsedLatitude,
    longitude: parsedLongitude,
  };
  return isValidCoordinate(coordinate) ? coordinate : null;
}

function isSameCoordinate(a: LatLng, b: LatLng): boolean {
  return (
    Math.abs(a.latitude - b.latitude) < 0.00001
    && Math.abs(a.longitude - b.longitude) < 0.00001
  );
}

function parseViewportRegion(viewport: string | undefined | null): Region | undefined {
  if (!viewport) return undefined;
  try {
    const parsed: unknown = typeof viewport === 'string' ? JSON.parse(viewport) : viewport;
    if (!parsed || typeof parsed !== 'object') return undefined;

    const raw = parsed as Record<string, unknown>;

    const north = toFiniteNumber(raw.north);
    const south = toFiniteNumber(raw.south);
    const east = toFiniteNumber(raw.east);
    const west = toFiniteNumber(raw.west);
    if (
      north !== null
      && south !== null
      && east !== null
      && west !== null
      && north >= south
      && east >= west
    ) {
      return {
        latitude: (north + south) / 2,
        longitude: (east + west) / 2,
        latitudeDelta: Math.max((north - south) * 1.35, 0.02),
        longitudeDelta: Math.max((east - west) * 1.35, 0.02),
      };
    }

    const bounds = (raw.bounds ?? raw.viewport ?? raw) as Record<string, unknown>;
    const northeast = (bounds.northeast ?? bounds.ne) as Record<string, unknown> | undefined;
    const southwest = (bounds.southwest ?? bounds.sw) as Record<string, unknown> | undefined;
    if (northeast && southwest) {
      const neLat = toFiniteNumber(northeast.lat ?? northeast.latitude);
      const neLng = toFiniteNumber(northeast.lng ?? northeast.longitude);
      const swLat = toFiniteNumber(southwest.lat ?? southwest.latitude);
      const swLng = toFiniteNumber(southwest.lng ?? southwest.longitude);
      if (
        neLat !== null
        && neLng !== null
        && swLat !== null
        && swLng !== null
        && neLat >= swLat
        && neLng >= swLng
      ) {
        return {
          latitude: (neLat + swLat) / 2,
          longitude: (neLng + swLng) / 2,
          latitudeDelta: Math.max((neLat - swLat) * 1.35, 0.02),
          longitudeDelta: Math.max((neLng - swLng) * 1.35, 0.02),
        };
      }
    }
  } catch {
    return undefined;
  }

  return undefined;
}

const MiniMap: React.FC<MiniMapProps> = ({
  stops,
  start,
  overviewPolyline,
  viewport,
}) => {
  const mapRef = React.useRef<MapView>(null);
  const fullMapRef = React.useRef<MapView>(null);
  const [fullscreenVisible, setFullscreenVisible] = React.useState(false);
  const [currentRegion, setCurrentRegion] = React.useState<Region | null>(null);
  const sortedStops = React.useMemo(
    () => [...stops].sort((a, b) => a.order - b.order),
    [stops],
  );
  const stopCoordinates = React.useMemo(
    () => sortedStops
      .map((stop) => coordinateFromUnknown(stop.latitude, stop.longitude))
      .filter((coordinate): coordinate is LatLng => coordinate !== null),
    [sortedStops],
  );
  const stopMarkers = React.useMemo(
    () => sortedStops
      .map((stop) => {
        const coordinate = coordinateFromUnknown(stop.latitude, stop.longitude);
        return coordinate ? { id: stop.id, order: stop.order, coordinate } : null;
      })
      .filter(
        (
          marker,
        ): marker is { id: string; order: number; coordinate: LatLng } => marker !== null,
      ),
    [sortedStops],
  );
  const routeCoordinates = React.useMemo(() => {
    try {
      return decodePolyline(overviewPolyline ?? '').filter(isValidCoordinate);
    } catch {
      return [];
    }
  }, [overviewPolyline]);
  const startCoordinate = React.useMemo(() => {
    const explicitStart = coordinateFromUnknown(start?.latitude, start?.longitude);
    if (explicitStart) return explicitStart;
    if (routeCoordinates.length > 0) return routeCoordinates[0];
    if (stopCoordinates.length > 0) return stopCoordinates[0];
    return null;
  }, [start?.latitude, start?.longitude, routeCoordinates, stopCoordinates]);
  const displayRouteCoordinates = React.useMemo(() => {
    const routeBase = routeCoordinates.length > 1 ? routeCoordinates : stopCoordinates;
    if (!startCoordinate) return routeBase;
    if (routeBase.length === 0) return [startCoordinate];
    return isSameCoordinate(startCoordinate, routeBase[0])
      ? routeBase
      : [startCoordinate, ...routeBase];
  }, [routeCoordinates, stopCoordinates, startCoordinate]);
  const fitCoordinates = React.useMemo(() => {
    if (displayRouteCoordinates.length > 0) return displayRouteCoordinates;
    return startCoordinate ? [startCoordinate, ...stopCoordinates] : stopCoordinates;
  }, [displayRouteCoordinates, stopCoordinates, startCoordinate]);
  const viewportRegion = React.useMemo(
    () => parseViewportRegion(viewport),
    [viewport],
  );
  const initialRegion = React.useMemo(
    () => regionForCoordinates(fitCoordinates) ?? viewportRegion,
    [fitCoordinates, viewportRegion],
  );

  const fitMapToRoute = React.useCallback((targetRef: React.RefObject<MapView | null>, animated = false) => {
    if (targetRef.current && fitCoordinates.length > 1) {
      targetRef.current.fitToCoordinates(fitCoordinates, {
        edgePadding: { top: 72, right: 72, bottom: 56, left: 56 },
        animated,
      });
    }
  }, [fitCoordinates]);

  const handleMapReady = React.useCallback(() => {
    fitMapToRoute(mapRef, false);
  }, [fitMapToRoute]);

  const handleFullMapReady = React.useCallback(() => {
    fitMapToRoute(fullMapRef, false);
  }, [fitMapToRoute]);

  React.useEffect(() => {
    if (!fullscreenVisible) return;
    const timer = setTimeout(() => fitMapToRoute(fullMapRef, false), 250);
    return () => clearTimeout(timer);
  }, [fitMapToRoute, fullscreenVisible]);

  const zoomMap = React.useCallback((targetRef: React.RefObject<MapView | null>, direction: 'in' | 'out') => {
    const region = currentRegion ?? initialRegion;
    if (!region) return;
    const factor = direction === 'in' ? 0.55 : 1.75;
    const nextRegion: Region = {
      ...region,
      latitudeDelta: Math.max(region.latitudeDelta * factor, 0.002),
      longitudeDelta: Math.max(region.longitudeDelta * factor, 0.002),
    };
    setCurrentRegion(nextRegion);
    targetRef.current?.animateToRegion(nextRegion, 220);
  }, [currentRegion, initialRegion]);

  const renderMap = (
    targetRef: React.RefObject<MapView | null>,
    onReady: () => void,
    fullscreen = false,
  ) => (
    <MapView
      ref={targetRef}
      provider={PROVIDER_GOOGLE}
      style={StyleSheet.absoluteFillObject}
      initialRegion={initialRegion}
      scrollEnabled={true}
      zoomEnabled={true}
      rotateEnabled={false}
      pitchEnabled={false}
      onRegionChangeComplete={setCurrentRegion}
      onMapReady={onReady}
      onMapLoaded={onReady}
    >
      {displayRouteCoordinates.length > 1 && (
        <Polyline
          coordinates={displayRouteCoordinates}
          strokeColor="#1E40AF"
          strokeWidth={fullscreen ? 5 : 4}
          lineCap="round"
          lineJoin="round"
        />
      )}
      {stopMarkers.map((stop) => (
        <Marker
          key={stop.id}
          coordinate={stop.coordinate}
          zIndex={2}
        >
          <View style={[styles.mapPin, fullscreen && styles.mapPinLarge]}>
            <Text style={[styles.mapPinText, fullscreen && styles.mapPinTextLarge]}>
              {stop.order}
            </Text>
          </View>
        </Marker>
      ))}
      {startCoordinate && (
        <Marker
          key="route-start"
          coordinate={startCoordinate}
          anchor={{ x: 0.5, y: 0.5 }}
          zIndex={4}
        >
          <View collapsable={false} style={styles.startMarkerWrap}>
            <View style={[styles.startPin, fullscreen && styles.startPinLarge]}>
              <Text style={[styles.startPinText, fullscreen && styles.startPinTextLarge]}>S</Text>
            </View>
          </View>
        </Marker>
      )}
    </MapView>
  );

  if (!initialRegion) {
    return (
      <View style={[styles.miniMap, styles.emptyMap]}>
        <Text style={styles.emptyMapTitle}>Route preview unavailable</Text>
        <Text style={styles.emptyMapText}>
          Stop coordinates are not available for this route.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.miniMap}>
      {renderMap(mapRef, handleMapReady)}
      <View style={styles.mapPreviewLabel}>
        <Text style={styles.mapPreviewText}>{stops.length} stops</Text>
      </View>
      <View style={styles.mapControls}>
        <TouchableOpacity
          style={styles.mapControlButton}
          onPress={() => zoomMap(mapRef, 'in')}
          activeOpacity={0.8}
          accessibilityLabel="Zoom in"
          accessibilityRole="button"
        >
          <Text style={styles.mapControlText}>+</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.mapControlButton}
          onPress={() => zoomMap(mapRef, 'out')}
          activeOpacity={0.8}
          accessibilityLabel="Zoom out"
          accessibilityRole="button"
        >
          <Text style={styles.mapControlText}>-</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.mapControlButton}
          onPress={() => setFullscreenVisible(true)}
          activeOpacity={0.8}
          accessibilityLabel="Open large map"
          accessibilityRole="button"
        >
          <Text style={styles.expandControlText}>Full</Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={fullscreenVisible}
        animationType="slide"
        onRequestClose={() => setFullscreenVisible(false)}
      >
        <SafeAreaView style={styles.fullscreenRoot} edges={['top', 'bottom']}>
          <View style={styles.fullscreenHeader}>
            <View>
              <Text style={styles.fullscreenTitle}>Route Map</Text>
              <Text style={styles.fullscreenSub}>{stops.length} stops</Text>
            </View>
            <TouchableOpacity
              style={styles.fullscreenClose}
              onPress={() => setFullscreenVisible(false)}
              activeOpacity={0.8}
              accessibilityLabel="Close large map"
              accessibilityRole="button"
            >
              <Text style={styles.fullscreenCloseText}>x</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.fullscreenMap}>
            {renderMap(fullMapRef, handleFullMapReady, true)}
            <View style={[styles.mapControls, styles.fullscreenControls]}>
              <TouchableOpacity
                style={styles.mapControlButton}
                onPress={() => zoomMap(fullMapRef, 'in')}
                activeOpacity={0.8}
                accessibilityLabel="Zoom in"
                accessibilityRole="button"
              >
                <Text style={styles.mapControlText}>+</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.mapControlButton}
                onPress={() => zoomMap(fullMapRef, 'out')}
                activeOpacity={0.8}
                accessibilityLabel="Zoom out"
                accessibilityRole="button"
              >
                <Text style={styles.mapControlText}>-</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.mapControlButton}
                onPress={() => fitMapToRoute(fullMapRef, true)}
                activeOpacity={0.8}
                accessibilityLabel="Fit route"
                accessibilityRole="button"
              >
                <Text style={styles.fitControlText}>Fit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
};

export default MiniMap;

const styles = StyleSheet.create({
  miniMap: {
    height: 210,
    backgroundColor: '#E8EEF7',
    borderRadius: 15,
    position: 'relative',
    overflow: 'hidden',
  },
  emptyMap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  emptyMapTitle: {
    fontSize: 14,
    lineHeight: 19,
    color: '#1E293B',
    fontWeight: '800',
    textAlign: 'center',
  },
  emptyMapText: {
    marginTop: 4,
    fontSize: 11,
    lineHeight: 16,
    color: '#64748B',
    textAlign: 'center',
  },
  mapPin: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#1E40AF',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapPinText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  mapPinLarge: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  mapPinTextLarge: {
    fontSize: 12,
  },
  startMarkerWrap: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  startPin: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#0F766E',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F172A',
    shadowOpacity: 0.24,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
  },
  startPinText: { color: '#fff', fontSize: 11, fontWeight: '900' },
  startPinLarge: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  startPinTextLarge: {
    fontSize: 12,
  },
  mapPreviewLabel: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
  mapPreviewText: {
    fontSize: 10,
    color: '#1E293B',
    fontWeight: '700',
  },
  mapControls: {
    position: 'absolute',
    top: 10,
    right: 10,
    gap: 7,
  },
  mapControlButton: {
    minWidth: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F172A',
    shadowOpacity: 0.14,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  mapControlText: {
    color: '#1E293B',
    fontSize: 22,
    lineHeight: 24,
    fontWeight: '800',
  },
  expandControlText: {
    color: '#1E293B',
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '800',
  },
  fitControlText: {
    color: '#1E293B',
    fontSize: 11,
    fontWeight: '900',
  },
  fullscreenRoot: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  fullscreenHeader: {
    minHeight: 62,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#CBD5E1',
  },
  fullscreenTitle: {
    color: '#0F172A',
    fontSize: 18,
    fontWeight: '900',
  },
  fullscreenSub: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  fullscreenClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EEF2F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullscreenCloseText: {
    color: '#334155',
    fontSize: 18,
    lineHeight: 20,
    fontWeight: '800',
  },
  fullscreenMap: {
    flex: 1,
    position: 'relative',
    margin: 12,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#E8EEF7',
  },
  fullscreenControls: {
    top: 18,
    right: 18,
  },
});
