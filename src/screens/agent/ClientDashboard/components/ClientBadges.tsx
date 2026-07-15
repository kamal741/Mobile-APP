import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radius, spacing } from '../styles/shared.styles';

interface Props {
  hasActiveOffers: boolean;
  isInactive:      boolean;
  isBuyer:         boolean;
  isRenter:        boolean;
}

export function ClientBadges({ hasActiveOffers, isInactive, isBuyer, isRenter }: Props) {
  return (
    <View style={styles.row}>
      {hasActiveOffers && (
        <View style={styles.activeOffers}>
          <Text style={styles.activeOffersText}>Active Offers</Text>
        </View>
      )}
      {isInactive && (
        <View style={styles.inactive}>
          <Text style={styles.inactiveText}>Inactive</Text>
        </View>
      )}
      {isBuyer && (
        <View style={styles.buyer}>
          <Text style={styles.buyerText}>Buyer</Text>
        </View>
      )}
      {isRenter && (
        <View style={styles.renter}>
          <Text style={styles.renterText}>Renter</Text>
        </View>
      )}
    </View>
  );
}

const badgeBase = {
  borderRadius: radius.sm,
  paddingHorizontal: 6,
  paddingVertical: 2,
} as const;

const badgeText = {
  fontSize: 10,
} as const;

const styles = StyleSheet.create({
  row:              { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.xs },
  activeOffers:     { ...badgeBase, backgroundColor: colors.danger },
  activeOffersText: { ...badgeText, fontWeight: '600', color: colors.textInverted },
  inactive:         { ...badgeBase, backgroundColor: colors.bgMuted, borderWidth: 1, borderColor: colors.border },
  inactiveText:     { ...badgeText, fontWeight: '500', color: colors.textMuted },
  buyer:            { ...badgeBase, backgroundColor: colors.successBg, borderWidth: 1, borderColor: colors.successBorder },
  buyerText:        { ...badgeText, fontWeight: '500', color: colors.success },
  renter:           { ...badgeBase, backgroundColor: colors.purpleBg, borderWidth: 1, borderColor: colors.purpleBorder },
  renterText:       { ...badgeText, fontWeight: '500', color: colors.purple },
});
