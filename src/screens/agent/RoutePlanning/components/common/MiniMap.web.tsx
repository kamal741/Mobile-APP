// src/screens/agent/RoutePlanning/screens/MiniMap.web.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { RoutePlanResponse } from '@/lib/agentRoutePlanningAPI';
import { MapPin } from 'lucide-react-native';

interface MiniMapProps {
  stops: RoutePlanResponse['stops'];
  overviewPolyline: string;
  viewport: string;
}

const MiniMap: React.FC<MiniMapProps> = ({ stops }) => (
  <View style={styles.miniMap}>
    <View style={[styles.road, styles.roadOne]} />
    <View style={[styles.road, styles.roadTwo]} />
    <View style={styles.routeLine} />
    <View style={[styles.pin, styles.pinStart]}>
      <MapPin size={16} color="#FFFFFF" fill="#1E40AF" />
    </View>
    <View style={[styles.pin, styles.pinEnd]}>
      <Text style={styles.pinText}>{Math.max(stops.length, 1)}</Text>
    </View>
    <View style={styles.placeholder}>
      <Text style={styles.placeholderTitle}>Route map</Text>
      <Text style={styles.placeholderSub}>Open on mobile for the interactive view</Text>
    </View>
    <View style={styles.mapPreviewLabel}>
      <Text style={styles.mapPreviewText}>{stops.length} stops</Text>
    </View>
  </View>
);

export default MiniMap;

const styles = StyleSheet.create({
  miniMap: {
    height: 190,
    backgroundColor: '#E9EFF7',
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  road: {
    position: 'absolute',
    height: 14,
    width: '130%',
    backgroundColor: 'rgba(255,255,255,0.72)',
  },
  roadOne: {
    transform: [{ rotate: '-18deg' }],
    top: 36,
  },
  roadTwo: {
    transform: [{ rotate: '24deg' }],
    bottom: 28,
  },
  routeLine: {
    position: 'absolute',
    width: 4,
    height: 112,
    borderRadius: 2,
    backgroundColor: '#1E40AF',
    transform: [{ rotate: '48deg' }],
  },
  pin: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E40AF',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  pinStart: {
    left: '27%',
    bottom: 30,
  },
  pinEnd: {
    right: '25%',
    top: 24,
  },
  pinText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '800',
  },
  placeholder: {
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.94)',
    paddingHorizontal: 14,
    paddingVertical: 9,
    alignItems: 'center',
  },
  placeholderTitle: {
    fontSize: 13,
    color: '#1E293B',
    fontWeight: '800',
  },
  placeholderSub: {
    marginTop: 2,
    fontSize: 9,
    color: '#64748B',
  },
  mapPreviewLabel: {
    position: 'absolute',
    top: 10,
    right: 10,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
  mapPreviewText: {
    fontSize: 11,
    color: '#1E293B',
    fontWeight: '700',
  },
});
