import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Svg, { Circle, Path, Polyline, Line } from 'react-native-svg';
import { cardStyles, layoutStyles } from '../styles/shared';
import type { StatsResponse } from '../types';

// ─── Props ─────────────────────────────────────────────────────────────────────
interface Props {
  stats?: StatsResponse;
  isNarrow: boolean;
  onPressPendingRequests?: () => void;
}

// ─── TourActivityCard ──────────────────────────────────────────────────────────
export function TourActivityCard({ stats, isNarrow, onPressPendingRequests }: Props) {
  return (
    <View
      style={[
        cardStyles.topCard,
        isNarrow && layoutStyles.fullWidth,
      ]}
    >
      <Text style={cardStyles.cardLabel}>TOUR ACTIVITY</Text>

      <Text style={cardStyles.heroNumber}>{stats?.todayTours ?? 0}</Text>
      <Text style={cardStyles.heroSub}>tours today</Text>

      <View style={layoutStyles.divider} />

      {/* Weekly km */}
      <View style={cardStyles.metaRow}>
        <Svg
          width={14}
          height={14}
          viewBox="0 0 24 24"
          fill="none"
          stroke="#64748b"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={cardStyles.metaIcon}
        >
          <Path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />
          <Circle cx={12} cy={10} r={3} />
        </Svg>
        <Text style={cardStyles.metaLabel}>Weekly km</Text>
        <Text style={cardStyles.metaValue}>
          {Math.round(stats?.weeklyDistance ?? 0)}
        </Text>
      </View>

      {/* Time Invested */}
      <View style={cardStyles.metaRow}>
        <Svg
          width={14}
          height={14}
          viewBox="0 0 24 24"
          fill="none"
          stroke="#64748b"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={cardStyles.metaIcon}
        >
          <Circle cx={12} cy={12} r={10} />
          <Polyline points="12 6 12 12 16 14" />
        </Svg>
        <Text style={cardStyles.metaLabel}>Time Invested</Text>
        <Text style={cardStyles.metaValue}>
          {Math.round(stats?.timeInvestedHours ?? 0)}h
        </Text>
      </View>

      {/* Pending Requests */}
      <TouchableOpacity
        activeOpacity={onPressPendingRequests ? 0.6 : 1}
        onPress={onPressPendingRequests}
        disabled={!onPressPendingRequests}
        style={cardStyles.metaRow}
      >
        <Svg
          width={14}
          height={14}
          viewBox="0 0 24 24"
          fill="none"
          stroke="#2563eb"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={cardStyles.metaIcon}
        >
          <Circle cx={12} cy={12} r={10} />
          <Line x1={12} x2={12} y1={8} y2={12} />
          <Line x1={12} x2={12.01} y1={16} y2={16} />
        </Svg>
        <Text style={cardStyles.metaLabel}>Pending Requests</Text>
        <Text style={[cardStyles.metaValue, cardStyles.metaValueBlue]}>
          {stats?.pendingRequests ?? 0}
        </Text>
      </TouchableOpacity>
    </View>
  );
}



