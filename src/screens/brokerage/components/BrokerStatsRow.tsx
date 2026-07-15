import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Users, Home, ClipboardList, TrendingUp } from 'lucide-react-native';
import { ClientStatCard } from '@/screens/agent/ClientDashboard';
import { colors, spacing } from '../styles/shared.styles';

export interface BrokerStats {
  totalAgents: number;
  activeListings: number;
  totalClients: number;
  activeOffers: number;
}

interface Props {
  stats: BrokerStats;
}

export function BrokerStatsRow({ stats }: Props) {
  const cards = [
    { icon: <Users size={25} color={colors.brandLight} />,         label: 'Total Agents',    value: stats.totalAgents },
    { icon: <Home size={25} color={colors.success} />,             label: 'Active Listings', value: stats.activeListings },
    { icon: <ClipboardList size={25} color={colors.purple} />,     label: 'Total Clients',   value: stats.totalClients },
    { icon: <TrendingUp size={25} color={colors.success} />,       label: 'Active Offers',   value: stats.activeOffers },
  ];

  return (
    <View style={styles.row}>
      {cards.map((card) => (
        <ClientStatCard
          key={card.label}
          icon={card.icon}
          label={card.label}
          value={card.value}
          isSmallScreen
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.md,
    paddingBottom: 14,
    gap: spacing.sm + 2,
    backgroundColor: colors.bgPage,
  },
});
