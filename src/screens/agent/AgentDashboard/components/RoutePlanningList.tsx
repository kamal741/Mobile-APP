import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../../../navigation/types';
import { scheduleStyles } from '../styles/schedule';
import type { Tour } from '../types';
import { tourClientLabel, formatDistance } from '../utils';
import { NormalButton } from '@/components/common/ST_Buttons';

// ─── Props ─────────────────────────────────────────────────────────────────────
interface Props {
  tours: Tour[];
}

// ─── StatusBadge ───────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: Tour['status'] }) {
  const badgeMap: Record<Tour['status'], object> = {
    requested: scheduleStyles.badgeRequested,
    scheduled: scheduleStyles.badgeScheduled,
    in_progress: scheduleStyles.badgeInProgress,
    completed: scheduleStyles.badgeCompleted,
    cancelled: scheduleStyles.badgeCancelled,
  };

  return (
    <View style={[scheduleStyles.statusBadge, badgeMap[status]]}>
      <Text style={scheduleStyles.statusBadgeText}>
        {status.replace('_', ' ')}
      </Text>
    </View>
  );
}

// ─── RouteCard ─────────────────────────────────────────────────────────────────
function RouteCard({ tour }: { tour: Tour }) {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    // console.log('TourID:', tour.id);
  return (
    <View style={scheduleStyles.routeCard}>
      <View style={scheduleStyles.routeHeader}>
        <View style={scheduleStyles.routeInfo}>
          <Text style={scheduleStyles.tourAddress} numberOfLines={1}>
            {tour.propertyAddress || 'Property Tour'}
          </Text>
          <Text style={scheduleStyles.tourClient}>
            with {tourClientLabel(tour)}
          </Text>
        </View>
        <StatusBadge status={tour.status} />
      </View>
      
      <View style={scheduleStyles.routeMetaRow}>
        <Text style={scheduleStyles.routeMetaLabel}>Distance</Text>
        <Text style={scheduleStyles.routeMetaValue}>
          {formatDistance(tour.totalDistance)}
        </Text>
      </View>

      <View style={scheduleStyles.routeActions}>
        <TouchableOpacity
          style={scheduleStyles.routePrimaryBtn}
          onPress={() => navigation.navigate('TourDetails', {
          tourId: tour.id,
          clientProfileId: String(tour.clientProfileId), // ← ADD THIS
        })}
          activeOpacity={0.85}
        >
          <Text style={scheduleStyles.routePrimaryBtnText}>Open Tour</Text>
          
        </TouchableOpacity>
        <NormalButton
                label="Route Plan"
                variant="primary"
                size="sm"
                fullWidth={true}
                onPress={() =>
                  navigation.navigate("RouteDetails", { tourId: tour.id })
                }
              />

      </View>
    </View>
  );
}

// ─── RoutePlanningList ─────────────────────────────────────────────────────────
export function RoutePlanningList({ tours }: Props) {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  if (tours.length === 0) {
    return (
      <View style={scheduleStyles.emptyScheduleWrap}>
        <Text style={scheduleStyles.emptyCalIcon}>🗺</Text>
        <Text style={scheduleStyles.emptyScheduleText}>
          No tours scheduled today
        </Text>
        <TouchableOpacity
          style={scheduleStyles.scheduleTourBtn}
          onPress={() => navigation.navigate('CreateTour')}
        >
          <Text style={scheduleStyles.scheduleTourBtnText}>
            + Schedule a Tour
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={scheduleStyles.routeListScroll}
      contentContainerStyle={scheduleStyles.routeListContent}
      showsVerticalScrollIndicator
      nestedScrollEnabled
    >
      {tours.map((tour) => (
        <RouteCard key={tour.id} tour={tour} />
      ))}
    </ScrollView>
  );
}
