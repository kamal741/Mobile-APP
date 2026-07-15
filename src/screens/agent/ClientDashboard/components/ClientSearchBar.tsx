import React from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { Search } from 'lucide-react-native';
import { colors, radius, spacing } from '../styles/shared.styles';

interface Props {
  value:         string;
  onChangeText:  (text: string) => void;
}

export function ClientSearchBar({ value, onChangeText }: Props) {
  return (
    <View style={styles.box}>
      <Search size={16} color={colors.textDisabled} style={{ marginRight: spacing.sm }} />
      <TextInput
        style={styles.input}
        placeholder="Search clients by name or email..."
        placeholderTextColor={colors.textDisabled}
        value={value}
        onChangeText={onChangeText}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    height: 40,
  },
  input: {
    flex: 1,
    fontSize: 13,
    color: colors.textSecondary,
  },
});
