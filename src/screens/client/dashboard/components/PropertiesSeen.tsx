/**
 * Client dashboard — property feedback (4-up row) + agent time/distance on completed tours.
 */

import type { ReactNode } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import {
  Home,
  Heart,
  ThumbsDown,
  Gift,
  Clock,
  MapPin,
} from "lucide-react-native";
import { useClientStats, useClientTours } from "../../../../lib/clientApi";
import { useNavigation } from "@react-navigation/core";

const ICON_SIZE = 20;

export function PropertiesSeen() {
  const { data: stats } = useClientStats();
  const { data: tours = [] } = useClientTours();
  const navigation = useNavigation<any>();

  const completedTours = tours.filter((t) => t.status === "completed");
  const completedCount = completedTours.length;

  const liked = stats?.propertySeen?.liked ?? 0;
  const rejected = stats?.propertySeen?.rejected ?? 0;
  const totalSeen = stats?.propertySeen?.total ?? 0;
  const offersMade = stats?.offers?.total ?? 0;

  const agentKm = completedTours.reduce(
    (sum, t) => sum + (t.totalDistance ?? 0),
    0,
  );
  const agentMinutes = completedTours.reduce(
    (sum, t) => sum + (t.actualDurationMinutes ?? 0),
    0,
  );

  const goToRatings = (initialTab: "all" | "liked" | "rejected") => {
    navigation.navigate("PropertyRatings", { initialTab });
  };

  return (
    <View style={styles.wrapper}>
      <Text style={styles.sectionTitle}>Properties seen</Text>

      <View style={styles.cardsRow}>
        <StatCard
          label="Viewed"
          value={totalSeen}
          icon={<Home size={ICON_SIZE} color="#4F46E5" strokeWidth={2.2} />}
          iconBg="#EEF2FF"
          onPress={() => goToRatings("all")}
        />
        <StatCard
          label="Liked"
          value={liked}
          icon={<Heart size={ICON_SIZE} color="#DB2777" strokeWidth={2.2} />}
          iconBg="#FDF2F8"
          onPress={() => goToRatings("liked")}
        />
        <StatCard
          label="Rejected"
          value={rejected}
          icon={<ThumbsDown size={ICON_SIZE} color="#DC2626" strokeWidth={2.2} />}
          iconBg="#FEF2F2"
          onPress={() => goToRatings("rejected")}
        />
        <StatCard
          label="Offers"
          value={offersMade}
          icon={<Gift size={ICON_SIZE} color="#EA580C" strokeWidth={2.2} />}
          iconBg="#FFF7ED"
          onPress={() => navigation.navigate("ClientOfferList")}
        />
      </View>

    </View>
  );
}

function StatCard({
  label,
  value,
  icon,
  iconBg,
  onPress,
}: {
  label: string;
  value: number;
  icon: ReactNode;
  iconBg: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.75}
      style={styles.statCard}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${value}`}
    >
      <View style={[styles.statIconCircle, { backgroundColor: iconBg }]}>
        {icon}
      </View>
      <Text style={styles.statValue} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.statLabel} numberOfLines={1}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function AgentMetric({
  icon,
  iconBg,
  label,
  value,
}: {
  icon: ReactNode;
  iconBg: string;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.agentMetric} accessibilityLabel={`${label}: ${value}`}>
      <View style={[styles.agentIconCircle, { backgroundColor: iconBg }]}>
        {icon}
      </View>
      <View style={styles.agentText}>
        <Text style={styles.agentValue} numberOfLines={1}>
          {value}
        </Text>
        <Text style={styles.agentLabel} numberOfLines={2}>
          {label}
        </Text>
      </View>
    </View>
  );
}

/** Total minutes → `H:MM` (e.g. 0:01, 1:30, 12:05) so large minute counts stay readable. */
function formatAgentTime(totalMinutes: number): string {
  if (totalMinutes <= 0) return "—";
  const total = Math.round(totalMinutes);
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  return `${hours}:${minutes.toString().padStart(2, "0")}`;
}

function formatDistance(km: number): string {
  if (km <= 0) return "—";
  if (km < 1) return `${Math.round(km * 1000)} m`;
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km)} km`;
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 8,
  },
  cardsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
  },
  statCard: {
    flex: 1,
    minWidth: 0,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 4,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F1F5F9",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  statIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  statValue: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F172A",
    lineHeight: 26,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#64748B",
    marginTop: 2,
    textAlign: "center",
  },
  agentSectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  agentSectionSubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
    marginBottom: 8,
    lineHeight: 16,
  },
  agentRow: {
    flexDirection: "row",
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingVertical: 12,
    paddingHorizontal: 6,
  },
  agentDivider: {
    width: 1,
    backgroundColor: "#E2E8F0",
    marginVertical: 2,
  },
  agentMetric: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 4,
  },
  agentIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  agentText: {
    flex: 1,
    minWidth: 0,
  },
  agentValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  agentLabel: {
    fontSize: 11,
    fontWeight: "500",
    color: "#64748B",
    marginTop: 1,
  },
});
