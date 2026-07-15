import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ChevronRight, Star } from 'lucide-react-native';
import { colors, spacing } from '../styles/shared.styles';

interface Props {
  icon:          React.ReactNode;
  label:         string;
  badge?:        number;
  showStarBadge?: boolean;
  onPress:       () => void;
}

export function ProfileMenuItem({ icon, label, badge, showStarBadge, onPress }: Props) {
  return (
    <TouchableOpacity style={styles.item} onPress={onPress}>
      <View style={styles.left}>
        {icon}
        <Text style={styles.label}>{label}</Text>
      </View>
      <View style={styles.right}>
        {showStarBadge && <Star size={18} color="#f59e0b" fill="#f59e0b" />}
        {!!badge && badge > 0 && (
          <Text style={styles.badge}>{badge}</Text>
        )}
        <ChevronRight size={20} color="#cbd5e1" />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.bgCard,
    padding: spacing.lg,
    borderRadius: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  left:  { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  right: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  label: { fontSize: 16, fontWeight: '500', color: '#334155' },
  badge: {
    backgroundColor: colors.bgHover,
    color: colors.brand,
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 10,
    overflow: 'hidden',
  },
});
