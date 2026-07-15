import React from 'react';
import { View, Text } from 'react-native';
import Svg, { Circle, Path, Polyline } from 'react-native-svg';
import { cardStyles, layoutStyles } from '../styles/shared';
import type { OffersPipeline } from '../types';

// ─── Props ─────────────────────────────────────────────────────────────────────
interface Props {
  offersPipeline: OffersPipeline | null;
  activeClientsCount: number;
  isNarrow: boolean;
}

// ─── PipelineActivityCard ──────────────────────────────────────────────────────
export function PipelineActivityCard({
  offersPipeline,
  activeClientsCount,
  isNarrow,
}: Props) {
  return (
    <View
      style={[
        cardStyles.topCard,
        isNarrow && layoutStyles.fullWidth,
      ]}
    >
      <Text style={cardStyles.cardLabel}>
        PIPELINE &amp; ACTIVITY{' '}
        <Text style={cardStyles.cardLabelLight}>(last 30 days)</Text>
      </Text>

      <Text style={cardStyles.heroNumber}>{offersPipeline?.total ?? 0}</Text>
      <Text style={cardStyles.heroSub}>showings</Text>

      <View style={layoutStyles.divider} />

      {/* Active Clients */}
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
          <Path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <Circle cx={9} cy={7} r={4} />
          <Path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <Path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </Svg>
        <Text style={cardStyles.metaLabel}>Active Clients</Text>
        <Text style={cardStyles.metaValue}>{activeClientsCount}</Text>
      </View>

      {/* Offers Made */}
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
          <Polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
          <Polyline points="16 7 22 7 22 13" />
        </Svg>
        <Text style={cardStyles.metaLabel}>Offers Made</Text>
        <Text style={cardStyles.metaValue}>{offersPipeline?.total ?? 0}</Text>
      </View>

      {/* Offers Accepted */}
      <View style={cardStyles.metaRow}>
        <Svg
          width={14}
          height={14}
          viewBox="0 0 24 24"
          fill="none"
          stroke="#16a34a"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={cardStyles.metaIcon}
        >
          <Path d="M21.801 10A10 10 0 1 1 17 3.335" />
          <Path d="m9 11 3 3L22 4" />
        </Svg>
        <Text style={cardStyles.metaLabel}>Offers Accepted</Text>
        <Text style={[cardStyles.metaValue, cardStyles.metaValueRed]}>
          {offersPipeline?.accepted ?? 0}
        </Text>
      </View>

      {/* Offers Declined */}
      <View style={cardStyles.metaRow}>
        <Svg
          width={14}
          height={14}
          viewBox="0 0 24 24"
          fill="none"
          stroke="#ef4444"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={cardStyles.metaIcon}
        >
          <Circle cx={12} cy={12} r={10} />
          <Path d="m15 9-6 6" />
          <Path d="m9 9 6 6" />
        </Svg>
        <Text style={cardStyles.metaLabel}>Offers Declined</Text>
        <Text style={[cardStyles.metaValue, cardStyles.metaValueRed]}>
          {offersPipeline?.rejected ?? 0}
        </Text>
      </View>
    </View>
  );
}