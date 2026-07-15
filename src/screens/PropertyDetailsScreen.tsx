import { useState, type ReactNode } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Linking,
  TouchableOpacity,
} from "react-native";
import { useRoute } from "@react-navigation/native";
import { useTourCart } from "../contexts/TourCartContext";
import { Card, CardContent, CardHeader, CardTitle } from "../components/Card";
import { Button } from "../components/Button";
import {
  PropertyPhotoCarousel,
  PropertyPhoto,
} from "../components/PropertyPhotoCarousel";
import { usePropertyDetail, type PropertyRoom } from "../lib/propertyApi";
import { NormalButton } from "@/components/common/ST_Buttons";
import { FullScreenImageModal } from "./agent/BrowseProperty/components/FullScreenImageModal";
import {
  useClientShortlists,
  useSaveClientShortlist,
  useRemoveClientShortlist,
  useClientRatingsSummary,
  type ClientRating,
  type RatingFeedback,
} from "../lib/clientApi";
import { ClientFooter } from "./client/components/ClientFooter";
import { AgentFooter } from "./agent/components/AgentFooter";
import { useAuth } from "@/contexts/AuthContext";
import {
  Bath,
  BedDouble,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronUp,
  Building2,
  Car,
  ChefHat,
  Database,
  Heart,
  Home,
  Lamp,
  Settings2,
  MapPin,
  MapPinned,
  PlayCircle,
  Ruler,
  ShoppingCart,
  Sofa,
  Tag,
  Sparkles,
  WashingMachine,
} from "lucide-react-native";

// ─── Constants ────────────────────────────────────────────────────────────────
// const { user } = useAuth();

const DECISION_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; icon: string }
> = {
  offer_now: {
    label: "Ready to Offer",
    color: "#15803d",
    bg: "#dcfce7",
    icon: "🏡",
  },
  hold_later: {
    label: "Considering",
    color: "#b45309",
    bg: "#fef3c7",
    icon: "⏳",
  },
  reject: {
    label: "Not Interested",
    color: "#b91c1c",
    bg: "#fee2e2",
    icon: "✕",
  },
};

const CHECKLIST_LABELS: Record<string, string> = {
  budgetWithinRange: "Budget",
  preferredArea: "Area",
  minimumBedroomsMet: "Bedrooms",
  requiredBathroomsMet: "Bathrooms",
  school: "School",
  basement: "Basement",
  lot_size: "Lot Size",
  interior_size: "Interior Size",
  parkingRequirementMet: "Parking",
  backyardRequirementMet: "Backyard",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function StarRating({ rating }: { rating: number }) {
  return (
    <View style={styles.starsRow}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Text
          key={s}
          style={s <= rating ? styles.starFilled : styles.starEmpty}
        >
          ★
        </Text>
      ))}
      <Text style={styles.ratingNumber}>{rating}/5</Text>
    </View>
  );
}

function ChecklistRow({ label, met }: { label: string; met: boolean }) {
  return (
    <View style={styles.checklistRow}>
      <Text style={met ? styles.checklistIconMet : styles.checklistIconFail}>
        {met ? "✓" : "✗"}
      </Text>
      <Text style={[styles.checklistLabel, !met && styles.checklistLabelFail]}>
        {label}
      </Text>
    </View>
  );
}

