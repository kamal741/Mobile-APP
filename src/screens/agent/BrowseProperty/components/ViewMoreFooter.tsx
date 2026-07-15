// components/ViewMoreFooter.tsx
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

type Props = {
  totalElements: number;
  loadedCount: number;
  onLoadMore: () => void;
};

export function ViewMoreFooter({ totalElements, loadedCount, onLoadMore }: Props) {
  return (
    <View style={styles.viewMoreWrap}>
      <TouchableOpacity
        style={styles.viewMoreButton}
        onPress={onLoadMore}
        activeOpacity={0.85}
      >
        <Text style={styles.viewMoreButtonText}>
          View More ({Math.max(0, totalElements - loadedCount)} left)
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  viewMoreWrap: {
    paddingTop: 6,
    paddingBottom: 14,
    alignItems: "center",
  },
  viewMoreButton: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 999,
  },
  viewMoreButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1e40af",
  },
});
