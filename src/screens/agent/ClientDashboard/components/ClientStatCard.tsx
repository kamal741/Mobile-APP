import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radius, spacing } from '../styles/shared.styles';

interface Props {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  isSmallScreen?: boolean;
}

export function ClientStatCard({ icon, label, value, isSmallScreen }: Props) {
  return (
    <View style={[styles.card, isSmallScreen && styles.cardHalf]}>
      <View style={styles.left}>
        <View style={styles.iconWrap}>{icon}</View>
      </View>

      <View style={styles.right}>
        <View style={styles.titleBox}>
          <Text style={styles.label}>{label}</Text>
        </View>

        <View style={styles.valueBox}>
          <Text style={styles.value}>{value}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 8,
    overflow: 'hidden',
  },

  cardHalf: {
    flexBasis: '48%',
    flexGrow: 1,
    flexShrink: 0,
  },

  left: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },

  iconWrap: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },

  right: {
    flex: 1,
    justifyContent: 'center',
    paddingRight: spacing.md,
  },

  titleBox: {
    marginBottom: 0,
  },

  valueBox: {},

  label: {
    fontSize: 14,
    color: colors.textMuted,
    fontWeight: '500',
  },

  value: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
  },
});


