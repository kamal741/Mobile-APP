import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import {
  API_GLOBAL_PATHS,
  catalogPropertyPath,
} from "../../lib/apiGlobalPaths";
import { api } from "../../lib/api";
import {
  clientTourPropertiesUrl,
  tourDetailQueryKey,
  tourPropertiesQueryKey,
} from "../../lib/tourApi";
import { Card, CardContent } from "../../components/Card";
import { useState } from "react";
import { PropertyVisitFeedbackForm } from "./dashboard/components/PropertyVisitFeedbackForm";
// import { useClientRatings, useClientShowingRequest } from "../../lib/clientApi"; // ← added useClientShowingRequest

import { useClientRatings, useClientShowingRequest } from "../../lib/clientApi"; // ← added useClientShowingRequest
import { useAuth } from "../../contexts/AuthContext";
import { ClientFooter } from "./components/ClientFooter";
import {
  ChevronRight,
  MessageSquareText,
  Navigation,
} from "lucide-react-native";
import ClientNotesModal from "../agent/RoutePlanning/components/modals/ClientNotesModal";
import {
  optionLabel,
  parseTourRequestFeedback,
  PURCHASE_TIMELINES,
  TOUR_INTENTS,
  type TourRequestFeedback,
} from "../../lib/tourRequestFeedback";
import { getVariantColor, IconButton } from "@/components/common/ST_Buttons";

const STATUS_TABS = [
  { key: "upcoming", label: "Upcoming" },
  { key: "completed", label: "Completed" },
  { key: "requested", label: "Requested" },
  { key: "all", label: "All" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTourPrice(price: unknown): string | null {
  if (!price) return null;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number(price));
}

function propertyVisitStatusColor(status: string): string {
  switch (status) {
    case "liked":
      return "#10b981";
    case "rejected":
      return "#ef4444";
    case "offer_made":
      return "#8b5cf6";
    case "viewed":
      return "#3b82f6";
    case "keep_for_future":
      return "#f59e0b";
    default:
      return "#64748b";
  }
}

function propertyVisitStatusIcon(status: string): string {
  switch (status) {
    case "rejected":
      return "✕";
    case "offer_made":
      return "📄";
    case "keep_for_future":
      return "⏳";
    case "liked":
      return "♥";
    default:
      return "●";
  }
}

function propertyVisitStatusLabel(status: string): string {
  switch (status) {
    case "offer_made":
      return "Offer Making";
    case "keep_for_future":
      return "Keep for Future";
    default:
      return status.replace(/_/g, " ");
  }
}

function requestNotesSummary(notes: unknown): string | null {
  const feedback = parseTourRequestFeedback(notes);
  if (!feedback) return null;

  const parts: string[] = [];
  if (feedback.intent) {
    parts.push(optionLabel(TOUR_INTENTS, feedback.intent));
  }
  if (feedback.timeline) {
    parts.push(optionLabel(PURCHASE_TIMELINES, feedback.timeline));
  }
  if (feedback.priorities.length > 0) {
    parts.push(
      feedback.priorities
        .map((priority) => priority.replace(/_/g, " "))
        .join(", "),
    );
  }
  if (feedback.comments.trim()) {
    parts.push(feedback.comments.trim());
  }

  return parts.length > 0 ? parts.join(" · ") : null;
}

// ─── StarRating ───────────────────────────────────────────────────────────────

function StarRating({ rating }: { rating: number }) {
  return (
    <View style={propStyles.starsRow}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Text
          key={i}
          style={[
            propStyles.star,
            { color: i <= rating ? "#f59e0b" : "#d1d5db" },
          ]}
        >
          ★
        </Text>
      ))}
    </View>
  );
}

// ─── VisitStatusBadge ─────────────────────────────────────────────────────────

