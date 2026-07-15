import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { MapPin, Navigation } from "lucide-react-native";
import { useClientTours } from "../../../../lib/clientApi";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../../../../components/Card";
import { getVariantColor, IconButton } from "@/components/common/ST_Buttons";

// Approximate height of one tour card including margin (card padding + content + marginBottom)
const CARD_HEIGHT = 120;
const VISIBLE_CARDS = 3;
const SCROLL_VIEW_HEIGHT = CARD_HEIGHT * VISIBLE_CARDS;

function TourCard({ tour }: { tour: any }) {
  const navigation = useNavigation<any>();

  const tourDate = new Date(tour.scheduledDate);

  const formattedDate = tourDate.toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  });

  const formattedTime = tourDate.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const isConfirmed =
    tour.status === "scheduled" || tour.status === "confirmed";
  const statusLabel =
    tour.status === "scheduled" || tour.status === "confirmed"
      ? "Confirmed"
      : tour.status === "in_progress"
        ? "In Progress"
        : tour.status;

  const propertiesCount = tour.propertiesCount ?? tour.properties?.length ?? 0;
  const location = tour.location ?? tour.area ?? null;
  const totalDistance = tour.totalDistance
    ? `~${Number(tour.totalDistance).toFixed(2)} km`
    : null;

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => navigation.navigate("TourDetails", { tourId: tour.id })}
    >
      <View style={styles.card}>
        {/* Row 1: Date + Badge (badge top-right, standalone) */}
        <View style={styles.cardRow}>
          <Text style={styles.cardDate}>{formattedDate}</Text>
          <View
            style={[
              styles.badge,
              isConfirmed ? styles.badgeConfirmed : styles.badgeOther,
            ]}
          >
            <Text
              style={[
                styles.badgeText,
                isConfirmed ? styles.badgeTextConfirmed : styles.badgeTextOther,
              ]}
            >
              {statusLabel}
            </Text>
          </View>
        </View>

        {/* Row 2: Time */}
        <Text style={styles.cardTime}>{formattedTime}</Text>

        {/* Row 3: Properties count */}
        {propertiesCount > 0 && (
          <View style={styles.metaRow}>
            <Text style={styles.metaIcon}>⌂</Text>
            <Text style={styles.metaText}>
              {propertiesCount}{" "}
              {propertiesCount === 1 ? "property" : "properties"} scheduled
            </Text>
          </View>
        )}

        {/* Row 4: Location */}
        {location && (
          <View style={styles.metaRow}>
            <Text style={styles.metaIcon}>◎</Text>
            <Text style={styles.metaText}>{location}</Text>
          </View>
        )}

        {/* Row 5: Distance + Route Plan button (bottom row) */}
        <View style={styles.bottomRow}>
          <View style={styles.distanceWrap}>
            {totalDistance ? (
              <View style={[styles.metaRow, { marginTop: 0 }]}>
                <MapPin size={15} color="#94a3b8" strokeWidth={2} />
                <Text style={styles.metaText}>{totalDistance}</Text>
              </View>
            ) : null}
          </View>

          <IconButton
            icon={
              <Navigation
                size={14}
                color={getVariantColor("success")}
                strokeWidth={2.3}
              />
            }
            label="Route"
            variant="success"
            size="sm"
            fullWidth={false}
            onPress={() => {
              navigation.navigate("RouteDetails", { tourId: tour.id });
            }}
          />
        </View>
      </View>
    </TouchableOpacity>
  );
}

export function UpcomingTourSection() {
  const navigation = useNavigation<any>();

  const { data: tours = [], isLoading } = useClientTours();

  const scheduledTours = tours
    .filter((tour) => {
      const status = String(tour.status);
      return (
        status === "scheduled" ||
        status === "in_progress" ||
        status === "confirmed"
      );
    })
    .sort(
      (a, b) =>
        new Date(a.scheduledDate).getTime() -
        new Date(b.scheduledDate).getTime(),
    );

  return (
    <Card style={styles.section}>
      <CardHeader style={styles.cardHeader}>
        <CardTitle>Upcoming Tours</CardTitle>
        {scheduledTours.length > 0 && (
          <Text style={styles.countLabel}>{scheduledTours.length} total</Text>
        )}
      </CardHeader>

      <CardContent style={styles.cardContentPadding}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            {[1, 2, 3].map((i) => (
              <View key={i} style={styles.skeletonCard} />
            ))}
          </View>
        ) : scheduledTours.length > 0 ? (
          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled={true}
          >
            {scheduledTours.map((tour) => (
              <TourCard key={tour.id} tour={tour} />
            ))}
          </ScrollView>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📅</Text>
            <Text style={styles.emptyText}>No upcoming tours scheduled</Text>
            <TouchableOpacity onPress={() => navigation.navigate("Browse")}>
              <Text style={styles.browseLink}>Browse Properties</Text>
            </TouchableOpacity>
          </View>
        )}
      </CardContent>
    </Card>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  countLabel: {
    fontSize: 13,
    color: "#64748b",
    fontWeight: "500",
  },
  cardContentPadding: {
    paddingTop: 0,
  },

  // Scrollable list
  scrollView: {
    maxHeight: SCROLL_VIEW_HEIGHT,
    paddingTop: 8,
  },

  // Tour card styles
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  cardDate: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
    letterSpacing: 0.1,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeConfirmed: {
    backgroundColor: "#16a34a",
  },
  badgeOther: {
    backgroundColor: "#f1f5f9",
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  badgeTextConfirmed: {
    color: "#ffffff",
  },
  badgeTextOther: {
    color: "#475569",
  },
  cardTime: {
    fontSize: 13,
    color: "#64748b",
    marginBottom: 2,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 3,
  },
  metaIcon: {
    fontSize: 13,
    color: "#94a3b8",
    width: 18,
    textAlign: "center",
  },
  metaText: {
    fontSize: 13,
    color: "#64748b",
  },

  // Bottom row: distance left, Route Plan button right
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  distanceWrap: {
    flex: 1,
    minWidth: 0,
    marginRight: 12,
  },
  routeButton: {
    minHeight: 38,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#1e40af",
    borderRadius: 12,
    paddingLeft: 6,
    paddingRight: 11,
    shadowColor: "#1e40af",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 3,
  },
  routeButtonIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
  },
  routeButtonText: {
    fontSize: 13,
    lineHeight: 17,
    color: "#ffffff",
    fontWeight: "700",
  },

  // Skeleton loading
  loadingContainer: {
    gap: 10,
  },
  skeletonCard: {
    height: 90,
    borderRadius: 10,
    backgroundColor: "#f1f5f9",
    marginBottom: 10,
  },

  // Empty state
  emptyState: {
    alignItems: "center",
    paddingVertical: 24,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: "#64748b",
  },
  browseLink: {
    fontSize: 14,
    color: "#1e40af",
    fontWeight: "600",
    marginTop: 8,
  },
});
