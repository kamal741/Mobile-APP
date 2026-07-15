import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
  Alert,
  Switch,
} from "react-native";
import { useCallback, useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useNavigation } from "@react-navigation/native";
import { AxiosError } from "axios";
import {
  CalendarDays,
  ChevronRight,
  Clock3,
  Flag,
  Home,
  MessageSquareText,
  Navigation,
  Play,
  Plus,
} from "lucide-react-native";
import { api, apiRequest } from "../lib/api";
import { getTourForegroundCoordinatesWithTimeout } from "../lib/tourGeolocation";
import { catalogPropertyPath } from "../lib/apiGlobalPaths";
import {
  clientTourUrl,
  clientTourPropertiesUrl,
  agentTourUrl,
  agentTourPropertiesUrl,
  agentCompleteTourUrl,
  agentCalculateRouteDistanceUrl,
  tourDetailQueryKey,
  tourPropertiesQueryKey,
  invalidateSingleTourQueries,
} from "../lib/tourApi";
import {
  fetchAgentOffersPage,
  agentOffersQueryKey,
  type AgentOffer,
} from "../lib/offersApi";
import {
  useSharePropertyMediaWithClient,
  useRevokePropertyMediaShare,
  usePropertyMediaShareStatus,
  fetchPropertyMedia,
  agentQueryKeys,
  type PropertyMediaShareResponse,
} from "../lib/agentApi";
import { Card, CardContent, CardHeader } from "../components/Card";
import { Button } from "../components/Button";
import { PropertyPhotoCarousel } from "../components/PropertyPhotoCarousel";
import ClientNotes from "./agent/RoutePlanning/components/common/ClientNotes";
import { useAuth } from "../contexts/AuthContext";
import { ClientFooter } from "./client/components/ClientFooter";
import { AgentFooter } from "./agent/components/AgentFooter";
import { getVariantColor, IconButton } from "@/components/common/ST_Buttons";

const END_TOUR_GEO_TIMEOUT_MS = 5_000;
const NAVIGATION_GEO_TIMEOUT_MS = 5_000;

function formatApiErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof AxiosError) {
    const data = err.response?.data;
    if (typeof data === "object" && data != null && "message" in data) {
      const m = (data as { message?: string }).message;
      if (typeof m === "string" && m.trim()) return m;
    }
    if (typeof err.message === "string" && err.message.trim()) {
      return err.message;
    }
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

function formatDurationMins(mins: number | null | undefined) {
  if (mins == null || mins <= 0) return null;
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  const rem = mins % 60;
  const minutesPart = rem > 0 ? String(rem) + "m" : "";
  return `${hours}h${minutesPart}`;
}

type TourPropertyStop = {
  id?: string | number;
  masterPropertyId?: number;
  propertyId?: string;
  status?: string;
  order?: number;
};

function formatTourPrice(price: unknown): string | null {
  if (!price) return null;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number(price));
}

function tourStatusColor(status: string): string {
  switch (status) {
    case "scheduled":
      return "#3b82f6";
    case "in_progress":
      return "#f59e0b";
    case "completed":
      return "#10b981";
    case "cancelled":
      return "#ef4444";
    default:
      return "#64748b";
  }
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
    default:
      return "#64748b";
  }
}