function VisitStatusBadge({ status }: { status: string }) {
  const color = propertyVisitStatusColor(status);
  return (
    <View style={[propStyles.visitBadge, { backgroundColor: color }]}>
      <Text style={propStyles.visitBadgeIcon}>
        {propertyVisitStatusIcon(status)}
      </Text>
      <Text style={propStyles.visitBadgeText}>
        {propertyVisitStatusLabel(status)}
      </Text>
    </View>
  );
}

// ─── CompletedPropertyRow ─────────────────────────────────────────────────────

type TourStop = {
  id?: string | number;
  masterPropertyId?: number;
  propertyId?: string | number;
  status?: string;
  rating?: number;
  matchPercentage?: number;
  matchedCount?: number;
  partialCount?: number;
  notMatchedCount?: number;
  tourId?: string;
};

function CompletedPropertyRow({
  tp,
  navigation,
  tourId,
  showFeedback = false,
}: {
  tp: TourStop;
  navigation: any;
  tourId: string;
  showFeedback?: boolean;
}) {
  const mid = tp.masterPropertyId ?? tp.propertyId;
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  const { user } = useAuth();
  const sharedMediaPropertyIds: number[] =
    user?.agentDetails?.sharedMedia?.sharedMediaPropertyIds ?? [];
  const canViewMedia =
    mid != null && sharedMediaPropertyIds.includes(Number(mid));

  const { data: prop, isLoading: propLoading } = useQuery({
    queryKey: [API_GLOBAL_PATHS.catalogProperties, "detail", String(mid ?? "")],
    queryFn: () => api.get(catalogPropertyPath(mid!)).then((r) => r.data),
    enabled: mid != null && !Number.isNaN(Number(mid)),
  });

  const { data: ratings, isLoading: ratingsLoading } = useClientRatings(
    { masterPropertyId: mid, tourId },
    { enabled: mid != null && Boolean(tourId) },
  );
  const existingRating = ratings?.[0];
  const hasRating = existingRating != null;

  if (propLoading && !prop) {
    return (
      <View style={propStyles.row}>
        <ActivityIndicator size="small" color="#1e40af" />
      </View>
    );
  }

  const p: Record<string, any> = prop ?? { address: `Property #${mid}` };
  const detailId = p.id != null ? String(p.id) : String(mid);

  const displayRating = existingRating?.rating ?? tp.rating ?? 0;
  const matchPct = tp.matchPercentage ?? null;
  const matchedCount = tp.matchedCount ?? 0;
  const partialCount = tp.partialCount ?? 0;
  const notMatchedCount = tp.notMatchedCount ?? 0;

  const specParts = [
    p.bedrooms != null ? `${p.bedrooms} Bed` : null,
    p.bathrooms != null ? `${p.bathrooms} Bath` : null,
    p.price != null ? formatTourPrice(p.price) : null,
  ].filter(Boolean);

  const feedbackProperty = {
    address: p.address ?? `Property #${mid}`,
    beds: p.bedrooms ?? 0,
    baths: p.bathrooms ?? 0,
    price: p.price != null ? (formatTourPrice(p.price) ?? "") : "",
  };

  return (
    <>
      <TouchableOpacity
        style={propStyles.row}
        onPress={() =>
          navigation.navigate("PropertyDetails", {
            propertyId: Number(detailId),
          })
        }
        activeOpacity={0.8}
      >
        {/* <View style={propStyles.topLine}>
          <Text style={propStyles.address} numberOfLines={1}>
            {p.address}
          </Text>
          {specParts.length > 0 && (
            <Text style={propStyles.specs}>{specParts.join(" • ")}</Text>
          )}
        </View> */}

        <View style={propStyles.topLine}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "flex-start",
              justifyContent: "space-between",
            }}
          >
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={propStyles.address} numberOfLines={1}>
                {p.address}
              </Text>
              {specParts.length > 0 && (
                <Text style={propStyles.specs}>{specParts.join(" • ")}</Text>
              )}
            </View>
            {canViewMedia && (
              <TouchableOpacity
                style={propStyles.feedbackBtn}
                onPress={(e) => {
                  e.stopPropagation();
                  navigation.navigate("MediaCenter", {
                    userType: "Client",
                    propertyId: Number(mid),
                  });
                }}
                activeOpacity={0.7}
              >
                {/* <Text style={propStyles.feedbackIcon}>🖼️</Text> */}
                <Text style={propStyles.feedbackText}>View Media</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={propStyles.midRow}>
          <View style={propStyles.midLeft}>
            {showFeedback && <StarRating rating={displayRating} />}
            {tp.status &&
              tp.status !== "pending" &&
              tp.status !== "scheduled" && (
                <VisitStatusBadge status={tp.status} />
              )}
            {matchPct != null && (
              <View style={propStyles.matchPctRow}>
                <Text style={propStyles.matchPctIcon}>◎</Text>
                <Text style={propStyles.matchPct}>{matchPct}%</Text>
              </View>
            )}
          </View>

          {showFeedback && (
            <View style={propStyles.rightActions}>
              <TouchableOpacity
                style={[
                  propStyles.feedbackBtn,
                  hasRating && propStyles.feedbackBtnReview,
                ]}
                onPress={(e) => {
                  e.stopPropagation();
                  setFeedbackOpen(true);
                }}
                activeOpacity={0.7}
                disabled={ratingsLoading}
              >
                {ratingsLoading ? (
                  <ActivityIndicator
                    size="small"
                    color="#6366f1"
                    style={{ width: 13 }}
                  />
                ) : (
                  <Text style={propStyles.feedbackIcon}>
                    {hasRating ? "✏️" : "🗒"}
                  </Text>
                )}
                <Text
                  style={[
                    propStyles.feedbackText,
                    hasRating && propStyles.feedbackTextReview,
                  ]}
                >
                  {hasRating ? "Edit" : "Feedback"}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {(matchedCount > 0 || partialCount > 0 || notMatchedCount > 0) && (
          <View style={propStyles.chipsRow}>
            {matchedCount > 0 && (
              <View style={propStyles.chip}>
                <Text style={[propStyles.chipIcon, { color: "#16a34a" }]}>
                  ✓
                </Text>
                <Text style={[propStyles.chipText, { color: "#16a34a" }]}>
                  {matchedCount} matched
                </Text>
              </View>
            )}
            {partialCount > 0 && (
              <View style={propStyles.chip}>
                <Text style={[propStyles.chipIcon, { color: "#b45309" }]}>
                  ⚠
                </Text>
                <Text style={[propStyles.chipText, { color: "#b45309" }]}>
                  {partialCount} partial
                </Text>
              </View>
            )}
            {notMatchedCount > 0 && (
              <View style={propStyles.chip}>
                <Text style={[propStyles.chipIcon, { color: "#dc2626" }]}>
                  ✕
                </Text>
                <Text style={[propStyles.chipText, { color: "#dc2626" }]}>
                  {notMatchedCount} not matched
                </Text>
              </View>
            )}
          </View>
        )}
      </TouchableOpacity>
      <PropertyVisitFeedbackForm
        open={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
        property={feedbackProperty}
        masterPropertyId={Number(mid)}
        tourId={String(tourId)}
        existingRating={existingRating}
        onSaved={(saved) => {
          // Rating saved successfully
        }}
      />
    </>
  );
}

// ─── CompletedTourProperties ──────────────────────────────────────────────────

function CompletedTourProperties({
  tourId,
  navigation,
  showFeedback = false,
}: {
  tourId: string;
  navigation: any;
  showFeedback?: boolean;
}) {
  const { data: stops, isLoading } = useQuery<TourStop[]>({
    queryKey: tourPropertiesQueryKey("client", tourId),
    queryFn: async () => {
      return (await api.get(clientTourPropertiesUrl(tourId))).data;
    },
    enabled: !!tourId,
  });

  if (isLoading) {
    return (
      <View style={propStyles.loadingRow}>
        <ActivityIndicator size="small" color="#1e40af" />
      </View>
    );
  }

  const list: TourStop[] = Array.isArray(stops) ? stops : [];
  if (list.length === 0) return null;

  return (
    <View style={propStyles.propertiesBlock}>
      {list.map((tp) => (
        <CompletedPropertyRow
          key={tp.id}
          tp={tp}
          navigation={navigation}
          tourId={tourId}
          showFeedback={showFeedback}
        />
      ))}
    </View>
  );
}

// ─── RequestedProperties ──────────────────────────────────────────────────────
// NEW: fetches showing-request detail by showingRequestId and renders each
// requestedProperties entry using the shared CompletedPropertyRow.

function RequestedProperties({
  showingRequestId,
  navigation,
}: {
  showingRequestId: string;
  navigation: any;
}) {
  const { data: showingRequest, isLoading } = useClientShowingRequest(
    showingRequestId,
    { enabled: Boolean(showingRequestId) },
  );

  if (isLoading) {
    return (
      <View style={propStyles.loadingRow}>
        <ActivityIndicator size="small" color="#1e40af" />
      </View>
    );
  }

  const list = showingRequest?.requestedProperties ?? [];
  if (list.length === 0) return null;

  return (
    <View style={propStyles.propertiesBlock}>
      {list.map((rp) => (
        <CompletedPropertyRow
          key={rp.id}
          tp={{ id: rp.id, masterPropertyId: rp.masterPropertyId }}
          navigation={navigation}
          tourId={showingRequestId} // no real tourId for requests; passed for key stability
          showFeedback={false} // no feedback for pending requests
        />
      ))}
    </View>
  );
}

// ─── MyToursScreen ────────────────────────────────────────────────────────────

export function MyToursScreen() {
  const navigation = useNavigation<any>();
  const [activeTab, setActiveTab] = useState("upcoming");
  const [requestNotesModal, setRequestNotesModal] = useState<{
    notes: TourRequestFeedback;
    dateLabel: string;
  } | null>(null);

  const {
    data: tours,
    isLoading: toursLoading,
    refetch: refetchTours,
  } = useQuery<any[]>({
    queryKey: [API_GLOBAL_PATHS.clientTours],
  });

  const {
    data: showingRequests,
    isLoading: requestsLoading,
    refetch: refetchRequests,
  } = useQuery<any[]>({
    queryKey: [API_GLOBAL_PATHS.clientShowingRequests],
  });

  const isLoading = toursLoading || requestsLoading;

  const refetch = () => {
    refetchTours();
    refetchRequests();
  };

  const allItems = [
    ...(tours || []).map((t: any) => ({ ...t, itemType: "tour" })),
    ...(showingRequests || []).map((r: any) => ({
      ...r,
      itemType: "request",
      scheduledDate: r.preferredDate || r.createdAt,
      status: r.status === "pending" ? "requested" : r.status,
    })),
  ];

  const filteredTours = allItems.filter((item: any) => {
    if (activeTab === "upcoming")
      return (
        item.itemType === "tour" &&
        (item.status === "scheduled" || item.status === "in_progress")
      );
    if (activeTab === "completed")
      return item.itemType === "tour" && item.status === "completed";
    if (activeTab === "requested") return item.itemType === "request";
    return true;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "scheduled":
        return "#3b82f6";
      case "in_progress":
        return "#f59e0b";
      case "completed":
        return "#10b981";
      case "cancelled":
        return "#ef4444";
      case "requested":
        return "#8b5cf6";
      case "approved":
        return "#3b82f6";
      default:
        return "#64748b";
    }
  };

  const renderTour = ({ item }: { item: any }) => {
    const isRequest = item.itemType === "request";
    const isCompleted = item.status === "completed";
    const canViewRoute =
      !isRequest &&
      ["scheduled", "in_progress", "completed"].includes(item.status);

    const headerDateStr = item.scheduledDate
      ? new Date(item.scheduledDate).toLocaleDateString("en-US", {
          month: "numeric",
          day: "numeric",
          year: "numeric",
        })
      : null;

    const timeStr =
      isRequest && item.preferredTime
        ? String(item.preferredTime)
        : item.scheduledDate
          ? new Date(item.scheduledDate).toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
            })
          : "TBD";

    const statusLabel = isRequest
      ? "Requested"
      : item.status?.replace(/_/g, " ");
    const requestFeedback = isRequest
      ? parseTourRequestFeedback(item.notes)
      : null;
    const requestNotes = requestNotesSummary(requestFeedback);

    return (
      <Card style={styles.tourCard}>
        <CardContent style={{ paddingHorizontal: 0, paddingVertical: 0 }}>
          {/* Header row */}
          <View style={completedCardStyles.header}>
            <View>
              <Text style={completedCardStyles.headerDate}>
                {headerDateStr ?? "—"}
              </Text>
              <Text style={completedCardStyles.headerTime}>{timeStr}</Text>
            </View>
            <View
              style={[
                completedCardStyles.statusBadge,
                { backgroundColor: getStatusColor(item.status) },
              ]}
            >
              <Text style={completedCardStyles.statusBadgeText}>
                {statusLabel}
              </Text>
            </View>
          </View>

          {/* Tour meta: km · min · properties */}
          <View style={completedCardStyles.metaRow}>
            {item.totalDistance != null && Number(item.totalDistance) > 0 && (
              <View style={completedCardStyles.metaItem}>
                <Text style={completedCardStyles.metaIcon}>📍</Text>
                <Text style={completedCardStyles.metaText}>
                  {Number(item.totalDistance).toFixed(1)} km
                </Text>
              </View>
            )}
            {item.actualDurationMinutes != null &&
              Number(item.actualDurationMinutes) > 0 && (
                <View style={completedCardStyles.metaItem}>
                  <Text style={completedCardStyles.metaIcon}>🕐</Text>
                  <Text style={completedCardStyles.metaText}>
                    {item.actualDurationMinutes} min
                  </Text>
                </View>
              )}
            {item.propertiesCount != null && (
              <View style={completedCardStyles.metaItem}>
                <Text style={completedCardStyles.metaIcon}>🏠</Text>
                <Text style={completedCardStyles.metaText}>
                  {item.propertiesCount}{" "}
                  {item.propertiesCount === 1 ? "property" : "properties"}
                </Text>
              </View>
            )}
          </View>

          {/* Notes for requests */}
          {requestNotes && (
            <View style={completedCardStyles.notesRow}>
              <View style={completedCardStyles.notesHeading}>
                <View style={completedCardStyles.notesTitleRow}>
                  <MessageSquareText
                    size={15}
                    color="#1e40af"
                    strokeWidth={2.2}
                  />
                  <Text style={completedCardStyles.notesTitle}>
                    Tour preferences
                  </Text>
                </View>
                <TouchableOpacity
                  style={completedCardStyles.notesButton}
                  onPress={() => {
                    if (!requestFeedback) return;
                    setRequestNotesModal({
                      notes: requestFeedback,
                      dateLabel: headerDateStr ?? "Tour request",
                    });
                  }}
                  activeOpacity={0.75}
                  accessibilityRole="button"
                  accessibilityLabel={`View notes for request on ${headerDateStr ?? "this date"}`}
                >
                  <Text style={completedCardStyles.notesButtonText}>
                    View notes
                  </Text>
                  <ChevronRight size={13} color="#1e40af" strokeWidth={2.4} />
                </TouchableOpacity>
              </View>
              <Text style={completedCardStyles.notesPreview} numberOfLines={2}>
                {requestNotes}
              </Text>
            </View>
          )}

          {canViewRoute && (
            <View style={completedCardStyles.routeActionRow}>
              <View style={completedCardStyles.routeActionCopy}>
                <Text style={completedCardStyles.routeActionTitle}>
                  Tour route
                </Text>
                <Text style={completedCardStyles.routeActionSubtitle}>
                  View directions and stop schedule
                </Text>
              </View>
              {/* <TouchableOpacity
                  style={completedCardStyles.routeButton}
                  onPress={() =>
                    navigation.navigate("RouteDetails", {
                      tourId: String(item.id),
                    })
                  }
                  activeOpacity={0.82}
                  accessibilityRole="button"
                  accessibilityLabel={`View route for tour on ${headerDateStr ?? "this date"}`}
                >
                  <View style={completedCardStyles.routeButtonIcon}>
                    <Navigation
                      size={14}
                      color="#1e40af"
                      fill="#1e40af"
                      strokeWidth={2.2}
                    />
                  </View>
                  <Text style={completedCardStyles.routeButtonText}>
                    View route
                  </Text>
                  <ChevronRight size={15} color="#ffffff" strokeWidth={2.3} />
                </TouchableOpacity> */}

              <IconButton
                icon={
                  <Navigation
                    size={14}
                    color={getVariantColor("primary")}
                    strokeWidth={2.3}
                  />
                }
                label="Route"
                variant="primary"
                size="sm"
                fullWidth={false}
                onPress={() => {
                  navigation.navigate("RouteDetails", {
                    tourId: String(item.id),
                  });
                }}
              />
            </View>
          )}

          {/*
           * Properties block:
           * - Requests  → RequestedProperties (fetches /showing-requests/:id)
           * - Tours     → CompletedTourProperties (fetches tour stops)
           */}
          {isRequest ? (
            <RequestedProperties
              showingRequestId={String(item.id)}
              navigation={navigation}
            />
          ) : (
            <CompletedTourProperties
              tourId={String(item.id)}
              navigation={navigation}
              showFeedback={isCompleted}
            />
          )}
        </CardContent>
      </Card>
      // </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.tabContainer}>
        {STATUS_TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === tab.key && styles.tabTextActive,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filteredTours}
        renderItem={renderTour}
        keyExtractor={(item) => `${item.itemType ?? "t"}-${String(item.id)}`}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🗓️</Text>
            <Text style={styles.emptyTitle}>
              {activeTab === "upcoming"
                ? "No Upcoming Tours"
                : "No Tours Found"}
            </Text>
            <Text style={styles.emptyText}>
              {activeTab === "upcoming"
                ? "Add properties to your cart and schedule a tour"
                : "Your tour history will appear here"}
            </Text>
          </View>
        }
      />
      <ClientNotesModal
        visible={requestNotesModal != null}
        title="REQUEST NOTES"
        clientName={
          requestNotesModal
            ? `Tour request · ${requestNotesModal.dateLabel}`
            : "Tour request"
        }
        notes={requestNotesModal?.notes}
        onClose={() => setRequestNotesModal(null)}
      />
      <ClientFooter active="mytours" />
    </View>
  );
}

// ─── Completed card styles ────────────────────────────────────────────────────

const completedCardStyles = StyleSheet.create({
  headerTime: {
    fontSize: 13,
    color: "#64748b",
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  statusBadgeText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  notesRow: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#dbeafe",
    backgroundColor: "#f8fbff",
    padding: 11,
  },
  notesHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  notesTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  notesTitle: {
    fontSize: 11,
    lineHeight: 15,
    color: "#1e293b",
    fontWeight: "800",
  },
  notesButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    borderRadius: 999,
    backgroundColor: "#eff6ff",
    paddingLeft: 9,
    paddingRight: 6,
    paddingVertical: 5,
  },
  notesButtonText: {
    fontSize: 10,
    lineHeight: 14,
    color: "#1e40af",
    fontWeight: "700",
  },
  notesPreview: {
    fontSize: 12,
    lineHeight: 18,
    color: "#64748b",
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
  },
  headerDate: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1e293b",
  },
  completedBadge: {
    backgroundColor: "#4b5563",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  completedBadgeText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "600",
  },
  metaRow: {
    flexDirection: "row",
    gap: 16,
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaIcon: {
    fontSize: 13,
    color: "#64748b",
  },
  metaText: {
    fontSize: 13,
    color: "#64748b",
  },
  routeActionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  routeActionCopy: {
    flex: 1,
    minWidth: 0,
    marginRight: 10,
  },
  routeActionTitle: {
    fontSize: 12,
    lineHeight: 16,
    color: "#1e293b",
    fontWeight: "700",
  },
  routeActionSubtitle: {
    marginTop: 1,
    fontSize: 10,
    lineHeight: 14,
    color: "#64748b",
  },
  routeButton: {
    minHeight: 38,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 12,
    backgroundColor: "#1e40af",
    paddingLeft: 6,
    paddingRight: 10,
    shadowColor: "#1e40af",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 2,
  },
  routeButtonIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
  },
  routeButtonText: {
    fontSize: 11,
    lineHeight: 15,
    color: "#ffffff",
    fontWeight: "700",
  },
});