function RejectionReasons({ reasons }: { reasons: string[] }) {
  if (!reasons || reasons.length === 0) return null;
  return (
    <View style={styles.rejectionWrap}>
      <Text style={styles.sectionMicroLabel}>Concerns raised</Text>
      <View style={styles.rejectionPills}>
        {reasons.map((r, i) => (
          <View key={i} style={styles.rejectionPill}>
            <Text style={styles.rejectionPillText}>{r}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function MyReviewCard({ rating }: { rating: ClientRating }) {
  const decision = DECISION_CONFIG[rating.feedbackCategory];
  const feedback: RatingFeedback = rating.feedback ?? {};

  const checklistItems: { label: string; met: boolean }[] = [];
  const allChecks = {
    ...(feedback.checklist?.mustHave ?? {}),
    ...(feedback.checklist?.importantPreferences ?? {}),
  };
  Object.entries(allChecks).forEach(([key, met]) => {
    if (typeof met === "boolean") {
      checklistItems.push({ label: CHECKLIST_LABELS[key] ?? key, met });
    }
  });

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  const metCount = checklistItems.filter((c) => c.met).length;
  const failCount = checklistItems.filter((c) => !c.met).length;

  return (
    <View style={styles.myReviewCard}>
      {/* ── Top row: decision badge + date ── */}
      <View style={styles.myReviewTopRow}>
        {decision && (
          <View
            style={[styles.decisionBadge, { backgroundColor: decision.bg }]}
          >
            <Text style={styles.decisionBadgeIcon}>{decision.icon}</Text>
            <Text style={[styles.decisionBadgeText, { color: decision.color }]}>
              {decision.label}
            </Text>
          </View>
        )}
        <Text style={styles.reviewDate}>
          Reviewed {formatDate(rating.createdAt)}
        </Text>
      </View>

      {/* ── Star rating ── */}
      <StarRating rating={rating.rating} />

      {/* ── Liked / Disliked ── */}
      {(feedback.liked || feedback.disliked) && (
        <View style={styles.likedDislikedRow}>
          {feedback.liked ? (
            <View style={styles.likedBox}>
              <Text style={styles.likedLabel}>👍 Liked</Text>
              <Text style={styles.likedText}>{feedback.liked}</Text>
            </View>
          ) : null}
          {feedback.disliked ? (
            <View style={styles.dislikedBox}>
              <Text style={styles.dislikedLabel}>👎 Didn't like</Text>
              <Text style={styles.dislikedText}>{feedback.disliked}</Text>
            </View>
          ) : null}
        </View>
      )}

      {/* ── Reason / notes ── */}
      {rating.reason ? (
        <Text style={styles.ratingReason}>"{rating.reason}"</Text>
      ) : null}
      {rating.notes ? (
        <Text style={styles.ratingNotes}>{rating.notes}</Text>
      ) : null}

      {/* ── Requirements checklist ── */}
      {checklistItems.length > 0 && (
        <View style={styles.checklistWrap}>
          <View style={styles.checklistHeader}>
            <Text style={styles.sectionMicroLabel}>Requirements checklist</Text>
            <View style={styles.checklistScore}>
              <Text style={styles.checklistScoreMet}>{metCount} met</Text>
              {failCount > 0 && (
                <Text style={styles.checklistScoreFail}>
                  {" "}
                  · {failCount} missed
                </Text>
              )}
            </View>
          </View>
          <View style={styles.checklistGrid}>
            {checklistItems.map((item, i) => (
              <ChecklistRow key={i} label={item.label} met={item.met} />
            ))}
          </View>
        </View>
      )}

      {/* ── Rejection reasons ── */}
      <RejectionReasons reasons={feedback.rejectionReasons ?? []} />
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

type DetailValue = string | number | boolean | string[] | null | undefined;
type DetailRow = { label: string; value: DetailValue };

function formatDetailValue(value: DetailValue): string | null {
  if (value === null || value === undefined) return null;
  if (Array.isArray(value)) {
    const values = value.filter(Boolean);
    return values.length > 0 ? values.join(", ") : null;
  }
  if (typeof value === "boolean") return value ? "Yes" : "No";
  const text = String(value).trim();
  return text ? text : null;
}

function formatDateLabel(value: string | null | undefined): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function DetailRows({ rows }: { rows: DetailRow[] }) {
  const visibleRows = rows
    .map((row) => ({ ...row, formattedValue: formatDetailValue(row.value) }))
    .filter((row) => row.formattedValue);

  if (visibleRows.length === 0) return null;

  return (
    <View>
      {visibleRows.map((row, index) => (
        <View
          key={`${row.label}-${index}`}
          style={[
            styles.infoRow,
            index === visibleRows.length - 1 && styles.infoRowLast,
          ]}
        >
          <Text style={styles.infoLabel}>{row.label}</Text>
          <Text style={styles.infoValue}>{row.formattedValue}</Text>
        </View>
      ))}
    </View>
  );
}

function FeatureChips({ features }: { features?: string[] | null }) {
  const visibleFeatures = (features ?? []).filter(Boolean);
  if (visibleFeatures.length === 0) return null;

  return (
    <View style={styles.featureChipList}>
      {visibleFeatures.map((feature, index) => (
        <View key={`${feature}-${index}`} style={styles.featureChip}>
          <Text style={styles.featureChipText}>{feature}</Text>
        </View>
      ))}
    </View>
  );
}

function groupRoomsByLevel(rooms?: PropertyRoom[] | null) {
  const groups = new Map<string, PropertyRoom[]>();
  for (const room of rooms ?? []) {
    const level = room.level?.trim() || "Other";
    groups.set(level, [...(groups.get(level) ?? []), room]);
  }
  return Array.from(groups.entries()).map(([level, levelRooms]) => ({
    level,
    rooms: levelRooms,
  }));
}

function formatRoomDimensions(dimensions?: string | null) {
  const text = dimensions?.trim();
  if (!text) return null;

  const unitMatch = text.match(/\b(m|metres|meters|ft|feet|foot)\b/i);
  const numbers = text.match(/\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  if (!unitMatch || numbers.length < 2) {
    return { primary: text, converted: null };
  }

  const unit = unitMatch[1].toLowerCase();
  const isMetric = unit === "m" || unit === "metres" || unit === "meters";
  const factor = isMetric ? 3.28084 : 0.3048;
  const convertedUnit = isMetric ? "ft" : "m";
  const convertedValues = numbers
    .slice(0, 2)
    .map((value) => (value * factor).toFixed(1));

  return {
    primary: text,
    converted: `${convertedValues.join(" x ")} ${convertedUnit}`,
  };
}

function getRoomIcon(roomName?: string | null) {
  const name = roomName?.toLowerCase() ?? "";
  if (name.includes("bedroom")) return <BedDouble size={15} color="#1d4ed8" />;
  if (name.includes("bath")) return <Bath size={15} color="#1d4ed8" />;
  if (name.includes("kitchen")) return <ChefHat size={15} color="#1d4ed8" />;
  if (name.includes("living") || name.includes("recreation") || name.includes("family")) {
    return <Sofa size={15} color="#1d4ed8" />;
  }
  if (name.includes("laundry") || name.includes("utility")) {
    return <WashingMachine size={15} color="#1d4ed8" />;
  }
  if (name.includes("dining")) return <Lamp size={15} color="#1d4ed8" />;
  return <Home size={15} color="#1d4ed8" />;
}

function HeroStat({
  icon,
  value,
  label,
}: {
  icon: ReactNode;
  value: string | number | null | undefined;
  label: string;
}) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <View style={styles.heroStat}>
      <View style={styles.heroStatIcon}>{icon}</View>
      <Text style={styles.heroStatValue}>{value}</Text>
      <Text style={styles.heroStatLabel}>{label}</Text>
    </View>
  );
}

function PropertyActionButton({
  label,
  icon,
  onPress,
  variant = "primary",
  disabled,
}: {
  label: string;
  icon: ReactNode;
  onPress: () => void;
  variant?: "primary" | "secondary" | "outline";
  disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.propertyActionButton,
        variant === "primary" && styles.propertyActionPrimary,
        variant === "secondary" && styles.propertyActionSecondary,
        variant === "outline" && styles.propertyActionOutline,
        disabled && styles.propertyActionDisabled,
      ]}
      onPress={onPress}
      activeOpacity={0.85}
      disabled={disabled}
    >
      {icon}
      <Text
        style={[
          styles.propertyActionText,
          variant === "primary" && styles.propertyActionTextPrimary,
          variant === "secondary" && styles.propertyActionTextSecondary,
          variant === "outline" && styles.propertyActionTextOutline,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function CollapsibleCard({
  title,
  subtitle,
  expanded,
  onToggle,
  children,
}: {
  title: string;
  subtitle?: string;
  expanded: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <Card style={styles.section}>
      <TouchableOpacity
        style={[
          styles.collapsibleHeader,
          !expanded && styles.collapsibleHeaderCollapsed,
        ]}
        onPress={onToggle}
        activeOpacity={0.75}
      >
        <View style={styles.collapsibleTitleWrap}>
          <CardTitle>{title}</CardTitle>
          {subtitle ? (
            <Text style={styles.collapsibleSubtitle}>{subtitle}</Text>
          ) : null}
        </View>
        <View style={styles.collapsibleIcon}>
          {expanded ? (
            <ChevronUp size={18} color="#1d4ed8" />
          ) : (
            <ChevronDown size={18} color="#64748b" />
          )}
        </View>
      </TouchableOpacity>
      {expanded ? <CardContent>{children}</CardContent> : null}
    </Card>
  );
}

export function PropertyDetailsScreen() {
  const route = useRoute<any>();
  const { propertyId: routePropertyId, userType } = route.params;
  const propertyId = Number(routePropertyId);
  const propertyIdKey = String(propertyId);

  const { user } = useAuth();
  const routeUserType = typeof userType === "string" ? userType.toLowerCase() : undefined;
  const authenticatedRole = user?.role;
  const isAgent = authenticatedRole === "agent" || (!authenticatedRole && routeUserType === "agent");
  const isClient = authenticatedRole === "client" || (!authenticatedRole && routeUserType === "client");

  // const isAgent = userType === "agent";

  const { addToCart, removeFromCart, isInCart } = useTourCart();

  // ── Fullscreen enlarge / swipe modal state ──
  const [fsModal, setFsModal] = useState<{
    photos: PropertyPhoto[];
    startIndex: number;
  } | null>(null);
  const [expandedSections, setExpandedSections] = useState({
    keyFacts: true,
    propertyDetails: true,
    rooms: true,
    description: false,
    features: false,
    review: false,
  });

  const { data: shortlists = [] } = useClientShortlists({ enabled: isClient });
  const saveShortlist = useSaveClientShortlist();
  const removeShortlist = useRemoveClientShortlist();

  const isSaved = shortlists.some((s) => s.masterPropertyId === propertyId);

  const handleSaveToggle = () => {
    if (!Number.isFinite(propertyId)) return;
    if (isSaved) {
      removeShortlist.mutate(propertyId);
    } else {
      saveShortlist.mutate({ masterPropertyId: propertyId });
    }
  };

  const { data: property, isLoading } = usePropertyDetail(propertyId);

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // Ratings summary — filter to this property only
  const { data: ratingsSummary } = useClientRatingsSummary({
    enabled: isClient,
  });
  const propertyRating: ClientRating | undefined = ratingsSummary?.ratings.find(
    (r) => r.masterPropertyId === Number(propertyId),
  );

  const inCart = isInCart(propertyIdKey);
  const roomGroups = groupRoomsByLevel(property?.rooms);
  const combinedPropertyFeatures = Array.from(
    new Set([
      ...(property?.details?.propertyFeatures ?? []),
      ...(property?.features ?? []),
    ]),
  );
  const carouselPhotos: PropertyPhoto[] = (property?.photos ?? []).map(
    (photo) => ({
      id: photo.id,
      url: photo.url,
      caption: photo.caption ?? null,
      displayOrder: photo.displayOrder ?? undefined,
      mediaCategory: photo.mediaCategory ?? undefined,
      isPreferred: photo.isPreferred ?? undefined,
    }),
  );
  const tourPhoto = (property?.photos ?? []).find(
    (p) => p.mediaCategory === "Video Tour Website",
  );

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(price);

  const handleCartToggle = () => {
    if (!property) return;
    if (inCart) {
      removeFromCart(propertyIdKey);
    } else {
      addToCart({
        id: String(property.id),
        address: property.address,
        price: property.price,
        bedrooms: property.bedrooms,
        bathrooms:
          property.bathrooms != null ? String(property.bathrooms) : null,
        squareFootage: property.squareFootage,
        imageUrl: property.imageUrl ?? undefined,
      });
    }
  };

  const handleViewOnMap = () => {
    if (!property?.address) return;
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(property.address)}`;
    Linking.openURL(url);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading...</Text>
      </View>
    );
  }

  if (!property) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Property not found</Text>
      </View>
    );
  }

  return (
    <>
    <ScrollView style={styles.container}>
      <PropertyPhotoCarousel
        photos={carouselPhotos}
        imageUrl={property.imageUrl}
        height={250}
        onEnlargePress={(photos, startIndex) => setFsModal({ photos, startIndex })}
      />

      <View style={styles.content}>
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroTitleBlock}>
              <View style={styles.heroBadgeRow}>
                <View style={styles.propertyTypePill}>
                  <Home size={13} color="#1d4ed8" />
                  <Text style={styles.propertyTypePillText}>
                    {property.keyFacts?.propertyType ??
                      property.details?.propertyType ??
                      property.propertyType ??
                      "Residential"}
                  </Text>
                </View>
                {property.keyFacts?.listedOn ? (
                  <View style={styles.listedPill}>
                    <CalendarDays size={13} color="#64748b" />
                    <Text style={styles.listedPillText}>
                      Listed {formatDateLabel(property.keyFacts.listedOn)}
                    </Text>
                  </View>
                ) : null}
              </View>

              <Text style={styles.heroPrice}>{formatPrice(property.price)}</Text>
              <View style={styles.locationRow}>
                <MapPin size={15} color="#64748b" />
                <Text style={styles.heroAddress}>
                  {property.address}
                  {property.city || property.province
                    ? `, ${[property.city, property.province].filter(Boolean).join(", ")}`
                    : ""}
                </Text>
              </View>
            </View>

            {isClient && (
              <TouchableOpacity
                style={[styles.saveButton, isSaved && styles.saveButtonActive]}
                onPress={handleSaveToggle}
                activeOpacity={0.75}
                disabled={saveShortlist.isPending || removeShortlist.isPending}
              >
                <Heart
                  size={25}
                  color={isSaved ? "#ffffff" : "#94a3b8"}
                  fill={isSaved ? "#ffffff" : "transparent"}
                />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.heroStatsGrid}>
            <HeroStat
              icon={<BedDouble size={19} color="#1d4ed8" />}
              value={property.bedrooms}
              label="Beds"
            />
            <HeroStat
              icon={<Bath size={19} color="#1d4ed8" />}
              value={property.bathrooms}
              label="Baths"
            />
            <HeroStat
              icon={<Ruler size={19} color="#1d4ed8" />}
              value={
                property.squareFootage
                  ? property.squareFootage.toLocaleString()
                  : property.keyFacts?.size
              }
              label={property.squareFootage ? "Sq Ft" : "Size"}
            />
          </View>

          <View style={styles.heroHighlights}>
            {property.keyFacts?.parking ? (
              <View style={styles.highlightPill}>
                <Text style={styles.highlightText}>{property.keyFacts.parking}</Text>
              </View>
            ) : null}
            {property.details?.basementType ? (
              <View style={styles.highlightPill}>
                <Text style={styles.highlightText}>
                  {property.details.basementType} basement
                </Text>
              </View>
            ) : null}
            {property.details?.fireplace ? (
              <View style={styles.highlightPill}>
                <Text style={styles.highlightText}>Fireplace</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.heroActions}>
            {isClient && (
              <PropertyActionButton
                label={inCart ? "In Tour Cart" : "Add to Tour Cart"}
                icon={
                  inCart ? (
                    <Check size={18} color="#ffffff" />
                  ) : (
                    <ShoppingCart size={18} color="#ffffff" />
                  )
                }
                variant={inCart ? "secondary" : "primary"}
                onPress={handleCartToggle}
              />
            )}
          </View>

          <View style={styles.secondaryActions}>
            <PropertyActionButton
              label="View Map"
              icon={<MapPinned size={17} color="#1d4ed8" />}
              onPress={handleViewOnMap}
              variant="outline"
            />
            {tourPhoto ? (
              <PropertyActionButton
                label="360 Tour"
                icon={<PlayCircle size={17} color="#1d4ed8" />}
                onPress={() => Linking.openURL(tourPhoto.url)}
                variant="outline"
              />
            ) : null}
          </View>
        </View>

        {/* Price + heart + 360 */}
        <View style={styles.priceRow}>
          <View>
            <Text style={styles.price}>{formatPrice(property.price)}</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            {(() => {
              const tourPhoto = (property.photos ?? []).find(
                (p) => p.mediaCategory === "Video Tour Website",
              );
              return tourPhoto ? (
                <NormalButton
                  label="View in 360°"
                  variant="primary"
                  size="sm"
                  fullWidth={false}
                  onPress={() => Linking.openURL(tourPhoto.url)}
                />
              ) : null;
            })()}
            {isClient && (
              <TouchableOpacity
                onPress={handleSaveToggle}
                activeOpacity={0.7}
                disabled={saveShortlist.isPending || removeShortlist.isPending}
              >
                <Text
                  style={[styles.heartIcon, isSaved && styles.heartIconSaved]}
                >
                  {isSaved ? "\u2665" : "\u2661"}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <Text style={styles.address}>{property.address}</Text>

        {/* Beds / Baths / Sq Ft */}
        <View style={styles.detailsRow}>
          <View style={styles.detailItem}>
            <Text style={styles.detailValue}>{property.bedrooms}</Text>
            <Text style={styles.detailLabel}>Beds</Text>
          </View>
          <View style={styles.detailDivider} />
          <View style={styles.detailItem}>
            <Text style={styles.detailValue}>{property.bathrooms}</Text>
            <Text style={styles.detailLabel}>Baths</Text>
          </View>
          {property.squareFootage && (
            <>
              <View style={styles.detailDivider} />
              <View style={styles.detailItem}>
                <Text style={styles.detailValue}>
                  {property.squareFootage.toLocaleString()}
                </Text>
                <Text style={styles.detailLabel}>Sq Ft</Text>
              </View>
            </>
          )}
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          {isClient && (
            <Button
              title={inCart ? "✓ In Cart" : "Add to Tour Cart"}
              onPress={handleCartToggle}
              variant={inCart ? "secondary" : "primary"}
              style={styles.actionButton}
            />
          )}
          <Button
            title="View on Map"
            onPress={handleViewOnMap}
            variant="outline"
            style={styles.actionButton}
          />
        </View>

        {/* Key Facts */}
        <CollapsibleCard
          title="Key Facts"
          subtitle="Price, listing, size, parking"
          expanded={expandedSections.keyFacts}
          onToggle={() => toggleSection("keyFacts")}
        >
            <View style={styles.factGrid}>
              <View style={styles.factCard}>
                <View style={styles.factIcon}>
                  <Home size={17} color="#1d4ed8" />
                </View>
                <Text style={styles.factValue}>
                  {property.keyFacts?.propertyType ?? property.propertyType ?? "Residential"}
                </Text>
                <Text style={styles.factLabel}>Property Type</Text>
              </View>
              <View style={styles.factCard}>
                <View style={styles.factIcon}>
                  <Ruler size={17} color="#1d4ed8" />
                </View>
                <Text style={styles.factValue}>
                  {property.keyFacts?.size ??
                    (property.squareFootage
                      ? `${property.squareFootage.toLocaleString()} sq ft`
                      : "Not listed")}
                </Text>
                <Text style={styles.factLabel}>Size</Text>
              </View>
              <View style={styles.factCard}>
                <View style={styles.factIcon}>
                  <Car size={17} color="#1d4ed8" />
                </View>
                <Text style={styles.factValue}>
                  {property.keyFacts?.parking ??
                    (property.details?.totalParkingSpace
                      ? `${property.details.totalParkingSpace} spaces`
                      : "Not listed")}
                </Text>
                <Text style={styles.factLabel}>Parking</Text>
              </View>
              <View style={styles.factCard}>
                <View style={styles.factIcon}>
                  <Building2 size={17} color="#1d4ed8" />
                </View>
                <Text style={styles.factValue}>
                  {property.keyFacts?.basement ??
                    property.details?.basementType ??
                    "Not listed"}
                </Text>
                <Text style={styles.factLabel}>Basement</Text>
              </View>
            </View>

          <View style={styles.keyFactInfoCard}>
            <View style={styles.keyFactInfoHeader}>
              <View style={styles.keyFactInfoIcon}>
                <Tag size={15} color="#1d4ed8" />
              </View>
              <View>
                <Text style={styles.keyFactInfoTitle}>Listing</Text>
                <Text style={styles.keyFactInfoSubtitle}>MLS and market dates</Text>
              </View>
            </View>
            <DetailRows
              rows={[
                { label: "Listing Number", value: property.keyFacts?.listingNumber ?? property.mlsNumber },
                { label: "Listed On", value: formatDateLabel(property.keyFacts?.listedOn) },
                { label: "Updated On", value: formatDateLabel(property.keyFacts?.updatedOn) },
                { label: "Status Change", value: formatDateLabel(property.keyFacts?.statusChange) },
                { label: "Days on Market", value: property.keyFacts?.daysOnMarket },
                { label: "Property Days on Market", value: property.keyFacts?.propertyDaysOnMarket },
              ]}
            />
          </View>

          <View style={styles.keyFactInfoCard}>
            <View style={styles.keyFactInfoHeader}>
              <View style={styles.keyFactInfoIcon}>
                <Database size={15} color="#1d4ed8" />
              </View>
              <View>
                <Text style={styles.keyFactInfoTitle}>Source & Fees</Text>
                <Text style={styles.keyFactInfoSubtitle}>Provider, taxes and brokerage</Text>
              </View>
            </View>
            <DetailRows
              rows={[
                { label: "Data Source", value: property.keyFacts?.dataSource },
                { label: "Building Age", value: property.keyFacts?.buildingAge },
                { label: "Lot Size", value: property.keyFacts?.lotSize },
                { label: "Annual Tax", value: property.keyFacts?.tax },
                { label: "Listing Brokerage", value: property.keyFacts?.listingBrokerage },
              ]}
            />
          </View>
        </CollapsibleCard>

        {/* Property Details */}
        <CollapsibleCard
          title="Property Details"
          subtitle="Overview, systems, lot and parking"
          expanded={expandedSections.propertyDetails}
          onToggle={() => toggleSection("propertyDetails")}
        >
          <View style={styles.detailGroupCard}>
            <View style={styles.detailGroupHeader}>
              <View style={styles.detailGroupIcon}>
                <Building2 size={16} color="#1d4ed8" />
              </View>
              <View>
                <Text style={styles.detailGroupTitle}>Overview</Text>
                <Text style={styles.detailGroupSubtitle}>Core property profile</Text>
              </View>
            </View>
            <DetailRows
              rows={[
                { label: "MLS Number", value: property.mlsNumber },
                { label: "Property Type", value: property.details?.propertyType ?? property.propertyType },
                { label: "Style", value: property.details?.style },
                { label: "Community", value: property.details?.community },
                { label: "Municipality", value: property.details?.municipality ?? property.city },
                { label: "Bedrooms", value: property.details?.bedrooms ?? property.bedrooms },
                { label: "Bathrooms", value: property.details?.bathrooms ?? property.bathrooms },
                { label: "Bathroom Details", value: property.details?.bathroomsDetail },
                { label: "Rooms", value: property.details?.rooms },
                { label: "Kitchens", value: property.details?.kitchens },
                { label: "Family Room", value: property.details?.familyRoom },
                { label: "Interior Size", value: property.details?.size },
                { label: "Year Built", value: property.yearBuilt },
                { label: "Fireplace", value: property.details?.fireplace },
              ]}
            />
          </View>

          <View style={styles.detailGroupCard}>
            <View style={styles.detailGroupHeader}>
              <View style={styles.detailGroupIcon}>
                <Settings2 size={16} color="#1d4ed8" />
              </View>
              <View>
                <Text style={styles.detailGroupTitle}>Systems</Text>
                <Text style={styles.detailGroupSubtitle}>Utilities and comfort</Text>
              </View>
            </View>
            <DetailRows
              rows={[
                { label: "Cooling", value: property.details?.cooling },
                { label: "Heating Type", value: property.details?.heatingType },
                { label: "Heating Fuel", value: property.details?.heatingFuel },
                { label: "Water", value: property.details?.water },
                { label: "Sewer", value: property.details?.sewer },
                { label: "Basement", value: property.details?.basementType },
              ]}
            />
          </View>

          <View style={styles.detailGroupCard}>
            <View style={styles.detailGroupHeader}>
              <View style={styles.detailGroupIcon}>
                <Car size={16} color="#1d4ed8" />
              </View>
              <View>
                <Text style={styles.detailGroupTitle}>Lot & Parking</Text>
                <Text style={styles.detailGroupSubtitle}>Garage, driveway and lot info</Text>
              </View>
            </View>
            <DetailRows
              rows={[
                { label: "Driveway", value: property.details?.driveway },
                { label: "Garage Type", value: property.details?.garageType },
                { label: "Garage", value: property.details?.garage },
                { label: "Parking Places", value: property.details?.parkingPlaces },
                { label: "Total Parking", value: property.details?.totalParkingSpace },
                { label: "Lot Size", value: property.details?.lotSize ?? property.lotSize },
                { label: "Lot Size Code", value: property.details?.lotSizeCode },
                { label: "Frontage", value: property.details?.frontage },
                { label: "Depth", value: property.details?.depth },
                { label: "Cross Street", value: property.details?.crossStreet },
                { label: "Fronting On", value: property.details?.frontingOn },
              ]}
            />

            <FeatureChips features={property.details?.construction} />
          </View>
        </CollapsibleCard>

        {/* Rooms */}
        {roomGroups.length > 0 && (
          <CollapsibleCard
            title="Rooms"
            subtitle={`${property.rooms?.length ?? 0} total rooms`}
            expanded={expandedSections.rooms}
            onToggle={() => toggleSection("rooms")}
          >
              <View style={styles.roomsList}>
                {roomGroups.map((group) => {
                  const measuredCount = group.rooms.filter(
                    (room) => !!room.dimensions?.trim(),
                  ).length;
                  return (
                    <View key={group.level} style={styles.roomLevelGroup}>
                      <View style={styles.roomLevelHeader}>
                        <View>
                          <Text style={styles.roomLevelTitle}>{group.level}</Text>
                          <Text style={styles.roomLevelSubtitle}>
                            {group.rooms.length} rooms
                            {measuredCount > 0 ? ` · ${measuredCount} measured` : ""}
                          </Text>
                        </View>
                      </View>
                      {group.rooms.map((room, index) => {
                        const dimensions = formatRoomDimensions(room.dimensions);
                        return (
                          <View
                            key={`${group.level}-${room.name}-${index}`}
                            style={styles.roomRow}
                          >
                            <View style={styles.roomIconBadge}>
                              {getRoomIcon(room.name)}
                            </View>
                            <View style={styles.roomNameWrap}>
                              <Text style={styles.roomName}>
                                {room.name || "Room"}
                              </Text>
                              {room.features?.length > 0 && (
                                <Text style={styles.roomFeatures}>
                                  {room.features.join(", ")}
                                </Text>
                              )}
                            </View>
                            {dimensions ? (
                              <View style={styles.roomDimensionsWrap}>
                                <Text style={styles.roomDimensions}>
                                  {dimensions.primary}
                                </Text>
                                {dimensions.converted ? (
                                  <Text style={styles.roomDimensionsConverted}>
                                    {dimensions.converted}
                                  </Text>
                                ) : null}
                              </View>
                            ) : (
                              <Text style={styles.roomDimensionsMissing}>
                                Not measured
                              </Text>
                            )}
                          </View>
                        );
                      })}
                    </View>
                  );
                })}
              </View>
          </CollapsibleCard>
        )}

        {/* Description */}
        {property.description && (
          <CollapsibleCard
            title="Description"
            subtitle="Full listing remarks"
            expanded={expandedSections.description}
            onToggle={() => toggleSection("description")}
          >
            <View style={styles.descriptionPanel}>
              <Text style={styles.description}>{property.description}</Text>
            </View>
          </CollapsibleCard>
        )}

        {/* Features */}
        {combinedPropertyFeatures.length > 0 && (
          <CollapsibleCard
            title="Features"
            subtitle={`${combinedPropertyFeatures.length} property highlights`}
            expanded={expandedSections.features}
            onToggle={() => toggleSection("features")}
          >
              <View style={styles.featuresPanel}>
                {combinedPropertyFeatures.map((feature: string, index: number) => (
                  <View key={index} style={styles.featureItem}>
                    <Text style={styles.featureBullet}>•</Text>
                    <View style={styles.featureIconBadge}>
                      <Sparkles size={13} color="#1d4ed8" />
                    </View>
                    <Text style={styles.featureText}>{feature}</Text>
                  </View>
                ))}
              </View>
          </CollapsibleCard>
        )}

        {/* ── My Review ── (clients only) */}
        {isClient && (
          <Card style={styles.section}>
            <CardHeader>
              <View style={styles.reviewHeaderRow}>
                <CardTitle>My Review</CardTitle>
                {propertyRating && (
                  <View style={styles.reviewHeaderStars}>
                    <Text style={styles.reviewHeaderStarFilled}>★</Text>
                    <Text style={styles.reviewHeaderRating}>
                      {propertyRating.rating}/5
                    </Text>
                  </View>
                )}
              </View>
            </CardHeader>
            <CardContent>
              {!propertyRating ? (
                <View style={styles.emptyReview}>
                  <Text style={styles.emptyReviewIcon}>📋</Text>
                  <Text style={styles.emptyReviewTitle}>No review yet</Text>
                  <Text style={styles.emptyReviewSubtitle}>
                    You haven't reviewed this property after a tour.
                  </Text>
                </View>
              ) : (
                <MyReviewCard rating={propertyRating} />
              )}
            </CardContent>
          </Card>
        )}
      </View>
    </ScrollView>
    {isAgent ? <AgentFooter /> : isClient ? <ClientFooter /> : null}

    <FullScreenImageModal
      visible={fsModal !== null}
      photos={fsModal?.photos ?? []}
      startIndex={fsModal?.startIndex ?? 0}
      onClose={() => setFsModal(null)}
    />
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#eef3f8" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  errorContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  errorText: { fontSize: 16, color: "#64748b" },
  content: { padding: 16, paddingTop: 0, paddingBottom: 100 },

  heroCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#dbe7f3",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 8,
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  heroTitleBlock: {
    flex: 1,
  },
  heroBadgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 10,
  },
  propertyTypePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  propertyTypePillText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#1d4ed8",
  },
  listedPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  listedPillText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748b",
  },
  heroPrice: {
    fontSize: 30,
    fontWeight: "900",
    color: "#1d4ed8",
    lineHeight: 36,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    marginTop: 5,
  },
  heroAddress: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: "#64748b",
    lineHeight: 20,
  },
  saveButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#dbe7f3",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  saveButtonActive: {
    backgroundColor: "#ef4444",
    borderColor: "#ef4444",
  },
  heroStatsGrid: {
    flexDirection: "row",
    gap: 8,
    marginTop: 16,
  },
  heroStat: {
    flex: 1,
    minHeight: 82,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  heroStatIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#eff6ff",
    marginBottom: 5,
  },
  heroStatValue: {
    fontSize: 18,
    fontWeight: "900",
    color: "#1e293b",
  },
  heroStatLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748b",
    marginTop: 2,
    textTransform: "uppercase",
  },
  heroHighlights: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  highlightPill: {
    backgroundColor: "#ecfdf5",
    borderWidth: 1,
    borderColor: "#bbf7d0",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  highlightText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#047857",
  },
  heroActions: {
    flexDirection: "row",
    marginTop: 14,
  },
  secondaryActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },
  propertyActionButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingHorizontal: 12,
  },
  propertyActionPrimary: {
    backgroundColor: "#2448c7",
    shadowColor: "#2448c7",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 4,
  },
  propertyActionSecondary: {
    backgroundColor: "#0f766e",
    shadowColor: "#0f766e",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 4,
  },
  propertyActionOutline: {
    minHeight: 42,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#c7d2fe",
  },
  propertyActionDisabled: {
    opacity: 0.6,
  },
  propertyActionText: {
    fontSize: 13,
    fontWeight: "800",
  },
  propertyActionTextPrimary: {
    color: "#ffffff",
  },
  propertyActionTextSecondary: {
    color: "#ffffff",
  },
  propertyActionTextOutline: {
    color: "#1d4ed8",
  },

  priceRow: {
    display: "none",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  price: { fontSize: 28, fontWeight: "700", color: "#1e40af" },
  address: { display: "none", fontSize: 16, color: "#64748b", marginTop: 4, lineHeight: 22 },
  heartIcon: { fontSize: 50, color: "#cbd5e1", lineHeight: 30 },
  heartIconSaved: { color: "#ef4444" },

  detailsRow: {
    display: "none",
    flexDirection: "row",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  detailItem: { alignItems: "center", paddingHorizontal: 20 },
  detailValue: { fontSize: 22, fontWeight: "700", color: "#1e293b" },
  detailLabel: { fontSize: 12, color: "#64748b", marginTop: 2 },
  detailDivider: { width: 1, backgroundColor: "#e2e8f0" },

  actions: { display: "none", flexDirection: "row", gap: 12, marginTop: 16 },
  actionButton: { flex: 1 },
  section: { marginTop: 16 },
  collapsibleHeader: {
    minHeight: 62,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  collapsibleHeaderCollapsed: {
    borderBottomWidth: 0,
  },
  collapsibleTitleWrap: {
    flex: 1,
  },
  collapsibleSubtitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748b",
    marginTop: 3,
  },
  collapsibleIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },

  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#e8eef6",
    gap: 12,
  },
  infoRowLast: {
    borderBottomWidth: 0,
  },
  infoLabel: { flex: 1, fontSize: 14, color: "#64748b" },
  infoValue: {
    flex: 1.25,
    fontSize: 14,
    fontWeight: "700",
    color: "#1e293b",
    textAlign: "right",
  },
  factGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 12,
  },
  factCard: {
    width: "48%",
    minHeight: 112,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#dbe7f3",
    borderRadius: 12,
    padding: 12,
    justifyContent: "space-between",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  factIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
    marginBottom: 9,
  },
  factValue: {
    fontSize: 15,
    fontWeight: "900",
    color: "#1e293b",
    lineHeight: 19,
  },
  factLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748b",
    textTransform: "uppercase",
    marginTop: 8,
  },
  keyFactInfoCard: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 4,
    marginTop: 12,
  },
  keyFactInfoHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#e8eef6",
  },
  keyFactInfoIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  keyFactInfoTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: "#1e293b",
  },
  keyFactInfoSubtitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748b",
    marginTop: 2,
  },
  detailGroupCard: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 4,
    marginBottom: 12,
  },
  detailGroupHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingBottom: 10,
    marginBottom: 2,
    borderBottomWidth: 1,
    borderBottomColor: "#e8eef6",
  },
  detailGroupIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  detailGroupTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: "#1e293b",
    textTransform: "uppercase",
  },
  detailGroupSubtitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748b",
    marginTop: 2,
  },
  descriptionPanel: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    padding: 12,
  },
  description: { fontSize: 14, color: "#475569", lineHeight: 22 },

  featuresList: { gap: 8 },
  featuresPanel: {
    gap: 9,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    paddingHorizontal: 11,
    paddingVertical: 10,
  },
  featureIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  featureBullet: { display: "none", fontSize: 14, color: "#1e40af", marginRight: 8 },
  featureText: { fontSize: 14, fontWeight: "700", color: "#334155", flex: 1 },
  featureChipList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  featureChip: {
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  featureChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1e40af",
  },
  roomsHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  roomsCountPill: {
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  roomsCountText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#1d4ed8",
  },
  roomsList: {
    gap: 16,
  },
  roomLevelGroup: {
    gap: 9,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    padding: 10,
  },
  roomLevelHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  roomLevelTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: "#1e293b",
    textTransform: "uppercase",
  },
  roomLevelSubtitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748b",
    marginTop: 2,
  },
  roomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    minHeight: 58,
    paddingVertical: 10,
    paddingHorizontal: 11,
    backgroundColor: "#ffffff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e5edf6",
  },
  roomIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  roomNameWrap: {
    flex: 1,
  },
  roomName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#334155",
  },
  roomFeatures: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,
  },
  roomDimensionsWrap: {
    alignItems: "flex-end",
    maxWidth: "44%",
  },
  roomDimensions: {
    fontSize: 13,
    fontWeight: "800",
    color: "#334155",
    textAlign: "right",
  },
  roomDimensionsConverted: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748b",
    marginTop: 2,
    textAlign: "right",
  },
  roomDimensionsMissing: {
    maxWidth: "35%",
    fontSize: 12,
    fontWeight: "700",
    color: "#94a3b8",
    textAlign: "right",
  },

  // ── Review card header ────────────────────────────────────────────────────
  reviewHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  reviewHeaderStars: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#fef9c3",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  reviewHeaderStarFilled: { fontSize: 13, color: "#f59e0b" },
  reviewHeaderRating: { fontSize: 13, fontWeight: "700", color: "#854d0e" },

  // ── Empty state ───────────────────────────────────────────────────────────
  emptyReview: { alignItems: "center", paddingVertical: 28 },
  emptyReviewIcon: { fontSize: 32, marginBottom: 10 },
  emptyReviewTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#475569",
    marginBottom: 4,
  },
  emptyReviewSubtitle: { fontSize: 13, color: "#94a3b8", textAlign: "center" },

  // ── My review card ────────────────────────────────────────────────────────
  myReviewCard: { gap: 12 },

  myReviewTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  reviewDate: { fontSize: 12, color: "#94a3b8" },

  decisionBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  decisionBadgeIcon: { fontSize: 13 },
  decisionBadgeText: { fontSize: 12, fontWeight: "700" },

  starsRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  starFilled: { fontSize: 18, color: "#f59e0b" },
  starEmpty: { fontSize: 18, color: "#e2e8f0" },
  ratingNumber: { fontSize: 13, color: "#94a3b8", marginLeft: 5 },

  likedDislikedRow: { flexDirection: "row", gap: 8 },
  likedBox: {
    flex: 1,
    backgroundColor: "#f0fdf4",
    borderRadius: 8,
    padding: 10,
    borderLeftWidth: 3,
    borderLeftColor: "#22c55e",
  },
  dislikedBox: {
    flex: 1,
    backgroundColor: "#fff7ed",
    borderRadius: 8,
    padding: 10,
    borderLeftWidth: 3,
    borderLeftColor: "#f97316",
  },
  likedLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#15803d",
    marginBottom: 3,
  },
  dislikedLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#c2410c",
    marginBottom: 3,
  },
  likedText: { fontSize: 13, color: "#166534", lineHeight: 18 },
  dislikedText: { fontSize: 13, color: "#9a3412", lineHeight: 18 },

  ratingReason: {
    fontSize: 14,
    color: "#475569",
    fontStyle: "italic",
    lineHeight: 20,
    paddingLeft: 8,
    borderLeftWidth: 2,
    borderLeftColor: "#cbd5e1",
  },
  ratingNotes: { fontSize: 13, color: "#64748b", lineHeight: 19 },

  // ── Checklist ─────────────────────────────────────────────────────────────
  checklistWrap: { gap: 8 },
  checklistHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  checklistScore: { flexDirection: "row" },
  checklistScoreMet: { fontSize: 12, fontWeight: "600", color: "#16a34a" },
  checklistScoreFail: { fontSize: 12, fontWeight: "600", color: "#dc2626" },
  checklistGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  checklistRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    minWidth: "45%",
  },
  checklistIconMet: { fontSize: 13, color: "#16a34a", fontWeight: "700" },
  checklistIconFail: { fontSize: 13, color: "#dc2626", fontWeight: "700" },
  checklistLabel: { fontSize: 12, color: "#475569" },
  checklistLabelFail: { color: "#dc2626" },

  // ── Shared micro label ────────────────────────────────────────────────────
  sectionMicroLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },

  // ── Rejection pills ───────────────────────────────────────────────────────
  rejectionWrap: { gap: 6 },
  rejectionPills: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  rejectionPill: {
    backgroundColor: "#fee2e2",
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 8,
  },
  rejectionPillText: { fontSize: 11, color: "#b91c1c", fontWeight: "500" },
});
