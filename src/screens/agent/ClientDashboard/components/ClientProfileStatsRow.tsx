import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ClientProfileStats } from '../types/client.types';
import { colors, spacing } from '../styles/shared.styles';

interface Props {
  stats: ClientProfileStats;
}

const STAT_ITEMS = [
  { key: 'totalTours',      label: 'Tours' },
  { key: 'totalShortlists', label: 'Shortlists' },
  { key: 'totalOffers',     label: 'Offers' },
] as const;

export function ClientProfileStatsRow({ stats }: Props) {
  return (
    <View style={styles.row}>
      {STAT_ITEMS.map(({ key, label }) => (
        <View key={key} style={styles.box}>
          <Text style={styles.value}>{stats[key]}</Text>
          <Text style={styles.label}>{label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: 24,
  },
  box: {
    flex: 1,
    backgroundColor: colors.bgCard,
    padding: spacing.lg,
    borderRadius: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  value: { fontSize: 20, fontWeight: '700', color: colors.brand },
  label: { fontSize: 12, color: colors.textMuted, marginTop: spacing.xs },
});
