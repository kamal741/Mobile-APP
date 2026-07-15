import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Users, Home, UserCheck } from 'lucide-react-native';
import { BrokerAgentClient } from '../../../../lib/brokerApi';
import { colors, radius, spacing } from '../../styles/shared.styles';

interface Props {
  clients: BrokerAgentClient[];
  total:   number;
}

export function AgentClientStatsRow({ clients, total }: Props) {
  const buyers  = clients.filter((c) => c.clientType === 'BUYER').length;
  const renters = clients.filter((c) => c.clientType === 'RENTER').length;

  const cards = [
    { icon: <Users size={22} color={colors.brandLight} />,  label: 'Total Clients', value: total,   accent: colors.brandLight },
    { icon: <Home  size={22} color={colors.success} />,     label: 'Buyers',        value: buyers,  accent: colors.success },
    { icon: <UserCheck size={22} color={colors.purple} />,  label: 'Renters',       value: renters, accent: colors.purple },
  ];

  return (
    <View style={styles.row}>
      {cards.map((card) => (
        <View key={card.label} style={styles.card}>
          <View style={styles.iconWrap}>{card.icon}</View>
          <Text style={[styles.value, { color: card.accent }]}>{card.value}</Text>
          <Text style={styles.label}>{card.label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.sm + 2,
  },
  card: {
    flex: 1,
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: 4,
  },
  iconWrap: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  value: { fontSize: 20, fontWeight: '700' },
  label: { fontSize: 10, color: colors.textMuted, fontWeight: '500', textAlign: 'center' },
});