function tourDateField(value: unknown): Date | null {
  if (value == null || value === "") {
    return null;
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value === "string" || typeof value === "number") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function computeTourSchedule(tour: Record<string, unknown>): {
  scheduled: Date | null;
  timeForHeader: Date | null;
} {
  const scheduledDate = tourDateField(tour.scheduledDate);
  const startTime = tourDateField(tour.startTime);
  let scheduled: Date | null = null;
  if (scheduledDate != null) {
    scheduled = scheduledDate;
  } else if (startTime != null) {
    scheduled = startTime;
  }
  const timeForHeader = startTime ?? scheduled;
  return { scheduled, timeForHeader };
}

function computeDurationBlock(tour: Record<string, unknown>): {
  label: string;
  value: string | null;
} {
  const act = tour.actualDurationMinutes;
  const est = tour.estimatedDurationMinutes;
  if (act != null && typeof act === "number" && act > 0) {
    return { label: "Time taken", value: formatDurationMins(act) };
  }
  if (est != null && typeof est === "number" && est > 0) {
    const fm = formatDurationMins(est);
    if (fm != null) {
      return { label: "Est. time", value: `~${fm}` };
    }
    return { label: "Est. time", value: "—" };
  }
  return { label: "Est. time", value: "—" };
}

async function openMapsNavigationForTour(
  stops: TourPropertyStop[],
  tourId: string,
  isAgent: boolean,
): Promise<void> {
  if (stops.length === 0) {
    return;
  }

  const pos = await getTourForegroundCoordinatesWithTimeout(
    NAVIGATION_GEO_TIMEOUT_MS,
  );
  const routeDistanceBody = {
    originLat: pos?.latitude ?? null,
    originLng: pos?.longitude ?? null,
  };

  const postRouteDistanceWhenAgent = () => {
    if (isAgent) {
      void api
        .post(agentCalculateRouteDistanceUrl(tourId), routeDistanceBody)
        .then(() => {
          invalidateSingleTourQueries("agent", tourId);
        })
        .catch(() => undefined);
    }
  };

  const addressList: string[] = [];
  for (const tp of stops) {
    const mid =
      tp.masterPropertyId ?? (tp as { propertyId?: number }).propertyId;
    if (mid == null) continue;
    try {
      const { data: prop } = await api.get(catalogPropertyPath(mid));
      if (prop?.address) addressList.push(String(prop.address));
    } catch {
      // skip stop without address
    }
  }

  if (addressList.length === 0) {
    postRouteDistanceWhenAgent();
    return;
  }

  const lastAddr = addressList.at(-1);
  if (lastAddr == null) {
    return;
  }

  const destination = encodeURIComponent(lastAddr);
  const waypoints = addressList
    .slice(0, -1)
    .map((a) => encodeURIComponent(a))
    .join("|");

  postRouteDistanceWhenAgent();

  let url = `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
  if (pos != null) {
    url += `&origin=${pos.latitude},${pos.longitude}`;
  }
  if (waypoints.length > 0) {
    url += `&waypoints=${waypoints}`;
  }
  void Linking.openURL(url);
}

// ─── TourStopRow ─────────────────────────────────────────────────────────────

type TourStopRowProps = Readonly<{
  tp: TourPropertyStop;
  index: number;
  navigation: Readonly<{
    navigate: (n: string, p: Record<string, unknown>) => void;
  }>;
  formatPrice: (price: any) => string | null;
  getPropertyStatusColor: (status: string) => string;
  onAddOffer: (propertyId: string) => void;
  /** Existing offer for this property's masterPropertyId, if any */
  existingOffer: AgentOffer | null;
  onViewOffer: (offerId: string) => void;
  /** Client profile id — needed for share/revoke media */
  clientId: string | null;
  isAgent: boolean;
}>;

// ─── TourDetailsLoadedContent ─────────────────────────────────────────────────

function TourStopRow({
  tp,
  index,
  navigation,
  formatPrice,
  getPropertyStatusColor,
  onAddOffer,
  existingOffer,
  onViewOffer,
  clientId,
  isAgent,
}: TourStopRowProps) {
  const mid = tp.masterPropertyId ?? (tp as { propertyId?: number }).propertyId;
  const { data: prop, isLoading } = useQuery({
    queryKey: ["tourStop", "property", String(mid ?? "")],
    queryFn: () => api.get(catalogPropertyPath(mid!)).then((r) => r.data),
    enabled: mid != null && String(mid) !== "" && !Number.isNaN(Number(mid)),
  });
  const rawPropertyId = prop?.id;
  const detailId =
    rawPropertyId !== undefined && rawPropertyId !== null
      ? String(rawPropertyId)
      : String(mid);

  // ─── Fetch property media to decide whether to show share toggle ──────────
  const { data: mediaList } = useQuery({
    queryKey: [...agentQueryKeys.propertyMedia(detailId), "list"],
    queryFn: () => fetchPropertyMedia(detailId),
    enabled: isAgent && !!detailId && detailId !== "undefined",
    staleTime: 1000 * 30,
  });

  const hasMedia =
    Array.isArray(mediaList) &&
    mediaList.length > 0 &&
    mediaList.some(
      (m) => (m.images?.length ?? 0) > 0 || (m.videos?.length ?? 0) > 0,
    );
  // ─────────────────────────────────────────────────────────────────────────

  // ─── Share / Revoke media state ───────────────────────────────────────────
  // ─── Share / Revoke media state ───────────────────────────────────────────
  const { data: isMediaSharedRemote, isLoading: isShareStatusLoading } =
    usePropertyMediaShareStatus(clientId ?? "", mid ?? "", {
      enabled: isAgent && !!clientId && !!mid,
    });

  const [mediaShared, setMediaShared] = useState(false);
  const [sharingId, setSharingId] = useState<string | number | null>(null);

  // Sync remote share status into local state once loaded
  useEffect(() => {
    if (isMediaSharedRemote !== undefined) {
      setMediaShared(isMediaSharedRemote);
    }
  }, [isMediaSharedRemote]);

  const shareMutation = useSharePropertyMediaWithClient();
  const revokeMutation = useRevokePropertyMediaShare();

  const handleMediaShareToggle = useCallback(
    (value: boolean) => {
      if (!clientId || !mid) return;

      if (value) {
        shareMutation.mutate(
          { clientId, propertyId: mid },
          {
            onSuccess: (res: PropertyMediaShareResponse) => {
              setMediaShared(true);
              setSharingId(res.id);
            },
            onError: (err: unknown) => {
              Alert.alert(
                "Share failed",
                formatApiErrorMessage(err, "Could not share media. Try again."),
              );
            },
          },
        );
      } else {
        if (sharingId == null) return;
        revokeMutation.mutate(sharingId, {
          onSuccess: () => {
            setMediaShared(false);
            setSharingId(null);
          },
          onError: (err: unknown) => {
            Alert.alert(
              "Revoke failed",
              formatApiErrorMessage(err, "Could not revoke media. Try again."),
            );
          },
        });
      }
    },
    [clientId, mid, sharingId, shareMutation, revokeMutation],
  );

  // const isSharePending = shareMutation.isPending || revokeMutation.isPending;
  const isSharePending =
    isShareStatusLoading || shareMutation.isPending || revokeMutation.isPending;
  // ─────────────────────────────────────────────────────────────────────────

  if (isLoading) {
    if (prop === undefined) {
      return (
        <View style={styles.propertyCard}>
          <View style={styles.propertyLoading}>
            <ActivityIndicator size="small" color="#1e40af" />
          </View>
        </View>
      );
    }
  }

  const p: Record<string, any> = prop || {
    id: detailId,
    address: `Property #${mid}`,
    price: null,
  };

  return (
    <TouchableOpacity
      style={[
        styles.propertyCard,
        isAgent ? styles.agentPropertyCard : styles.clientPropertyCard,
      ]}
      onPress={() =>
        navigation.navigate("PropertyDetails", {
          propertyId: Number(detailId),
          userType: isAgent ? "agent" : "client",
        })
      }
      activeOpacity={0.85}
    >
      <View style={styles.photoContainer}>
        {/* <PropertyPhotoCarousel propertyId={String(detailId)} height={160} /> */}
        <PropertyPhotoCarousel
          photos={p.photos ?? []}
          imageUrl={p.imageUrl}
          height={160}
        />
        <View style={[styles.stopBadge, isAgent && styles.agentStopBadge]}>
          <Text style={styles.stopBadgeText}>{index + 1}</Text>
        </View>
        {tp.status && tp.status !== "scheduled" && (
          <View
            style={[
              styles.visitStatusBadge,
              { backgroundColor: getPropertyStatusColor(tp.status) },
            ]}
          >
            <Text style={styles.visitStatusText}>
              {tp.status.replace("_", " ")}
            </Text>
          </View>
        )}
      </View>

      <View
        style={[
          styles.propertyDetails,
          isAgent ? styles.agentPropertyDetails : styles.clientPropertyDetails,
        ]}
      >
        <View style={styles.priceRow}>
          {p.price ? (
            <Text
              style={[
                styles.propertyPrice,
                isAgent && styles.agentPropertyPrice,
              ]}
            >
              {formatPrice(p.price)}
            </Text>
          ) : (
            <View />
          )}
          {isAgent && (
            <TouchableOpacity
              style={styles.uploadIconBtn}
              onPress={(e) => {
                e.stopPropagation?.();
                navigation.navigate("MediaUpload", {
                  propertyId: detailId,
                  propertyAddress: String(p.address),
                });
              }}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Ionicons name="cloud-upload-outline" size={20} color="#1e40af" />
            </TouchableOpacity>
          )}
          {!isAgent && (
            <View style={styles.viewDetailsLink}>
              <Text style={styles.viewDetailsText}>View details</Text>
              <ChevronRight size={14} color="#1e40af" strokeWidth={2.4} />
            </View>
          )}
        </View>

        <Text style={styles.propertyAddress} numberOfLines={1}>
          {p.address}
        </Text>
        {(p.city || p.province) && (
          <Text style={styles.propertyCity}>
            {[p.city, p.province].filter(Boolean).join(", ")}
          </Text>
        )}
        {(p.bedrooms != null || p.bathrooms != null) && (
          <View style={styles.specsRow}>
            {p.bedrooms != null && (
              <View style={styles.specItem}>
                <Text style={styles.specIcon}>🛏</Text>
                <Text style={styles.specText}>{p.bedrooms} bed</Text>
              </View>
            )}
            {p.bathrooms != null && (
              <View style={styles.specItem}>
                <Text style={styles.specIcon}>🚿</Text>
                <Text style={styles.specText}>{p.bathrooms} bath</Text>
              </View>
            )}
            {p.area && (
              <View style={styles.specItem}>
                <Text style={styles.specIcon}>📐</Text>
                <Text style={styles.specText}>{p.area}</Text>
              </View>
            )}
          </View>
        )}
        <View style={styles.metaRow}>
          {p.propertyType && (
            <View style={styles.typeTag}>
              <Text style={styles.typeTagText}>{p.propertyType}</Text>
            </View>
          )}
          {p.mlsNumber && (
            <Text style={styles.metaText}>MLS #{p.mlsNumber}</Text>
          )}
        </View>

        {/* ─── Add Offer / View Offer  +  Share Media toggle ───────────── */}
        <View style={styles.propertyActionsRow}>
          <View style={styles.leftActionsGroup}>
            {existingOffer ? (
              <TouchableOpacity
                style={[styles.addOfferButton, styles.viewOfferButton]}
                onPress={(e) => {
                  e.stopPropagation?.();
                  onViewOffer(existingOffer.id);
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.addOfferButtonText}>View Offer</Text>
              </TouchableOpacity>
            ) : isAgent ? (
              <TouchableOpacity
                style={styles.addOfferButton}
                onPress={(e) => {
                  e.stopPropagation?.();
                  onAddOffer(String(detailId));
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.addOfferButtonText}>+ Add Offer</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Only shown when agent, clientId present, and property has media */}
          {isAgent && clientId != null && hasMedia && (
            <TouchableOpacity
              activeOpacity={1}
              onPress={(e) => e.stopPropagation?.()}
            >
              <View style={styles.shareMediaContainer}>
                {isSharePending ? (
                  <ActivityIndicator
                    size="small"
                    color="#1e40af"
                    style={styles.shareMediaSpinner}
                  />
                ) : (
                  <>
                    <Text style={styles.shareMediaLabel}>
                      {mediaShared ? "Media Shared" : "Share Media"}
                    </Text>
                    <Switch
                      value={mediaShared}
                      onValueChange={handleMediaShareToggle}
                      trackColor={{ false: "#cbd5e1", true: "#93c5fd" }}
                      thumbColor={mediaShared ? "#1e40af" : "#f1f5f5"}
                    />
                  </>
                )}
              </View>
            </TouchableOpacity>
          )}
        </View>
        {/* ──────────────────────────────────────────────────────────────── */}

        {/* ──────────────────────────────────────────────────────────────── */}
      </View>
    </TouchableOpacity>
  );
}

type TourDetailsLoadedProps = Readonly<{
  tour: Record<string, any>;
  stops: TourPropertyStop[];
  propertiesLoading: boolean;
  navigation: any;
  tourId: string;
  isAgent: boolean;
  clientId: string | null;
  /** All pending offers fetched from the offers API */
  offers: AgentOffer[];
  startTourMutation: { mutate: () => void; isPending: boolean };
  endTourMutation: { mutate: () => void; isPending: boolean };
  onOpenNavigation: () => void;
}>;

function TourDetailsLoadedContent({
  tour,
  stops,
  propertiesLoading,
  navigation,
  tourId,
  isAgent,
  clientId,
  offers,
  startTourMutation,
  endTourMutation,
  onOpenNavigation,
}: TourDetailsLoadedProps) {
  const { scheduled, timeForHeader } = computeTourSchedule(tour);
  const durationBlock = computeDurationBlock(tour);
  const clientName =
    typeof tour.clientDisplayName === "string" && tour.clientDisplayName.trim()
      ? tour.clientDisplayName.trim()
      : "Client";
  const tourTitle = isAgent ? `Tour with ${clientName}` : "Your property tour";

  const handleAddOffer = useCallback(
    (propertyId: string) => {
      navigation.navigate("CreateOffer", {
        prefillClientId: clientId ?? undefined,
        prefillPropertyId: propertyId,
        initialStep: 3,
      });
    },
    [navigation, clientId],
  );

  const handleViewOffer = useCallback(
    (offerId: string) => {
      navigation.navigate("OfferDetail", { offerId });
    },
    [navigation],
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {/* <View style={styles.header}>
        <View style={styles.headerInfo}>
          <Text style={styles.tourId}>
            Tour with {String(tour.clientDisplayName)}
          </Text>
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor:
                  tourStatusColor(String(tour.status ?? "")) + "20",
              },
            ]}
          >
            <Text
              style={[
                styles.statusText,
                { color: tourStatusColor(String(tour.status ?? "")) },
              ]}
            >
              {String(tour.status ?? "").replace("_", " ")}
            </Text>
          </View>
        </View>
        {scheduled && (
          <Text style={styles.date}>
            {scheduled.toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </Text>
        )}
        {timeForHeader && (
          <Text style={styles.time}>
            {timeForHeader.toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
            })}
          </Text>
        )}
      </View> */}

      <View
        style={[
          styles.header,
          isAgent ? styles.agentHeader : styles.clientHeader,
        ]}
      >
        <View style={styles.clientHeaderEyebrow}>
          <View
            style={[
              styles.clientHeaderEyebrowIcon,
              isAgent && styles.agentHeaderEyebrowIcon,
            ]}
          >
            {isAgent ? (
              <Navigation
                size={13}
                color="#1e40af"
                fill="#1e40af"
                strokeWidth={2.3}
              />
            ) : (
              <Home size={13} color="#1e40af" strokeWidth={2.3} />
            )}
          </View>
          <Text style={styles.clientHeaderEyebrowText}>
            {isAgent ? "AGENT TOUR ITINERARY" : "PROPERTY TOUR"}
          </Text>
        </View>
        <View style={styles.headerInfo}>
          <View style={styles.headerCopy}>
            <Text style={[styles.tourId, styles.clientTourTitle]}>
              {tourTitle}
            </Text>
            <View style={styles.clientSchedule}>
              {scheduled && (
                <View style={styles.clientScheduleItem}>
                  <CalendarDays size={15} color="#64748b" strokeWidth={2.1} />
                  <Text style={styles.clientScheduleText}>
                    {scheduled.toLocaleDateString("en-US", {
                      weekday: "short",
                      month: isAgent ? "long" : "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </Text>
                </View>
              )}
              {timeForHeader && (
                <View style={styles.clientScheduleItem}>
                  <Clock3 size={15} color="#64748b" strokeWidth={2.1} />
                  <Text style={styles.clientScheduleText}>
                    {timeForHeader.toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.headerActions}>
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor:
                    tourStatusColor(String(tour.status ?? "")) + "20",
                },
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  { color: tourStatusColor(String(tour.status ?? "")) },
                ]}
              >
                {String(tour.status ?? "").replace("_", " ")}
              </Text>
            </View>

            {(tour.status === "scheduled" || tour.status === "in_progress") && (
              // <TouchableOpacity
              //   style={styles.routeButton}
              //   onPress={() =>
              //     navigation.navigate("RouteDetails", { tourId: tourId })
              //   }
              //   activeOpacity={0.82}
              //   accessibilityRole="button"
              //   accessibilityLabel="View tour route"
              // >
              //   <View style={styles.routeButtonIcon}>
              //     <Navigation
              //       size={14}
              //       color="#1e40af"
              //       fill="#1e40af"
              //       strokeWidth={2.2}
              //     />
              //   </View>
              //   <Text style={styles.routeButtonText}>Route</Text>
              // </TouchableOpacity>

              <IconButton
                icon={<Navigation size={14} color={getVariantColor('primary')} strokeWidth={2.3} />}
                label="Route"
                variant="primary"
                size="sm"
                fullWidth={false}
                onPress={() => {
                  navigation.navigate("RouteDetails", { tourId: tour.id });
                }}
              />
            )}
          </View>
        </View>
      </View>

      <View
        style={[
          styles.clientSummarySection,
          isAgent && styles.agentSummarySection,
        ]}
      >
        <Text style={styles.clientSectionEyebrow}>
          {isAgent ? "TOUR OVERVIEW" : "TOUR AT A GLANCE"}
        </Text>
        <View
          style={[
            styles.clientSummaryCard,
            isAgent && styles.agentSummaryCard,
          ]}
        >
          <View style={styles.clientStat}>
            <Text style={styles.clientStatValue}>
              {propertiesLoading ? "…" : String(stops.length)}
            </Text>
            <Text style={styles.clientStatLabel}>Properties</Text>
          </View>
          <View style={styles.clientStatDivider} />
          <View style={styles.clientStat}>
            <Text
              style={styles.clientStatValue}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.72}
            >
              {tour.totalDistance != null && Number(tour.totalDistance) > 0
                ? `${Number(tour.totalDistance).toFixed(1)} km`
                : "—"}
            </Text>
            <Text style={styles.clientStatLabel}>Distance</Text>
          </View>
          <View style={styles.clientStatDivider} />
          <View style={styles.clientStat}>
            <Text
              style={styles.clientStatValue}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.72}
            >
              {durationBlock.value ?? "—"}
            </Text>
            <Text style={styles.clientStatLabel}>{durationBlock.label}</Text>
          </View>
        </View>
      </View>

      {(tour.status === "scheduled" || tour.status === "in_progress") &&
        isAgent && (
          <View style={styles.agentActionsSection}>
            <Text style={styles.clientSectionEyebrow}>QUICK ACTIONS</Text>
            <View
              style={[
                styles.agentActionsCard,
                tour.status === "scheduled" &&
                  styles.agentActionsCardScheduled,
              ]}
            >
              <TouchableOpacity
                style={[
                  styles.agentPrimaryAction,
                  tour.status === "scheduled" &&
                    styles.agentPrimaryActionCompact,
                ]}
                onPress={
                  tour.status === "scheduled"
                    ? () => startTourMutation.mutate()
                    : onOpenNavigation
                }
                disabled={startTourMutation.isPending}
                activeOpacity={0.84}
              >
                <View style={styles.agentPrimaryActionIcon}>
                  {startTourMutation.isPending ? (
                    <ActivityIndicator size="small" color="#1e40af" />
                  ) : tour.status === "scheduled" ? (
                    <Play
                      size={18}
                      color="#1e40af"
                      fill="#1e40af"
                      strokeWidth={2.2}
                    />
                  ) : (
                    <Navigation
                      size={18}
                      color="#1e40af"
                      fill="#1e40af"
                      strokeWidth={2.2}
                    />
                  )}
                </View>
                <View style={styles.agentActionCopy}>
                  <Text style={styles.agentPrimaryActionTitle}>
                    {tour.status === "scheduled"
                      ? "Start tour"
                      : "Continue navigation"}
                  </Text>
                </View>
                {tour.status === "in_progress" && (
                  <ChevronRight size={18} color="#ffffff" strokeWidth={2.4} />
                )}
              </TouchableOpacity>

              <View
                style={[
                  styles.agentSecondaryActions,
                  tour.status === "scheduled" &&
                    styles.agentSecondaryActionsScheduled,
                ]}
              >
                <TouchableOpacity
                  style={styles.agentSecondaryAction}
                  onPress={() =>
                    navigation.navigate("AddPropertyToTour", { tourId })
                  }
                  activeOpacity={0.8}
                >
                  <Plus size={18} color="#1e40af" strokeWidth={2.4} />
                  <Text style={styles.agentSecondaryActionText}>
                    Add property
                  </Text>
                </TouchableOpacity>

                {tour.status === "in_progress" && (
                  <TouchableOpacity
                    style={[
                      styles.agentSecondaryAction,
                      styles.agentEndAction,
                    ]}
                    onPress={() => endTourMutation.mutate()}
                    disabled={endTourMutation.isPending}
                    activeOpacity={0.8}
                  >
                    {endTourMutation.isPending ? (
                      <ActivityIndicator size="small" color="#dc2626" />
                    ) : (
                      <Flag size={17} color="#dc2626" strokeWidth={2.2} />
                    )}
                    <Text
                      style={[
                        styles.agentSecondaryActionText,
                        styles.agentEndActionText,
                      ]}
                    >
                      End tour
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        )}

      {!isAgent && tour.status === "in_progress" && (
        <Button
          title="Open Navigation"
          onPress={onOpenNavigation}
          style={styles.startButton}
        />
      )}

      <Card style={isAgent ? styles.agentSection : styles.clientSection}>
        <CardHeader style={styles.clientSectionHeader}>
          <View style={styles.clientSectionTitleRow}>
            <View
              style={[
                styles.clientSectionIcon,
                isAgent && styles.agentSectionIcon,
              ]}
            >
              <Home size={18} color="#1e40af" strokeWidth={2.2} />
            </View>
            <View style={styles.sectionHeadingCopy}>
              <Text style={styles.clientSectionTitle}>
                {isAgent ? "Property itinerary" : "Tour properties"}
              </Text>
              <Text style={styles.clientSectionSubtitle}>
                {isAgent
                  ? `${stops.length} ${
                      stops.length === 1 ? "stop" : "stops"
                    } · Tap a property to manage it`
                  : `${stops.length} ${
                      stops.length === 1 ? "home" : "homes"
                    } in your itinerary`}
              </Text>
            </View>
          </View>
        </CardHeader>
        <CardContent style={styles.propertiesContent}>
          {stops.length > 0 ? (
            stops.map((tp, index) => (
              <TourStopRow
                key={String(tp.id ?? `${index}-${tp.masterPropertyId}`)}
                tp={tp}
                index={index}
                navigation={navigation}
                formatPrice={formatTourPrice}
                getPropertyStatusColor={propertyVisitStatusColor}
                onAddOffer={handleAddOffer}
                existingOffer={
                  offers.find(
                    (o) =>
                      o.masterPropertyId === tp.masterPropertyId &&
                      o.property?.id != null,
                  ) ?? null
                }
                onViewOffer={handleViewOffer}
                clientId={clientId}
                isAgent={isAgent}
              />
            ))
          ) : (
            <Text style={styles.emptyText}>
              {propertiesLoading ? "Loading…" : "No properties in this tour"}
            </Text>
          )}
        </CardContent>
      </Card>

      {tour.notes && (
        <Card
          style={
            isAgent ? styles.agentNotesSection : styles.clientNotesSection
          }
        >
          <CardHeader style={styles.clientSectionHeader}>
            <View style={styles.clientSectionTitleRow}>
              <View
                style={[
                  styles.clientNotesIcon,
                  isAgent && styles.agentNotesIcon,
                ]}
              >
                <MessageSquareText
                  size={18}
                  color="#1e40af"
                  strokeWidth={2.2}
                />
              </View>
              <View style={styles.sectionHeadingCopy}>
                <Text style={styles.clientSectionTitle}>
                  {isAgent ? "Client notes" : "Tour notes"}
                </Text>
                <Text style={styles.clientSectionSubtitle}>
                  {isAgent
                    ? `Preferences and context for ${clientName}`
                    : "Your preferences and additional comments"}
                </Text>
              </View>
            </View>
          </CardHeader>
          <CardContent style={styles.clientNotesContent}>
            <ClientNotes notes={tour.notes} />
          </CardContent>
        </Card>
      )}
    </ScrollView>
  );
}

// ─── TourDetailsScreen ────────────────────────────────────────────────────────

export function TourDetailsScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { tourId, clientProfileId } = route.params;
  const { user } = useAuth();
  const userRole = user?.role === "agent" ? "agent" : "client";
  const isAgent = userRole === "agent";

  const { data: tour, isLoading: tourLoading } = useQuery<Record<string, any>>({
    queryKey: tourDetailQueryKey(userRole, tourId),
    queryFn: async () => {
      const u = isAgent ? agentTourUrl(tourId) : clientTourUrl(tourId);
      return (await api.get(u)).data;
    },
    enabled: !!tourId,
  });

  const { data: properties, isLoading: propertiesLoading } = useQuery<
    TourPropertyStop[]
  >({
    queryKey: tourPropertiesQueryKey(userRole, tourId),
    queryFn: async () => {
      const u = isAgent
        ? agentTourPropertiesUrl(tourId)
        : clientTourPropertiesUrl(tourId);
      return (await api.get(u)).data;
    },
    enabled: !!tourId,
  });

  const { data: offersPage } = useQuery({
    queryKey: agentOffersQueryKey({ page: 0, size: 100 }),
    queryFn: () => fetchAgentOffersPage({ page: 0, size: 100 }),
    enabled: isAgent,
  });
  const offers = offersPage?.content ?? [];

  const isLoading = tourLoading;
  const stops: TourPropertyStop[] = Array.isArray(properties) ? properties : [];

  const clientId: string | null = clientProfileId ?? null;

  const startTourMutation = useMutation({
    mutationFn: () =>
      apiRequest("PATCH", agentTourUrl(tourId as string), {
        status: "in_progress",
        startTime: new Date().toISOString(),
      }),
    onSuccess: () => {
      if (!tourId) return;
      invalidateSingleTourQueries("agent", tourId);
      if (stops.length > 0) {
        void openMapsNavigationForTour(stops, tourId, isAgent);
      }
    },
  });

  const endTourMutation = useMutation({
    mutationFn: async () => {
      const coords = await getTourForegroundCoordinatesWithTimeout(
        END_TOUR_GEO_TIMEOUT_MS,
      );
      const body: Record<string, unknown> = {};
      if (coords != null) {
        body.endLatitude = coords.latitude;
        body.endLongitude = coords.longitude;
      }
      return apiRequest("PATCH", agentCompleteTourUrl(tourId as string), body);
    },
    onSuccess: () => {
      if (tourId) invalidateSingleTourQueries("agent", tourId);
    },
    onError: (err: unknown) => {
      Alert.alert(
        "Could not end tour",
        formatApiErrorMessage(err, "Check your connection and try again."),
      );
    },
  });

  if (tourId == null) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Missing tour</Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading...</Text>
      </View>
    );
  }

  if (!tour?.id) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Tour not found</Text>
      </View>
    );
  }

  return (
    <>
      <TourDetailsLoadedContent
        tour={tour}
        stops={stops}
        propertiesLoading={propertiesLoading}
        navigation={navigation}
        tourId={tourId}
        isAgent={isAgent}
        clientId={clientId}
        offers={offers}
        startTourMutation={startTourMutation}
        endTourMutation={endTourMutation}
        onOpenNavigation={() =>
          void openMapsNavigationForTour(stops, tourId, isAgent)
        }
      />

      {userRole == "agent" ? (
        <AgentFooter active="tours" />
      ) : (
        <ClientFooter active="mytours" />
      )}
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f4f7fb",
  },
  scrollContent: {
    paddingBottom: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    fontSize: 16,
    color: "#64748b",
  },

  // ─── Price row + cloud upload icon ───────────────────────────────────────
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  uploadIconBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 11,
    backgroundColor: "#eff6ff",
  },

  propertyLoading: {
    padding: 16,
    alignItems: "center",
  },
  header: {
    backgroundColor: "#ffffff",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  clientHeader: {
    marginHorizontal: 16,
    marginTop: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: "#dbe7f8",
    borderRadius: 20,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 3,
  },
  agentHeader: {
    marginHorizontal: 16,
    marginTop: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: "#cdddf8",
    borderRadius: 20,
    backgroundColor: "#ffffff",
    shadowColor: "#1e3a8a",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  clientHeaderEyebrow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginBottom: 12,
  },
  clientHeaderEyebrowIcon: {
    width: 25,
    height: 25,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#eff6ff",
  },
  agentHeaderEyebrowIcon: {
    backgroundColor: "#dbeafe",
  },
  clientHeaderEyebrowText: {
    fontSize: 10,
    lineHeight: 14,
    color: "#1e40af",
    fontWeight: "800",
    letterSpacing: 0.9,
  },
  headerInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
    marginRight: 12,
  },
  headerActions: {
    alignItems: "flex-end",
    justifyContent: "space-between",
    alignSelf: "stretch",
  },
  tourId: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1e293b",
  },
  clientTourTitle: {
    fontSize: 23,
    lineHeight: 29,
    fontWeight: "800",
    letterSpacing: -0.4,
  },
  clientSchedule: {
    marginTop: 11,
    gap: 7,
  },
  clientScheduleItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  clientScheduleText: {
    fontSize: 13,
    lineHeight: 18,
    color: "#475569",
    fontWeight: "600",
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "capitalize",
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
  date: {
    fontSize: 16,
    color: "#475569",
    marginTop: 8,
  },
  time: {
    fontSize: 14,
    color: "#64748b",
    marginTop: 2,
  },
  statsRow: {
    flexDirection: "row",
    padding: 16,
    gap: 12,
  },
  clientSummarySection: {
    marginTop: 20,
    marginHorizontal: 16,
  },
  agentSummarySection: {
    marginTop: 18,
  },
  clientSectionEyebrow: {
    marginBottom: 8,
    marginLeft: 2,
    fontSize: 10,
    lineHeight: 14,
    color: "#94a3b8",
    fontWeight: "800",
    letterSpacing: 0.9,
  },
  clientSummaryCard: {
    minHeight: 94,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 9,
    elevation: 2,
  },
  agentSummaryCard: {
    borderColor: "#d4e1f7",
    shadowColor: "#1e3a8a",
    shadowOpacity: 0.07,
  },
  clientStat: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    paddingHorizontal: 6,
  },
  clientStatDivider: {
    width: 1,
    height: 42,
    backgroundColor: "#e2e8f0",
  },
  clientStatValue: {
    width: "100%",
    textAlign: "center",
    fontSize: 19,
    lineHeight: 24,
    fontWeight: "800",
    color: "#1e40af",
    letterSpacing: -0.25,
  },
  clientStatLabel: {
    marginTop: 4,
    fontSize: 10,
    lineHeight: 14,
    color: "#64748b",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.35,
  },
  statCard: {
    flex: 1,
  },
  statContent: {
    alignItems: "center",
    paddingVertical: 12,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1e40af",
  },
  statLabel: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,
  },
  startButton: {
    marginHorizontal: 16,
    marginBottom: 8,
  },
  addPropertyButton: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  endTourButton: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderColor: "#ef4444",
  },
  agentActionsSection: {
    marginTop: 18,
    marginHorizontal: 16,
  },
  agentActionsCard: {
    padding: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: "#dbe5f4",
    borderRadius: 18,
    backgroundColor: "#ffffff",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 9,
    elevation: 2,
  },
  agentActionsCardScheduled: {
    flexDirection: "row",
  },
  agentPrimaryAction: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "#1e40af",
    shadowColor: "#1e40af",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 3,
  },
  agentPrimaryActionCompact: {
    flex: 1,
    minWidth: 0,
    minHeight: 50,
    shadowOpacity: 0.16,
  },
  agentPrimaryActionIcon: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    backgroundColor: "#ffffff",
  },
  agentActionCopy: {
    flex: 1,
    minWidth: 0,
    marginLeft: 9,
  },
  agentPrimaryActionTitle: {
    color: "#ffffff",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "800",
  },
  agentSecondaryActions: {
    flexDirection: "row",
    gap: 8,
  },
  agentSecondaryActionsScheduled: {
    flex: 1,
    minWidth: 0,
  },
  agentSecondaryAction: {
    minHeight: 50,
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "#bfd0f1",
    borderRadius: 11,
    backgroundColor: "#f7faff",
  },
  agentSecondaryActionText: {
    color: "#1e40af",
    fontSize: 12,
    fontWeight: "700",
  },
  agentEndAction: {
    borderColor: "#fecaca",
    backgroundColor: "#fff7f7",
  },
  agentEndActionText: {
    color: "#dc2626",
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  agentSection: {
    marginHorizontal: 16,
    marginBottom: 16,
    marginTop: 20,
    overflow: "hidden",
    borderColor: "#d8e3f2",
    borderRadius: 20,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 2,
  },
  clientSection: {
    marginHorizontal: 16,
    marginBottom: 16,
    marginTop: 20,
    borderRadius: 20,
    borderColor: "#e2e8f0",
    overflow: "hidden",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  clientSectionHeader: {
    padding: 16,
    backgroundColor: "#fbfdff",
    borderBottomColor: "#e8eef6",
  },
  clientSectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  sectionHeadingCopy: {
    flex: 1,
    minWidth: 0,
  },
  clientSectionIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#eff6ff",
    marginRight: 11,
  },
  agentSectionIcon: {
    backgroundColor: "#dbeafe",
  },
  clientNotesIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#eff6ff",
    marginRight: 11,
  },
  agentNotesIcon: {
    backgroundColor: "#e0e7ff",
  },
  clientSectionTitle: {
    fontSize: 17,
    lineHeight: 22,
    color: "#1e293b",
    fontWeight: "800",
  },
  clientSectionSubtitle: {
    marginTop: 1,
    fontSize: 11,
    lineHeight: 15,
    color: "#64748b",
  },
  clientNotesSection: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 20,
    borderColor: "#e2e8f0",
    overflow: "hidden",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  agentNotesSection: {
    marginHorizontal: 16,
    marginBottom: 16,
    overflow: "hidden",
    borderColor: "#d8e3f2",
    borderRadius: 20,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 2,
  },
  clientNotesContent: {
    padding: 14,
    paddingBottom: 4,
  },
  propertiesContent: {
    padding: 12,
    gap: 12,
  },
  propertyCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  clientPropertyCard: {
    borderRadius: 16,
    borderColor: "#e2e8f0",
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  agentPropertyCard: {
    borderRadius: 16,
    borderColor: "#d9e3f1",
    shadowColor: "#0f172a",
    shadowOpacity: 0.09,
    shadowRadius: 7,
    elevation: 3,
  },
  photoContainer: {
    position: "relative",
  },
  stopBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#1e40af",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
  agentStopBadge: {
    top: 12,
    left: 12,
    width: 36,
    height: 36,
    borderRadius: 12,
  },
  stopBadgeText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
  },
  visitStatusBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  visitStatusText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  propertyDetails: {
    padding: 12,
  },
  clientPropertyDetails: {
    padding: 14,
  },
  agentPropertyDetails: {
    padding: 14,
  },
  propertyPrice: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1e40af",
  },
  agentPropertyPrice: {
    fontSize: 22,
    fontWeight: "800",
  },
  viewDetailsLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    borderRadius: 999,
    backgroundColor: "#eff6ff",
    paddingLeft: 9,
    paddingRight: 6,
    paddingVertical: 5,
  },
  viewDetailsText: {
    fontSize: 10,
    lineHeight: 14,
    color: "#1e40af",
    fontWeight: "700",
  },
  propertyAddress: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1e293b",
  },
  propertyCity: {
    fontSize: 13,
    color: "#64748b",
    marginTop: 2,
  },
  specsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 10,
  },
  specItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  specIcon: {
    fontSize: 13,
  },
  specText: {
    fontSize: 13,
    color: "#475569",
    fontWeight: "500",
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
  },
  typeTag: {
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  typeTagText: {
    fontSize: 11,
    color: "#475569",
    fontWeight: "600",
    textTransform: "capitalize",
  },
  metaText: {
    fontSize: 11,
    color: "#94a3b8",
  },
  emptyText: {
    textAlign: "center",
    color: "#94a3b8",
    paddingVertical: 16,
  },
  // ─── Property actions row (offer button + share toggle) ───────────────────
  propertyActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
  },
  leftActionsGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 1,
    flexWrap: "wrap",
  },
  addOfferButton: {
    backgroundColor: "#1e40af",
    paddingVertical: 9,
    paddingHorizontal: 15,
    borderRadius: 10,
    alignSelf: "flex-start",
  },
  viewOfferButton: {
    backgroundColor: "#1e40af",
  },
  addOfferButtonText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "600",
  },
  // ─── Share media toggle ───────────────────────────────────────────────────
  shareMediaContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  shareMediaLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: "#475569",
  },
  shareMediaSpinner: {
    marginHorizontal: 8,
  },
});













