import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ChevronDown } from 'lucide-react-native';
import { ClientSearchBar } from './ClientSearchBar';
import { PickerModal } from './PickerModal';
import { FILTER_OPTIONS } from '../constants/clients.constants';
import { FilterType } from '../types/client.types';
import { filterTypeLabel } from '../utils/client.utils';
import { colors, radius, spacing } from '../styles/shared.styles';

interface Props {
  searchQuery:        string;
  onSearchChange:     (text: string) => void;
  filterType:         FilterType;
  onFilterChange:     (type: FilterType) => void;
  showFilterPicker:   boolean;
  onToggleFilterPicker: () => void;
  onCloseFilterPicker:  () => void;
}

export function ClientSearchFilterBar({
  searchQuery,
  onSearchChange,
  filterType,
  onFilterChange,
  showFilterPicker,
  onToggleFilterPicker,
  onCloseFilterPicker,
}: Props) {
  return (
    <View style={styles.wrapper}>
      <ClientSearchBar value={searchQuery} onChangeText={onSearchChange} />

      <TouchableOpacity style={styles.filterBtn} onPress={onToggleFilterPicker}>
        <Text style={styles.filterText}>{filterTypeLabel(filterType)}</Text>
        <ChevronDown size={16} color={colors.textBody} />
      </TouchableOpacity>

      <PickerModal
        visible={showFilterPicker}
        title="Filter by Type"
        options={FILTER_OPTIONS}
        selected={filterType}
        onSelect={onFilterChange}
        onClose={onCloseFilterPicker}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.sm,
    backgroundColor: colors.bgPage,
  },
  filterBtn: {
    width: 118,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    height: 40,
  },
  filterText: { fontSize: 13, color: colors.textBody, fontWeight: '500' },
});
