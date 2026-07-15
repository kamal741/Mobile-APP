import React from 'react';
import { View, Text } from 'react-native';
import { progressBarStyles as S } from '../styles/progressStyles';

interface Props {
  answered: number;
  total:    number;
  /** When set, used instead of recalculating from answered/total (e.g. budget = 2 API keys). */
  percent?: number;
}

export function ProgressBar({ answered, total, percent }: Props) {
  const pct = percent ?? (total > 0 ? Math.round((answered / total) * 100) : 0);

  return (
    <View style={S.progressCard}>
      <View style={S.progressTop}>
        <Text style={S.progressLabel}>Profile Completeness</Text>
        <View style={S.progressBadge}>
          <Text style={S.progressBadgeTxt}>{pct}%</Text>
        </View>
      </View>
      <View style={S.progressTrack}>
        <View style={[S.progressFill, { width: `${pct}%` as any }]} />
      </View>
      <Text style={S.progressSub}>{answered} of {total} preferences set</Text>
    </View>
  );
}