// import {
//   View,
//   Text,
//   StyleSheet,
//   ScrollView,
//   TouchableOpacity,
//   Linking,
//   ActivityIndicator,
//   Alert,
//   Switch,
// } from "react-native";
// import { useCallback, useEffect, useState } from "react";
// import { Ionicons } from "@expo/vector-icons";
// import { useQuery, useMutation } from "@tanstack/react-query";
// import { useRoute, useNavigation } from "@react-navigation/native";
// import { AxiosError } from "axios";
// import { api, apiRequest } from "../lib/api";
// import { getTourForegroundCoordinatesWithTimeout } from "../lib/tourGeolocation";
// import { catalogPropertyPath } from "../lib/apiGlobalPaths";
// import {
//   clientTourUrl,
//   clientTourPropertiesUrl,
//   agentTourUrl,
//   agentTourPropertiesUrl,
//   agentCompleteTourUrl,
//   agentCalculateRouteDistanceUrl,
//   tourDetailQueryKey,
//   tourPropertiesQueryKey,
//   invalidateSingleTourQueries,
// } from "../lib/tourApi";
// import {
//   fetchAgentOffersPage,
//   agentOffersQueryKey,
//   type AgentOffer,
// } from "../lib/offersApi";
// import {
//   useSharePropertyMediaWithClient,
//   useRevokePropertyMediaShare,
//   usePropertyMediaShareStatus,
//   fetchPropertyMedia,
//   agentQueryKeys,
//   type PropertyMediaShareResponse,
// } from "../lib/agentApi";
// import { Card, CardContent, CardHeader, CardTitle } from "../components/Card";
// import { Button } from "../components/Button";
// import { PropertyPhotoCarousel } from "../components/PropertyPhotoCarousel";
// import { useAuth } from "../contexts/AuthContext";
// import { ClientFooter } from "./client/components/ClientFooter";
// import { AgentFooter } from "./agent/components/AgentFooter";
// import { NormalButton } from "@/components/common/ST_Buttons";

