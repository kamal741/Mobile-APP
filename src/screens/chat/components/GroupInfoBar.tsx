import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ChevronRight, Users } from 'lucide-react-native';
import { colors, border, fontSize, fontWeight } from '@/theme';

interface GroupInfoBarProps {
  memberCount: number;
  onPress: () => void;
}

export function GroupInfoBar({ memberCount, onPress }: Readonly<GroupInfoBarProps>) {
  return (
    <TouchableOpacity style={styles.bar} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.left}>
        <Users size={16} color={colors.primary.default} />
        <Text style={styles.text}>
          {memberCount} member{memberCount === 1 ? '' : 's'}
        </Text>
      </View>
      <View style={styles.right}>
        <Text style={styles.action}>View members</Text>
        <ChevronRight size={16} color={colors.text.muted} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: colors.background.surface,
    borderRadius: border.radius['2xl'],
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  text: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text.primary,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  action: {
    fontSize: fontSize.sm,
    color: colors.text.secondary,
  },
});
