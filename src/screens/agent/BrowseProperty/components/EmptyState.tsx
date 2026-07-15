// components/EmptyState.tsx
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { PropertyFilters, countActivePropertyFilters } from "../../../../lib/propertyApi";

type Props = {
  filters: PropertyFilters;
  onClearFilters: () => void;
};

export function EmptyState({ filters, onClearFilters }: Props) {
  const hasActiveFilters = countActivePropertyFilters(filters) > 0;

  return (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>🏠</Text>
      <Text style={styles.emptyTitle}>No Properties Found</Text>
      <Text style={styles.emptyText}>Try adjusting your search or filters</Text>
      {hasActiveFilters && (
        <TouchableOpacity style={styles.clearAllButton} onPress={onClearFilters}>
          <Text style={styles.clearAllText}>Clear Filters</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  emptyContainer: {
    alignItems: "center",
    paddingTop: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1e293b",
  },
  emptyText: {
    fontSize: 14,
    color: "#64748b",
    marginTop: 4,
    marginBottom: 20,
  },
  clearAllButton: {
    paddingVertical: 11,
    paddingHorizontal: 24,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#cbd5e1",
    alignItems: "center",
  },
  clearAllText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748b",
  },
});