// const END_TOUR_GEO_TIMEOUT_MS = 5_000;
// const NAVIGATION_GEO_TIMEOUT_MS = 5_000;

// function formatApiErrorMessage(err: unknown, fallback: string): string {
//   if (err instanceof AxiosError) {
//     const data = err.response?.data;
//     if (typeof data === "object" && data != null && "message" in data) {
//       const m = (data as { message?: string }).message;
//       if (typeof m === "string" && m.trim()) return m;
//     }
//     if (typeof err.message === "string" && err.message.trim()) {
//       return err.message;
//     }
//   }
//   if (err instanceof Error && err.message) return err.message;
//   return fallback;
// }

// function formatDurationMins(mins: number | null | undefined) {
//   if (mins == null || mins <= 0) return null;
//   if (mins < 60) return `${mins}m`;
//   const hours = Math.floor(mins / 60);
//   const rem = mins % 60;
//   const minutesPart = rem > 0 ? String(rem) + "m" : "";
//   return `${hours}h${minutesPart}`;
// }

// type TourPropertyStop = {
//   id?: string | number;
//   masterPropertyId?: number;
//   propertyId?: string;
//   status?: string;
//   order?: number;
// };

// function formatTourPrice(price: unknown): string | null {
//   if (!price) return null;
//   return new Intl.NumberFormat("en-US", {
//     style: "currency",
//     currency: "USD",
//     maximumFractionDigits: 0,
//   }).format(Number(price));
// }

