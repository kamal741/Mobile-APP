import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useMemo, useState } from "react";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarDays,
  ChevronRight,
  Clock3,
  MapPin,
  Plus,
  Route,
} from "lucide-react-native";
import { api } from "../../../../lib/api";
import { buildAgentToursListUrl } from "../../../../lib/tourApi";
import type { RootStackParamList } from "../../../../navigation/types";
import { AgentFooter } from "../../components/AgentFooter";

type TourStatus =
  | "scheduled"
  | "in_progress"
  | "completed"
  | "cancelled";

type AgentTourListItem = {
  id: string;
  clientProfileId?: string | number | null;
  clientDisplayName?: string | null;
  scheduledDate?: string | null;
  timezone?: string | null;
  status?: TourStatus | string | null;
  totalDistance?: string | number | null;
  actualDurationMinutes?: number | null;
  estimatedDurationMinutes?: number | null;
  propertyCount?: number | null;
};

type StatusFilter = "all" | TourStatus;

const STATUS_FILTERS: ReadonlyArray<{
  key: StatusFilter;
  label: string;
}> = [
  { key: "all", label: "All" },
  { key: "scheduled", label: "Scheduled" },
  { key: "in_progress", label: "In progress" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
];

const STATUS_THEME: Record<
  TourStatus,
  { foreground: string; background: string; accent: string }
> = {
  scheduled: {
    foreground: "#2563eb",
    background: "#eaf2ff",
    accent: "#3b82f6",
  },
  in_progress: {
    foreground: "#b86600",
    background: "#fff3df",
    accent: "#f59e0b",
  },
  completed: {
    foreground: "#078a62",
    background: "#e8f8f2",
    accent: "#10b981",
  },
  cancelled: {
    foreground: "#c24141",
    background: "#fff0f0",
    accent: "#ef4444",
  },
};

function normalizeStatus(status: unknown): TourStatus {
  if (
    status === "scheduled" ||
    status === "in_progress" ||
    status === "completed" ||
    status === "cancelled"
  ) {
    return status;
  }
  return "scheduled";
}

function statusLabel(status: TourStatus): string {
  return status === "in_progress"
    ? "In progress"
    : status.charAt(0).toUpperCase() + status.slice(1);
}

function formatTourDuration(
  actual: number | null | undefined,
  estimated: number | null | undefined,
): string {
  const minutes = actual && actual > 0 ? actual : estimated;
  if (!minutes || minutes <= 0) {
    return "Not available";
  }
  const prefix = actual && actual > 0 ? "" : "~";
  if (minutes < 60) {
    return `${prefix}${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return `${prefix}${hours}h${remaining > 0 ? ` ${remaining}m` : ""}`;
}

function formatDistance(value: unknown): string {
  const distance = Number(value);
  return Number.isFinite(distance) && distance > 0
    ? `${distance.toFixed(1)} km`
    : "Not calculated";
}

function tourDate(value: unknown): Date | null {
  if (typeof value !== "string" || !value) {
    return null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function TourDateTile({ value, timezone }: Readonly<{ value: unknown; timezone?: string | null }>) {
  const date = tourDate(value);
  if (!date) {
    return (
      <View style={styles.dateTile}>
        <CalendarDays size={20} color="#64748b" strokeWidth={2} />
        <Text style={styles.dateTileFallback}>TBD</Text>
      </View>
    );
  }
  const dateParts = new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    timeZone: timezone || undefined,
    year: "numeric",
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    dateParts.find((p) => p.type === type)?.value ?? "";

  return (
    <View style={styles.dateTile}>
      <Text style={styles.dateTileMonth}>
        {part("month").toUpperCase()}
      </Text>
      <Text style={styles.dateTileDay}>{part("day")}</Text>
      <Text style={styles.dateTileYear}>{part("year")}</Text>
    </View>
  );
}

export function ToursScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const listUrl = buildAgentToursListUrl();

  const {
    data,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery<AgentTourListItem[]>({
    queryKey: [listUrl],
    queryFn: () => api.get(listUrl).then((response) => response.data),
  });

  const allTours = useMemo(
    () => (Array.isArray(data) ? data : []),
    [data],
  );

  const statusCounts = useMemo(() => {
    const counts: Record<StatusFilter, number> = {
      all: allTours.length,
      scheduled: 0,
      in_progress: 0,
      completed: 0,
      cancelled: 0,
    };
    allTours.forEach((tour) => {
      const status = normalizeStatus(tour.status);
      counts[status] += 1;
    });
    return counts;
  }, [allTours]);

  const filteredTours = useMemo(
    () =>
      statusFilter === "all"
        ? allTours
        : allTours.filter(
            (tour) => normalizeStatus(tour.status) === statusFilter,
          ),
    [allTours, statusFilter],
  );

  const openTour = (tour: AgentTourListItem) => {
    navigation.navigate("TourDetails", {
      tourId: tour.id,
      clientProfileId:
        tour.clientProfileId == null
          ? undefined
          : String(tour.clientProfileId),
    });
  };

  const renderTour = ({ item }: { item: AgentTourListItem }) => {
    const status = normalizeStatus(item.status);
    const theme = STATUS_THEME[status];
    const clientName =
      item.clientDisplayName?.trim() || "Client tour";

    return (
      <TouchableOpacity
        style={[styles.tourCard, { borderLeftColor: theme.accent }]}
        onPress={() => openTour(item)}
        activeOpacity={0.84}
        accessibilityRole="button"
        accessibilityLabel={`Open tour with ${clientName}`}
      >
        <View style={styles.cardTopRow}>
          <TourDateTile value={item.scheduledDate} timezone={item.timezone} />

          <View style={styles.tourIdentity}>
            <Text style={styles.tourEyebrow}>CLIENT TOUR</Text>
            <Text style={styles.tourTitle} numberOfLines={2}>
              {clientName}
            </Text>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: theme.background },
              ]}
            >
              <View
                style={[styles.statusDot, { backgroundColor: theme.accent }]}
              />
              <Text style={[styles.statusText, { color: theme.foreground }]}>
                {statusLabel(status)}
              </Text>
            </View>
          </View>

          <View style={styles.openIndicator}>
            <ChevronRight size={18} color="#64748b" strokeWidth={2.3} />
          </View>
        </View>

        <View style={styles.cardDivider} />

        <View style={styles.metricsRow}>
          <View style={styles.metric}>
            <View style={styles.metricIcon}>
              <MapPin size={15} color="#1e40af" strokeWidth={2.2} />
            </View>
            <View style={styles.metricCopy}>
              <Text style={styles.metricLabel}>Distance</Text>
              <Text style={styles.metricValue} numberOfLines={1}>
                {formatDistance(item.totalDistance)}
              </Text>
            </View>
          </View>

          <View style={styles.metricDivider} />

          <View style={styles.metric}>
            <View style={styles.metricIcon}>
              <Clock3 size={15} color="#1e40af" strokeWidth={2.2} />
            </View>
            <View style={styles.metricCopy}>
              <Text style={styles.metricLabel}>
                {item.actualDurationMinutes ? "Time taken" : "Est. time"}
              </Text>
              <Text style={styles.metricValue} numberOfLines={1}>
                {formatTourDuration(
                  item.actualDurationMinutes,
                  item.estimatedDurationMinutes,
                )}
              </Text>
            </View>
          </View>
        </View>

        {status === "in_progress" && (
          <View style={styles.continueHint}>
            <Route size={14} color="#b86600" strokeWidth={2.2} />
            <Text style={styles.continueHintText}>
              Tour underway · Tap to continue
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.filterContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScrollContent}
        >
          {STATUS_FILTERS.map((filter) => {
            const active = statusFilter === filter.key;
            return (
              <TouchableOpacity
                key={filter.key}
                style={[
                  styles.filterButton,
                  active && styles.filterButtonActive,
                ]}
                onPress={() => setStatusFilter(filter.key)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.filterText,
                    active && styles.filterTextActive,
                  ]}
                >
                  {filter.label}
                </Text>
                <View
                  style={[
                    styles.filterCount,
                    active && styles.filterCountActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.filterCountText,
                      active && styles.filterCountTextActive,
                    ]}
                  >
                    {statusCounts[filter.key]}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.listHeading}>
        <View>
          <Text style={styles.listEyebrow}>
            {statusFilter === "all"
              ? "YOUR TOUR SCHEDULE"
              : `${statusLabel(statusFilter as TourStatus).toUpperCase()} TOURS`}
          </Text>
          <Text style={styles.listTitle}>
            {filteredTours.length}{" "}
            {filteredTours.length === 1 ? "tour" : "tours"}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.createInlineButton}
          onPress={() => navigation.navigate("CreateTour")}
          activeOpacity={0.8}
        >
          <Plus size={16} color="#1e40af" strokeWidth={2.5} />
          <Text style={styles.createInlineText}>New tour</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredTours}
        renderItem={renderTour}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          filteredTours.length === 0 && styles.emptyListContent,
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor="#1e40af"
          />
        }
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.emptyContainer}>
              <ActivityIndicator size="large" color="#1e40af" />
              <Text style={styles.emptyText}>Loading tours…</Text>
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIcon}>
                <CalendarDays size={28} color="#1e40af" strokeWidth={1.9} />
              </View>
              <Text style={styles.emptyTitle}>No tours here yet</Text>
              <Text style={styles.emptyText}>
                {statusFilter === "all"
                  ? "Create a tour to start planning a client itinerary."
                  : `There are no ${statusLabel(
                      statusFilter as TourStatus,
                    ).toLowerCase()} tours.`}
              </Text>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => navigation.navigate("CreateTour")}
              >
                <Plus size={16} color="#ffffff" strokeWidth={2.5} />
                <Text style={styles.emptyButtonText}>Create tour</Text>
              </TouchableOpacity>
            </View>
          )
        }
      />

      <AgentFooter active="tours" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f8fc",
  },
  filterContainer: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    backgroundColor: "#ffffff",
  },
  filterScrollContent: {
    gap: 8,
    paddingHorizontal: 16,
  },
  filterButton: {
    minHeight: 38,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 19,
    backgroundColor: "#f8fafc",
  },
  filterButtonActive: {
    borderColor: "#1e40af",
    backgroundColor: "#1e40af",
  },
  filterText: {
    color: "#607089",
    fontSize: 12,
    fontWeight: "600",
  },
  filterTextActive: {
    color: "#ffffff",
    fontWeight: "700",
  },
  filterCount: {
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
    borderRadius: 10,
    backgroundColor: "#e8edf4",
  },
  filterCountActive: {
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  filterCountText: {
    color: "#64748b",
    fontSize: 10,
    fontWeight: "700",
  },
  filterCountTextActive: {
    color: "#ffffff",
  },
  listHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 10,
  },
  listEyebrow: {
    color: "#8290a5",
    fontSize: 9,
    lineHeight: 13,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  listTitle: {
    marginTop: 1,
    color: "#1e293b",
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "800",
  },
  createInlineButton: {
    minHeight: 36,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 11,
    borderWidth: 1,
    borderColor: "#c8d7f3",
    borderRadius: 11,
    backgroundColor: "#f7faff",
  },
  createInlineText: {
    color: "#1e40af",
    fontSize: 11,
    fontWeight: "700",
  },
  listContent: {
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 120,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  tourCard: {
    overflow: "hidden",
    padding: 14,
    borderWidth: 1,
    borderLeftWidth: 4,
    borderColor: "#dfe7f1",
    borderRadius: 18,
    backgroundColor: "#ffffff",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 9,
    elevation: 2,
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  dateTile: {
    width: 58,
    minHeight: 64,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#dbe5f4",
    borderRadius: 14,
    backgroundColor: "#f5f8fd",
  },
  dateTileMonth: {
    color: "#1e40af",
    fontSize: 9,
    lineHeight: 12,
    fontWeight: "800",
    letterSpacing: 0.7,
  },
  dateTileDay: {
    color: "#1e293b",
    fontSize: 22,
    lineHeight: 26,
    fontWeight: "800",
  },
  dateTileYear: {
    color: "#8491a3",
    fontSize: 9,
    lineHeight: 12,
    fontWeight: "600",
  },
  dateTileFallback: {
    marginTop: 4,
    color: "#64748b",
    fontSize: 10,
    fontWeight: "700",
  },
  tourIdentity: {
    flex: 1,
    minWidth: 0,
    marginHorizontal: 12,
  },
  tourEyebrow: {
    color: "#8b98aa",
    fontSize: 9,
    lineHeight: 12,
    fontWeight: "800",
    letterSpacing: 0.7,
  },
  tourTitle: {
    marginTop: 2,
    color: "#1e293b",
    fontSize: 16,
    lineHeight: 21,
    fontWeight: "800",
  },
  statusBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 7,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 10,
    lineHeight: 13,
    fontWeight: "700",
  },
  openIndicator: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    backgroundColor: "#f1f5f9",
  },
  cardDivider: {
    height: 1,
    marginVertical: 12,
    backgroundColor: "#edf1f6",
  },
  metricsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  metric: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
  },
  metricIcon: {
    width: 30,
    height: 30,
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 9,
    backgroundColor: "#edf3ff",
  },
  metricCopy: {
    flex: 1,
    minWidth: 0,
    marginLeft: 8,
  },
  metricLabel: {
    color: "#8a97a8",
    fontSize: 9,
    lineHeight: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  metricValue: {
    marginTop: 1,
    color: "#435269",
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
  },
  metricDivider: {
    width: 1,
    height: 30,
    marginHorizontal: 10,
    backgroundColor: "#e5eaf1",
  },
  continueHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 9,
    backgroundColor: "#fff8ec",
  },
  continueHintText: {
    color: "#9a5b08",
    fontSize: 10,
    fontWeight: "700",
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 36,
    paddingBottom: 80,
  },
  emptyIcon: {
    width: 62,
    height: 62,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
    borderRadius: 20,
    backgroundColor: "#eaf1ff",
  },
  emptyTitle: {
    color: "#1e293b",
    fontSize: 17,
    fontWeight: "800",
  },
  emptyText: {
    marginTop: 5,
    color: "#718096",
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },
  emptyButton: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 16,
    paddingHorizontal: 15,
    borderRadius: 11,
    backgroundColor: "#1e40af",
  },
  emptyButtonText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },
});