// ─── Property row styles ──────────────────────────────────────────────────────

const propStyles = StyleSheet.create({
  propertiesBlock: {
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  loadingRow: {
    padding: 16,
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  row: {
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    backgroundColor: "#ffffff",
  },
  topLine: {
    marginBottom: 7,
  },
  address: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1e293b",
  },
  specs: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 1,
  },
  midRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  midLeft: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 7,
    flex: 1,
  },
  starsRow: {
    flexDirection: "row",
    gap: 1,
  },
  star: {
    fontSize: 15,
  },
  visitBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 4,
  },
  visitBadgeIcon: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "700",
  },
  visitBadgeText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  matchPctRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  matchPctIcon: {
    fontSize: 12,
    color: "#64748b",
  },
  matchPct: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1e293b",
  },
  rightActions: {
    flexDirection: "column",
    alignItems: "flex-end",
    gap: 6,
  },
  feedbackBtn: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 5,
    gap: 4,
    backgroundColor: "#f8fafc",
  },
  feedbackIcon: {
    fontSize: 13,
  },
  feedbackText: {
    fontSize: 12,
    color: "#374151",
    fontWeight: "500",
  },
  feedbackBtnReview: {
    borderColor: "#6366f1",
    backgroundColor: "#eef2ff",
  },
  feedbackTextReview: {
    color: "#6366f1",
  },
  chevron: {
    fontSize: 20,
    color: "#94a3b8",
    fontWeight: "300",
    marginLeft: 2,
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  chipIcon: {
    fontSize: 12,
    fontWeight: "700",
  },
  chipText: {
    fontSize: 12,
    fontWeight: "500",
  },
});

// ─── Original styles ──────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: {
    borderBottomColor: "#1e40af",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#64748b",
  },
  tabTextActive: {
    color: "#1e40af",
    fontWeight: "600",
  },
  listContent: {
    padding: 16,
  },
  tourCard: {
    marginBottom: 12,
  },
  tourHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  dateBox: {
    width: 48,
    height: 48,
    backgroundColor: "#1e40af",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  dateMonth: {
    fontSize: 10,
    color: "#93c5fd",
    textTransform: "uppercase",
  },
  dateDay: {
    fontSize: 18,
    fontWeight: "700",
    color: "#ffffff",
  },
  tourInfo: {
    flex: 1,
  },
  tourTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
  },
  tourTime: {
    fontSize: 14,
    color: "#64748b",
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  tourDetails: {
    flexDirection: "row",
    marginTop: 12,
    gap: 16,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  detailIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  detailText: {
    fontSize: 14,
    color: "#64748b",
  },
  ratingPrompt: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  ratingText: {
    fontSize: 14,
    color: "#1e40af",
    fontWeight: "500",
  },
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
    textAlign: "center",
    paddingHorizontal: 32,
  },
});