// function tourStatusColor(status: string): string {
//   switch (status) {
//     case "scheduled":
//       return "#3b82f6";
//     case "in_progress":
//       return "#f59e0b";
//     case "completed":
//       return "#10b981";
//     case "cancelled":
//       return "#ef4444";
//     default:
//       return "#64748b";
//   }
// }

// function propertyVisitStatusColor(status: string): string {
//   switch (status) {
//     case "liked":
//       return "#10b981";
//     case "rejected":
//       return "#ef4444";
//     case "offer_made":
//       return "#8b5cf6";
//     case "viewed":
//       return "#3b82f6";
//     default:
//       return "#64748b";
//   }
// }

// function tourDateField(value: unknown): Date | null {
//   if (value == null || value === "") {
//     return null;
//   }
//   if (value instanceof Date) {
//     return Number.isNaN(value.getTime()) ? null : value;
//   }
//   if (typeof value === "string" || typeof value === "number") {
//     const d = new Date(value);
//     return Number.isNaN(d.getTime()) ? null : d;
//   }
//   return null;
// }

// function computeTourSchedule(tour: Record<string, unknown>): {
//   scheduled: Date | null;
//   timeForHeader: Date | null;
// } {
//   const scheduledDate = tourDateField(tour.scheduledDate);
//   const startTime = tourDateField(tour.startTime);
//   let scheduled: Date | null = null;
//   if (scheduledDate != null) {
//     scheduled = scheduledDate;
//   } else if (startTime != null) {
//     scheduled = startTime;
//   }
//   const timeForHeader = startTime ?? scheduled;
//   return { scheduled, timeForHeader };
// }

// function computeDurationBlock(tour: Record<string, unknown>): {
//   label: string;
//   value: string | null;
// } {
//   const act = tour.actualDurationMinutes;
//   const est = tour.estimatedDurationMinutes;
//   if (act != null && typeof act === "number" && act > 0) {
//     return { label: "Time taken", value: formatDurationMins(act) };
//   }
//   if (est != null && typeof est === "number" && est > 0) {
//     const fm = formatDurationMins(est);
//     if (fm != null) {
//       return { label: "Est. time", value: `~${fm}` };
//     }
//     return { label: "Est. time", value: "—" };
//   }
//   return { label: "Est. time", value: "—" };
// }

// async function openMapsNavigationForTour(
//   stops: TourPropertyStop[],
//   tourId: string,
//   isAgent: boolean,
// ): Promise<void> {
//   if (stops.length === 0) {
//     return;
//   }

//   const pos = await getTourForegroundCoordinatesWithTimeout(
//     NAVIGATION_GEO_TIMEOUT_MS,
//   );
//   const routeDistanceBody = {
//     originLat: pos?.latitude ?? null,
//     originLng: pos?.longitude ?? null,
//   };

//   const postRouteDistanceWhenAgent = () => {
//     if (isAgent) {
//       void api
//         .post(agentCalculateRouteDistanceUrl(tourId), routeDistanceBody)
//         .then(() => {
//           invalidateSingleTourQueries("agent", tourId);
//         })
//         .catch(() => undefined);
//     }
//   };

//   const addressList: string[] = [];
//   for (const tp of stops) {
//     const mid =
//       tp.masterPropertyId ?? (tp as { propertyId?: number }).propertyId;
//     if (mid == null) continue;
//     try {
//       const { data: prop } = await api.get(catalogPropertyPath(mid));
//       if (prop?.address) addressList.push(String(prop.address));
//     } catch {
//       // skip stop without address
//     }
//   }

//   if (addressList.length === 0) {
//     postRouteDistanceWhenAgent();
//     return;
//   }

//   const lastAddr = addressList.at(-1);
//   if (lastAddr == null) {
//     return;
//   }

//   const destination = encodeURIComponent(lastAddr);
//   const waypoints = addressList
//     .slice(0, -1)
//     .map((a) => encodeURIComponent(a))
//     .join("|");

//   postRouteDistanceWhenAgent();

//   let url = `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
//   if (pos != null) {
//     url += `&origin=${pos.latitude},${pos.longitude}`;
//   }
//   if (waypoints.length > 0) {
//     url += `&waypoints=${waypoints}`;
//   }
//   void Linking.openURL(url);
// }

// // ─── TourStopRow ─────────────────────────────────────────────────────────────

// type TourStopRowProps = Readonly<{
//   tp: TourPropertyStop;
//   index: number;
//   navigation: Readonly<{
//     navigate: (n: string, p: Record<string, unknown>) => void;
//   }>;
//   formatPrice: (price: any) => string | null;
//   getPropertyStatusColor: (status: string) => string;
//   onAddOffer: (propertyId: string) => void;
//   /** Existing offer for this property's masterPropertyId, if any */
//   existingOffer: AgentOffer | null;
//   onViewOffer: (offerId: string) => void;
//   /** Client profile id — needed for share/revoke media */
//   clientId: string | null;
//   isAgent: boolean;
// }>;

// // ─── TourDetailsLoadedContent ─────────────────────────────────────────────────

