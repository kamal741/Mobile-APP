import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Plus } from 'lucide-react-native';
import { colors, spacing } from '../styles/shared.styles';

interface Props {
  onAddClient: () => void;
}

export function ClientsHeader({ onAddClient }: Props) {
  return (
    <View style={styles.header}>
      <View style={styles.top}>
        <View style={styles.textWrap}>
          <Text style={styles.subtitle}>
            Manage your client relationships and track their property journey
          </Text>
        </View>
        <View style={styles.actions}>
          <TouchableOpacity style={styles.addBtn} onPress={onAddClient}>
            <Plus size={14} color={colors.textInverted} style={{ marginRight: 5 }} />
            <Text style={styles.addBtnText}>Add Client</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  top: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm + 2,
  },
  textWrap: { flex: 1, minWidth: 180 },
  subtitle: { fontSize: 13, color: colors.textMuted, lineHeight: 18 },
  actions:  { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginLeft: 'auto' },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: spacing.sm,
    backgroundColor: colors.brand,
  },
  addBtnText: { fontSize: 12, fontWeight: '600', color: colors.textInverted },
});