// function TourStopRow({
//   tp,
//   index,
//   navigation,
//   formatPrice,
//   getPropertyStatusColor,
//   onAddOffer,
//   existingOffer,
//   onViewOffer,
//   clientId,
//   isAgent,
// }: TourStopRowProps) {
//   const mid = tp.masterPropertyId ?? (tp as { propertyId?: number }).propertyId;
//   const { data: prop, isLoading } = useQuery({
//     queryKey: ["tourStop", "property", String(mid ?? "")],
//     queryFn: () => api.get(catalogPropertyPath(mid!)).then((r) => r.data),
//     enabled: mid != null && String(mid) !== "" && !Number.isNaN(Number(mid)),
//   });
//   const rawPropertyId = prop?.id;
//   const detailId =
//     rawPropertyId !== undefined && rawPropertyId !== null
//       ? String(rawPropertyId)
//       : String(mid);

//   // ─── Fetch property media to decide whether to show share toggle ──────────
//   const { data: mediaList } = useQuery({
//     queryKey: [...agentQueryKeys.propertyMedia(detailId), "list"],
//     queryFn: () => fetchPropertyMedia(detailId),
//     enabled: isAgent && !!detailId && detailId !== "undefined",
//     staleTime: 1000 * 30,
//   });

//   const hasMedia =
//     Array.isArray(mediaList) &&
//     mediaList.length > 0 &&
//     mediaList.some(
//       (m) => (m.images?.length ?? 0) > 0 || (m.videos?.length ?? 0) > 0,
//     );
//   // ─────────────────────────────────────────────────────────────────────────

//   // ─── Share / Revoke media state ───────────────────────────────────────────
//   // ─── Share / Revoke media state ───────────────────────────────────────────
//   const { data: isMediaSharedRemote, isLoading: isShareStatusLoading } =
//     usePropertyMediaShareStatus(clientId ?? "", mid ?? "", {
//       enabled: isAgent && !!clientId && !!mid,
//     });

//   const [mediaShared, setMediaShared] = useState(false);
//   const [sharingId, setSharingId] = useState<string | number | null>(null);

//   // Sync remote share status into local state once loaded
//   useEffect(() => {
//     if (isMediaSharedRemote !== undefined) {
//       setMediaShared(isMediaSharedRemote);
//     }
//   }, [isMediaSharedRemote]);

//   const shareMutation = useSharePropertyMediaWithClient();
//   const revokeMutation = useRevokePropertyMediaShare();

//   const handleMediaShareToggle = useCallback(
//     (value: boolean) => {
//       if (!clientId || !mid) return;

//       if (value) {
//         shareMutation.mutate(
//           { clientId, propertyId: mid },
//           {
//             onSuccess: (res: PropertyMediaShareResponse) => {
//               setMediaShared(true);
//               setSharingId(res.id);
//             },
//             onError: (err: unknown) => {
//               Alert.alert(
//                 "Share failed",
//                 formatApiErrorMessage(err, "Could not share media. Try again."),
//               );
//             },
//           },
//         );
//       } else {
//         if (sharingId == null) return;
//         revokeMutation.mutate(sharingId, {
//           onSuccess: () => {
//             setMediaShared(false);
//             setSharingId(null);
//           },
//           onError: (err: unknown) => {
//             Alert.alert(
//               "Revoke failed",
//               formatApiErrorMessage(err, "Could not revoke media. Try again."),
//             );
//           },
//         });
//       }
//     },
//     [clientId, mid, sharingId, shareMutation, revokeMutation],
//   );

//   // const isSharePending = shareMutation.isPending || revokeMutation.isPending;
//   const isSharePending =
//     isShareStatusLoading || shareMutation.isPending || revokeMutation.isPending;
//   // ─────────────────────────────────────────────────────────────────────────

//   if (isLoading) {
//     if (prop === undefined) {
//       return (
//         <View style={styles.propertyCard}>
//           <View style={styles.propertyLoading}>
//             <ActivityIndicator size="small" color="#1e40af" />
//           </View>
//         </View>
//       );
//     }
//   }

//   const p: Record<string, any> = prop || {
//     id: detailId,
//     address: `Property #${mid}`,
//     price: null,
//   };

//   return (
//     <TouchableOpacity
//       style={styles.propertyCard}
//       onPress={() =>
//         navigation.navigate("PropertyDetails", {
//           propertyId: String(detailId),
//           userType: "agent",
//         })
//       }
//       activeOpacity={0.85}
//     >
//       <View style={styles.photoContainer}>
//         {/* <PropertyPhotoCarousel propertyId={String(detailId)} height={160} /> */}
//         <PropertyPhotoCarousel
//           photos={p.photos ?? []}
//           imageUrl={p.imageUrl}
//           height={160}
//         />
//         <View style={styles.stopBadge}>
//           <Text style={styles.stopBadgeText}>{index + 1}</Text>
//         </View>
//         {tp.status && tp.status !== "scheduled" && (
//           <View
//             style={[
//               styles.visitStatusBadge,
//               { backgroundColor: getPropertyStatusColor(tp.status) },
//             ]}
//           >
//             <Text style={styles.visitStatusText}>
//               {tp.status.replace("_", " ")}
//             </Text>
//           </View>
//         )}
//       </View>

//       <View style={styles.propertyDetails}>
//         <View style={styles.priceRow}>
//           {p.price ? (
//             <Text style={styles.propertyPrice}>{formatPrice(p.price)}</Text>
//           ) : (
//             <View />
//           )}
//           {isAgent && (
//             <TouchableOpacity
//               style={styles.uploadIconBtn}
//               onPress={(e) => {
//                 e.stopPropagation?.();
//                 navigation.navigate("MediaUpload", {
//                   propertyId: detailId,
//                   propertyAddress: String(p.address),
//                 });
//               }}
//               hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
//             >
//               <Ionicons name="cloud-upload-outline" size={20} color="#1e40af" />
//             </TouchableOpacity>
//           )}
//         </View>

//         <Text style={styles.propertyAddress} numberOfLines={1}>
//           {p.address}
//         </Text>
//         {(p.city || p.province) && (
//           <Text style={styles.propertyCity}>
//             {[p.city, p.province].filter(Boolean).join(", ")}
//           </Text>
//         )}
//         {(p.bedrooms != null || p.bathrooms != null) && (
//           <View style={styles.specsRow}>
//             {p.bedrooms != null && (
//               <View style={styles.specItem}>
//                 <Text style={styles.specIcon}>🛏</Text>
//                 <Text style={styles.specText}>{p.bedrooms} bed</Text>
//               </View>
//             )}
//             {p.bathrooms != null && (
//               <View style={styles.specItem}>
//                 <Text style={styles.specIcon}>🚿</Text>
//                 <Text style={styles.specText}>{p.bathrooms} bath</Text>
//               </View>
//             )}
//             {p.area && (
//               <View style={styles.specItem}>
//                 <Text style={styles.specIcon}>📐</Text>
//                 <Text style={styles.specText}>{p.area}</Text>
//               </View>
//             )}
//           </View>
//         )}
//         <View style={styles.metaRow}>
//           {p.propertyType && (
//             <View style={styles.typeTag}>
//               <Text style={styles.typeTagText}>{p.propertyType}</Text>
//             </View>
//           )}
//           {p.mlsNumber && (
//             <Text style={styles.metaText}>MLS #{p.mlsNumber}</Text>
//           )}
//         </View>

//         {/* ─── Add Offer / View Offer  +  Share Media toggle ───────────── */}
//         <View style={styles.propertyActionsRow}>
//           <View style={styles.leftActionsGroup}>
//             {existingOffer ? (
//               <TouchableOpacity
//                 style={[styles.addOfferButton, styles.viewOfferButton]}
//                 onPress={(e) => {
//                   e.stopPropagation?.();
//                   onViewOffer(existingOffer.id);
//                 }}
//                 activeOpacity={0.8}
//               >
//                 <Text style={styles.addOfferButtonText}>View Offer</Text>
//               </TouchableOpacity>
//             ) : isAgent ? (
//               <TouchableOpacity
//                 style={styles.addOfferButton}
//                 onPress={(e) => {
//                   e.stopPropagation?.();
//                   onAddOffer(String(detailId));
//                 }}
//                 activeOpacity={0.8}
//               >
//                 <Text style={styles.addOfferButtonText}>+ Add Offer</Text>
//               </TouchableOpacity>
//             ) : null}
//           </View>

//           {/* Only shown when agent, clientId present, and property has media */}
//           {isAgent && clientId != null && hasMedia && (
//             <TouchableOpacity
//               activeOpacity={1}
//               onPress={(e) => e.stopPropagation?.()}
//             >
//               <View style={styles.shareMediaContainer}>
//                 {isSharePending ? (
//                   <ActivityIndicator
//                     size="small"
//                     color="#1e40af"
//                     style={styles.shareMediaSpinner}
//                   />
//                 ) : (
//                   <>
//                     <Text style={styles.shareMediaLabel}>
//                       {mediaShared ? "Media Shared" : "Share Media"}
//                     </Text>
//                     <Switch
//                       value={mediaShared}
//                       onValueChange={handleMediaShareToggle}
//                       trackColor={{ false: "#cbd5e1", true: "#93c5fd" }}
//                       thumbColor={mediaShared ? "#1e40af" : "#f1f5f5"}
//                     />
//                   </>
//                 )}
//               </View>
//             </TouchableOpacity>
//           )}
//         </View>
//         {/* ──────────────────────────────────────────────────────────────── */}

//         {/* ──────────────────────────────────────────────────────────────── */}
//       </View>
//     </TouchableOpacity>
//   );
// }

// type TourDetailsLoadedProps = Readonly<{
//   tour: Record<string, any>;
//   stops: TourPropertyStop[];
//   propertiesLoading: boolean;
//   navigation: any;
//   tourId: string;
//   isAgent: boolean;
//   clientId: string | null;
//   /** All pending offers fetched from the offers API */
//   offers: AgentOffer[];
//   startTourMutation: { mutate: () => void; isPending: boolean };
//   endTourMutation: { mutate: () => void; isPending: boolean };
//   onOpenNavigation: () => void;
// }>;

// function TourDetailsLoadedContent({
//   tour,
//   stops,
//   propertiesLoading,
//   navigation,
//   tourId,
//   isAgent,
//   clientId,
//   offers,
//   startTourMutation,
//   endTourMutation,
//   onOpenNavigation,
// }: TourDetailsLoadedProps) {
//   const { scheduled, timeForHeader } = computeTourSchedule(tour);
//   const durationBlock = computeDurationBlock(tour);

//   const handleAddOffer = useCallback(
//     (propertyId: string) => {
//       navigation.navigate("CreateOffer", {
//         prefillClientId: clientId ?? undefined,
//         prefillPropertyId: propertyId,
//         initialStep: 3,
//       });
//     },
//     [navigation, clientId],
//   );

//   const handleViewOffer = useCallback(
//     (offerId: string) => {
//       navigation.navigate("OfferDetail", { offerId });
//     },
//     [navigation],
//   );

//   return (
//     <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
//       {/* <View style={styles.header}>
//         <View style={styles.headerInfo}>
//           <Text style={styles.tourId}>
//             Tour with {String(tour.clientDisplayName)}
//           </Text>
//           <View
//             style={[
//               styles.statusBadge,
//               {
//                 backgroundColor:
//                   tourStatusColor(String(tour.status ?? "")) + "20",
//               },
//             ]}
//           >
//             <Text
//               style={[
//                 styles.statusText,
//                 { color: tourStatusColor(String(tour.status ?? "")) },
//               ]}
//             >
//               {String(tour.status ?? "").replace("_", " ")}
//             </Text>
//           </View>
//         </View>
//         {scheduled && (
//           <Text style={styles.date}>
//             {scheduled.toLocaleDateString("en-US", {
//               weekday: "long",
//               year: "numeric",
//               month: "long",
//               day: "numeric",
//             })}
//           </Text>
//         )}
//         {timeForHeader && (
//           <Text style={styles.time}>
//             {timeForHeader.toLocaleTimeString("en-US", {
//               hour: "numeric",
//               minute: "2-digit",
//             })}
//           </Text>
//         )}
//       </View> */}

//       <View style={styles.header}>
//         <View style={styles.headerInfo}>
//           <View style={{ flex: 1 }}>
//             <Text style={styles.tourId}>
//               Tour with {String(tour.clientDisplayName)}
//             </Text>
//             {scheduled && (
//               <Text style={styles.date}>
//                 {scheduled.toLocaleDateString("en-US", {
//                   weekday: "long",
//                   year: "numeric",
//                   month: "long",
//                   day: "numeric",
//                 })}
//               </Text>
//             )}
//             {timeForHeader && (
//               <Text style={styles.time}>
//                 {timeForHeader.toLocaleTimeString("en-US", {
//                   hour: "numeric",
//                   minute: "2-digit",
//                 })}
//               </Text>
//             )}
//           </View>

//           {/* Right column: status badge top, Route Plan button bottom */}
//           <View
//             style={{
//               alignItems: "flex-end",
//               justifyContent: "space-between",
//               alignSelf: "stretch",
//             }}
//           >
//             <View
//               style={[
//                 styles.statusBadge,
//                 {
//                   backgroundColor:
//                     tourStatusColor(String(tour.status ?? "")) + "20",
//                 },
//               ]}
//             >
//               <Text
//                 style={[
//                   styles.statusText,
//                   { color: tourStatusColor(String(tour.status ?? "")) },
//                 ]}
//               >
//                 {String(tour.status ?? "").replace("_", " ")}
//               </Text>
//             </View>

//             {(tour.status === "scheduled" || tour.status === "in_progress") && (
//               // <Button
//               //   title="Route Plan"
//               //   onPress={() => navigation.navigate("RouteDetails", { tourId })}
//               //   variant="outline"
//               //   style={{ marginHorizontal: 0, marginBottom: 0 }}
//               // />

//               <NormalButton
//                 label="Route Plan"
//                 variant="primary"
//                 size="sm"
//                 fullWidth={false}
//                 onPress={() =>
//                   navigation.navigate("RouteDetails", { tourId: tourId })
//                 }
//               />
//             )}
//           </View>
//         </View>
//       </View>

//       <View style={styles.statsRow}>
//         <Card style={styles.statCard}>
//           <CardContent style={styles.statContent}>
//             <Text style={styles.statValue}>
//               {propertiesLoading ? "…" : String(stops.length)}
//             </Text>
//             <Text style={styles.statLabel}>Properties</Text>
//           </CardContent>
//         </Card>

//         <Card style={styles.statCard}>
//           <CardContent style={styles.statContent}>
//             <Text style={styles.statValue}>
//               {tour.totalDistance != null && Number(tour.totalDistance) > 0
//                 ? `${Number(tour.totalDistance).toFixed(1)}`
//                 : "—"}
//             </Text>
//             <Text style={styles.statLabel}>
//               {tour.totalDistance != null && Number(tour.totalDistance) > 0
//                 ? "km covered"
//                 : "Distance"}
//             </Text>
//           </CardContent>
//         </Card>

//         <Card style={styles.statCard}>
//           <CardContent style={styles.statContent}>
//             <Text style={styles.statValue}>{durationBlock.value ?? "—"}</Text>
//             <Text style={styles.statLabel}>{durationBlock.label}</Text>
//           </CardContent>
//         </Card>
//       </View>

//       {tour.status === "scheduled" && isAgent && (
//         <Button
//           title="Start Tour & Navigate"
//           onPress={() => startTourMutation.mutate()}
//           loading={startTourMutation.isPending}
//           style={styles.startButton}
//         />
//       )}

//       {tour.status === "in_progress" && (
//         <Button
//           title="Open Navigation"
//           onPress={onOpenNavigation}
//           style={styles.startButton}
//         />
//       )}

//       {tour.status === "in_progress" && isAgent && (
//         <Button
//           title="End Tour"
//           onPress={() => endTourMutation.mutate()}
//           loading={endTourMutation.isPending}
//           variant="outline"
//           style={styles.endTourButton}
//         />
//       )}

//       {/* {(tour.status === "scheduled" || tour.status === "in_progress") &&
//         isAgent && (
//           <div>
//             <Button
//               title="+ Add Property"
//               onPress={() =>
//                 navigation.navigate("AddPropertyToTour", { tourId })
//               }
//               variant="outline"
//               style={styles.addPropertyButton}
//             />

//             <NormalButton
//               label="Route Plan"
//               variant="primary"
//               size="sm"
//               fullWidth={false}
//               onPress={() => navigation.navigate("RouteDetails", {tourId: tourId})}
//             />
//           </div>
//         )} */}

//       {(tour.status === "scheduled" || tour.status === "in_progress") &&
//         isAgent && (
//           <View
//             style={{
//               flexDirection: "row",
//               marginHorizontal: 16,
//               marginBottom: 16,
//               gap: 12,
//             }}
//           >
//             <View style={{ flex: 1 }}>
//               <Button
//                 title="+ Add Property"
//                 onPress={() =>
//                   navigation.navigate("AddPropertyToTour", { tourId })
//                 }
//                 variant="outline"
//                 style={{ marginHorizontal: 0, marginBottom: 0 }}
//               />
//             </View>

//             {/* <View style={{ flex: 1 }}>

//               <Button
//                 title="Route Plan"
//                 onPress={() =>
//                   navigation.navigate("RouteDetails", { tourId: tourId })
//                 }
//                 variant="outline"
//                 style={{ marginHorizontal: 0, marginBottom: 0 }}
//               />
              
//             </View> */}
//           </View>
//         )}

//       <Card style={styles.section}>
//         <CardHeader>
//           <CardTitle>Properties ({stops.length})</CardTitle>
//         </CardHeader>
//         <CardContent style={styles.propertiesContent}>
//           {stops.length > 0 ? (
//             stops.map((tp, index) => (
//               <TourStopRow
//                 key={String(tp.id ?? `${index}-${tp.masterPropertyId}`)}
//                 tp={tp}
//                 index={index}
//                 navigation={navigation}
//                 formatPrice={formatTourPrice}
//                 getPropertyStatusColor={propertyVisitStatusColor}
//                 onAddOffer={handleAddOffer}
//                 existingOffer={
//                   offers.find(
//                     (o) =>
//                       o.masterPropertyId === tp.masterPropertyId &&
//                       o.property?.id != null,
//                   ) ?? null
//                 }
//                 onViewOffer={handleViewOffer}
//                 clientId={clientId}
//                 isAgent={isAgent}
//               />
//             ))
//           ) : (
//             <Text style={styles.emptyText}>
//               {propertiesLoading ? "Loading…" : "No properties in this tour"}
//             </Text>
//           )}
//         </CardContent>
//       </Card>

//       {tour.notes && (
//         <Card style={styles.section}>
//           <CardHeader>
//             <CardTitle>Notes</CardTitle>
//           </CardHeader>
//           <CardContent>
//             <Text style={styles.notes}>{tour.notes}</Text>
//           </CardContent>
//         </Card>
//       )}
//     </ScrollView>
//   );
// }

// // ─── TourDetailsScreen ────────────────────────────────────────────────────────

// export function TourDetailsScreen() {
//   const route = useRoute<any>();
//   const navigation = useNavigation<any>();
//   const { tourId, clientProfileId } = route.params;
//   const { user } = useAuth();
//   const userRole = user?.role === "agent" ? "agent" : "client";
//   const isAgent = userRole === "agent";

//   const { data: tour, isLoading: tourLoading } = useQuery<Record<string, any>>({
//     queryKey: tourDetailQueryKey(userRole, tourId),
//     queryFn: async () => {
//       const u = isAgent ? agentTourUrl(tourId) : clientTourUrl(tourId);
//       return (await api.get(u)).data;
//     },
//     enabled: !!tourId,
//   });

//   const { data: properties, isLoading: propertiesLoading } = useQuery<
//     TourPropertyStop[]
//   >({
//     queryKey: tourPropertiesQueryKey(userRole, tourId),
//     queryFn: async () => {
//       const u = isAgent
//         ? agentTourPropertiesUrl(tourId)
//         : clientTourPropertiesUrl(tourId);
//       return (await api.get(u)).data;
//     },
//     enabled: !!tourId,
//   });

//   const { data: offersPage } = useQuery({
//     queryKey: agentOffersQueryKey({ page: 0, size: 100 }),
//     queryFn: () => fetchAgentOffersPage({ page: 0, size: 100 }),
//     enabled: isAgent,
//   });
//   const offers = offersPage?.content ?? [];

//   const isLoading = tourLoading;
//   const stops: TourPropertyStop[] = Array.isArray(properties) ? properties : [];

//   const clientId: string | null = clientProfileId ?? null;

//   const startTourMutation = useMutation({
//     mutationFn: () =>
//       apiRequest("PATCH", agentTourUrl(tourId as string), {
//         status: "in_progress",
//         startTime: new Date().toISOString(),
//       }),
//     onSuccess: () => {
//       if (!tourId) return;
//       invalidateSingleTourQueries("agent", tourId);
//       if (stops.length > 0) {
//         void openMapsNavigationForTour(stops, tourId, isAgent);
//       }
//     },
//   });

//   const endTourMutation = useMutation({
//     mutationFn: async () => {
//       const coords = await getTourForegroundCoordinatesWithTimeout(
//         END_TOUR_GEO_TIMEOUT_MS,
//       );
//       const body: Record<string, unknown> = {};
//       if (coords != null) {
//         body.endLatitude = coords.latitude;
//         body.endLongitude = coords.longitude;
//       }
//       return apiRequest("PATCH", agentCompleteTourUrl(tourId as string), body);
//     },
//     onSuccess: () => {
//       if (tourId) invalidateSingleTourQueries("agent", tourId);
//     },
//     onError: (err: unknown) => {
//       Alert.alert(
//         "Could not end tour",
//         formatApiErrorMessage(err, "Check your connection and try again."),
//       );
//     },
//   });

//   if (tourId == null) {
//     return (
//       <View style={styles.errorContainer}>
//         <Text style={styles.errorText}>Missing tour</Text>
//       </View>
//     );
//   }

//   if (isLoading) {
//     return (
//       <View style={styles.loadingContainer}>
//         <Text>Loading...</Text>
//       </View>
//     );
//   }

//   if (!tour?.id) {
//     return (
//       <View style={styles.errorContainer}>
//         <Text style={styles.errorText}>Tour not found</Text>
//       </View>
//     );
//   }

//   return (
//     <>
//       <TourDetailsLoadedContent
//         tour={tour}
//         stops={stops}
//         propertiesLoading={propertiesLoading}
//         navigation={navigation}
//         tourId={tourId}
//         isAgent={isAgent}
//         clientId={clientId}
//         offers={offers}
//         startTourMutation={startTourMutation}
//         endTourMutation={endTourMutation}
//         onOpenNavigation={() =>
//           void openMapsNavigationForTour(stops, tourId, isAgent)
//         }
//       />

//       {userRole == "agent" ? (
//         <AgentFooter active="tours" />
//       ) : (
//         <ClientFooter active="mytours" />
//       )}
//     </>
//   );
// }

// // ─── Styles ───────────────────────────────────────────────────────────────────

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: "#f8fafc",
//   },
//   loadingContainer: {
//     flex: 1,
//     justifyContent: "center",
//     alignItems: "center",
//   },
//   errorContainer: {
//     flex: 1,
//     justifyContent: "center",
//     alignItems: "center",
//   },
//   errorText: {
//     fontSize: 16,
//     color: "#64748b",
//   },

//   // ─── Price row + cloud upload icon ───────────────────────────────────────
//   priceRow: {
//     flexDirection: "row",
//     alignItems: "center",
//     justifyContent: "space-between",
//     marginBottom: 4,
//   },
//   uploadIconBtn: {
//     padding: 4,
//     borderRadius: 8,
//     backgroundColor: "#eff6ff",
//   },

//   propertyLoading: {
//     padding: 16,
//     alignItems: "center",
//   },
//   header: {
//     backgroundColor: "#ffffff",
//     padding: 20,
//     borderBottomWidth: 1,
//     borderBottomColor: "#e2e8f0",
//   },
//   headerInfo: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//     alignItems: "center",
//   },
//   tourId: {
//     fontSize: 20,
//     fontWeight: "700",
//     color: "#1e293b",
//   },
//   statusBadge: {
//     paddingHorizontal: 12,
//     paddingVertical: 6,
//     borderRadius: 16,
//   },
//   statusText: {
//     fontSize: 12,
//     fontWeight: "600",
//     textTransform: "capitalize",
//   },
//   date: {
//     fontSize: 16,
//     color: "#475569",
//     marginTop: 8,
//   },
//   time: {
//     fontSize: 14,
//     color: "#64748b",
//     marginTop: 2,
//   },
//   statsRow: {
//     flexDirection: "row",
//     padding: 16,
//     gap: 12,
//   },
//   statCard: {
//     flex: 1,
//   },
//   statContent: {
//     alignItems: "center",
//     paddingVertical: 12,
//   },
//   statValue: {
//     fontSize: 20,
//     fontWeight: "700",
//     color: "#1e40af",
//   },
//   statLabel: {
//     fontSize: 12,
//     color: "#64748b",
//     marginTop: 2,
//   },
//   startButton: {
//     marginHorizontal: 16,
//     marginBottom: 8,
//   },
//   addPropertyButton: {
//     marginHorizontal: 16,
//     marginBottom: 16,
//   },
//   endTourButton: {
//     marginHorizontal: 16,
//     marginBottom: 8,
//     borderColor: "#ef4444",
//   },
//   section: {
//     marginHorizontal: 16,
//     marginBottom: 16,
//   },
//   propertiesContent: {
//     padding: 12,
//     gap: 12,
//   },
//   propertyCard: {
//     backgroundColor: "#ffffff",
//     borderRadius: 12,
//     overflow: "hidden",
//     borderWidth: 1,
//     borderColor: "#e2e8f0",
//     shadowColor: "#000",
//     shadowOffset: { width: 0, height: 1 },
//     shadowOpacity: 0.06,
//     shadowRadius: 3,
//     elevation: 2,
//   },
//   photoContainer: {
//     position: "relative",
//   },
//   stopBadge: {
//     position: "absolute",
//     top: 10,
//     left: 10,
//     width: 30,
//     height: 30,
//     borderRadius: 15,
//     backgroundColor: "#1e40af",
//     justifyContent: "center",
//     alignItems: "center",
//     shadowColor: "#000",
//     shadowOffset: { width: 0, height: 1 },
//     shadowOpacity: 0.3,
//     shadowRadius: 2,
//     elevation: 3,
//   },
//   stopBadgeText: {
//     color: "#ffffff",
//     fontSize: 13,
//     fontWeight: "700",
//   },
//   visitStatusBadge: {
//     position: "absolute",
//     top: 10,
//     right: 10,
//     paddingHorizontal: 8,
//     paddingVertical: 4,
//     borderRadius: 8,
//   },
//   visitStatusText: {
//     color: "#ffffff",
//     fontSize: 11,
//     fontWeight: "600",
//     textTransform: "capitalize",
//   },
//   propertyDetails: {
//     padding: 12,
//   },
//   propertyPrice: {
//     fontSize: 20,
//     fontWeight: "700",
//     color: "#1e40af",
//   },
//   propertyAddress: {
//     fontSize: 14,
//     fontWeight: "600",
//     color: "#1e293b",
//   },
//   propertyCity: {
//     fontSize: 13,
//     color: "#64748b",
//     marginTop: 2,
//   },
//   specsRow: {
//     flexDirection: "row",
//     flexWrap: "wrap",
//     gap: 12,
//     marginTop: 10,
//   },
//   specItem: {
//     flexDirection: "row",
//     alignItems: "center",
//     gap: 4,
//   },
//   specIcon: {
//     fontSize: 13,
//   },
//   specText: {
//     fontSize: 13,
//     color: "#475569",
//     fontWeight: "500",
//   },
//   metaRow: {
//     flexDirection: "row",
//     flexWrap: "wrap",
//     alignItems: "center",
//     gap: 8,
//     marginTop: 8,
//   },
//   typeTag: {
//     backgroundColor: "#f1f5f9",
//     paddingHorizontal: 8,
//     paddingVertical: 3,
//     borderRadius: 6,
//   },
//   typeTagText: {
//     fontSize: 11,
//     color: "#475569",
//     fontWeight: "600",
//     textTransform: "capitalize",
//   },
//   metaText: {
//     fontSize: 11,
//     color: "#94a3b8",
//   },
//   emptyText: {
//     textAlign: "center",
//     color: "#94a3b8",
//     paddingVertical: 16,
//   },
//   notes: {
//     fontSize: 14,
//     color: "#475569",
//     lineHeight: 22,
//   },
//   // ─── Property actions row (offer button + share toggle) ───────────────────
//   propertyActionsRow: {
//     flexDirection: "row",
//     alignItems: "center",
//     justifyContent: "space-between",
//     marginTop: 12,
//   },
//   leftActionsGroup: {
//     flexDirection: "row",
//     alignItems: "center",
//     gap: 8,
//     flexShrink: 1,
//     flexWrap: "wrap",
//   },
//   addOfferButton: {
//     backgroundColor: "#1e40af",
//     paddingVertical: 8,
//     paddingHorizontal: 14,
//     borderRadius: 8,
//     alignSelf: "flex-start",
//   },
//   viewOfferButton: {
//     backgroundColor: "#1e40af",
//   },
//   addOfferButtonText: {
//     color: "#ffffff",
//     fontSize: 13,
//     fontWeight: "600",
//   },
//   // ─── Share media toggle ───────────────────────────────────────────────────
//   shareMediaContainer: {
//     flexDirection: "row",
//     alignItems: "center",
//     gap: 6,
//   },
//   shareMediaLabel: {
//     fontSize: 12,
//     fontWeight: "500",
//     color: "#475569",
//   },
//   shareMediaSpinner: {
//     marginHorizontal: 8,
//   },
// });
