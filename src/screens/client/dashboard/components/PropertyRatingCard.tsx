import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import {
  useClientRatings,
} from "@/lib/clientApi";
import { PropertyVisitFeedbackForm } from "./PropertyVisitFeedbackForm";
import { usePropertyDetail } from "@/lib/propertyApi";
import type { ClientRating } from "@/lib/clientApi";
import { colors } from "@/theme/colors";
import { spacing } from "@/theme/spacing";
import { border } from "@/theme/border";
import { shadows } from "@/theme/shadows";
import { PropertyPhotoCarousel } from "../../../../components/PropertyPhotoCarousel";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPrice(price: unknown): string {
  if (!price) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number(price));
}

function categoryLabel(cat: ClientRating["feedbackCategory"]): string {
  switch (cat) {
    case "offer_now":
      return "Offer Now";
    case "hold_later":
      return "Keep for Later";
    case "reject":
      return "Rejected";
    default:
      return cat;
  }
}

function categoryColor(cat: ClientRating["feedbackCategory"]): string {
  switch (cat) {
    case "offer_now":
      return colors.success.default;
    case "hold_later":
      return colors.warning.default;
    case "reject":
      return colors.error.default;
    default:
      return colors.text.muted;
  }
}

function categoryBgColor(cat: ClientRating["feedbackCategory"]): string {
  switch (cat) {
    case "offer_now":
      return colors.success.light;
    case "hold_later":
      return colors.warning.light;
    case "reject":
      return colors.error.light;
    default:
      return colors.background.badge;
  }
}

function categoryIcon(cat: ClientRating["feedbackCategory"]): string {
  switch (cat) {
    case "offer_now":
      return "📄";
    case "hold_later":
      return "⏳";
    case "reject":
      return "✕";
    default:
      return "●";
  }
}

// ─── StarRating ───────────────────────────────────────────────────────────────

function StarRating({ rating, size = 13 }: { rating: number; size?: number }) {
  return (
    <View style={styles.starsRow}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Text
          key={i}
          style={[
            styles.star,
            { color: i <= rating ? "#f59e0b" : "#e2e8f0", fontSize: size },
          ]}
        >
          ★
        </Text>
      ))}
    </View>
  );
}

// ─── CategoryBadge ────────────────────────────────────────────────────────────

function CategoryBadge({
  category,
}: {
  category: ClientRating["feedbackCategory"];
}) {
  return (
    <View
      style={[
        styles.categoryBadge,
        { backgroundColor: categoryBgColor(category) },
      ]}
    >
      <Text style={styles.categoryBadgeIcon}>{categoryIcon(category)}</Text>
      <Text
        style={[styles.categoryBadgeText, { color: categoryColor(category) }]}
      >
        {categoryLabel(category)}
      </Text>
    </View>
  );
}

// ─── PropertyRatingCard ───────────────────────────────────────────────────────
// Handles both states:
//  - initialRating provided  -> "rated" card (category badge, Edit Feedback)
//  - initialRating omitted   -> "awaiting review" card (clock badge, Add Feedback)

type Props = {
  masterPropertyId: number;
  tourId: string;
  initialRating?: ClientRating;
};

export function PropertyRatingCard({
  masterPropertyId,
  tourId,
  initialRating,
}: Props) {
  const navigation = useNavigation<any>();
  const mid = masterPropertyId;
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  // Fetch full property detail (includes photos array)
  const { data: propDetail, isLoading } = usePropertyDetail(mid);
  const prop = propDetail;
  const displayPhotos = (propDetail?.photos ?? []).filter(
    (p: any) => !p.mediaCategory || p.mediaCategory === "Property Photo",
  );

  const { data: ratings, isLoading: ratingsLoading } = useClientRatings(
    { masterPropertyId: mid, tourId },
    { enabled: mid != null },
  );
  const existingRating = ratings?.[0] ?? initialRating;
  const hasRating = existingRating != null;

  // Numeric star value on the rating, if the API returns one.
  // Adjust the field name below if your ClientRating type calls it
  // something other than `rating` (e.g. overallRating / stars).
  const starValue = (existingRating as any)?.rating as number | undefined;

  const feedbackProperty = {
    address: prop?.address ?? `Property #${mid}`,
    beds: prop?.bedrooms ?? 0,
    baths: prop?.bathrooms ?? 0,
    price: prop?.price != null ? (formatPrice(prop.price) ?? "") : "",
  };

  return (
    <>
      <View style={[styles.card, !hasRating && styles.unreviewedCard]}>
        <TouchableOpacity
          onPress={() =>
            navigation.navigate("PropertyDetails", { propertyId: String(mid) })
          }
          activeOpacity={0.92}
        >
          {/* ── Image block with overlaid badge ── */}
          <View style={styles.imageWrapper}>
            {isLoading ? (
              <View style={styles.imagePlaceholder}>
                <ActivityIndicator size="large" color={colors.primary.default} />
              </View>
            ) : (
              <PropertyPhotoCarousel
                photos={displayPhotos}
                imageUrl={prop?.imageUrl ?? null}
                height={180}
              />
            )}
            <View style={styles.imageBadgeTopLeft}>
              {existingRating?.feedbackCategory ? (
                <CategoryBadge category={existingRating.feedbackCategory} />
              ) : (
                <View style={styles.awaitingBadge}>
                  <Text style={styles.awaitingBadgeIcon}>🕐</Text>
                  <Text style={styles.awaitingBadgeText}>Awaiting Review</Text>
                </View>
              )}
            </View>
          </View>

          {/* ── Card body ── */}
          <View style={styles.cardBody}>
            {!isLoading && prop?.price != null && (
              <View style={styles.priceRow}>
                <Text style={styles.price}>{formatPrice(prop.price)}</Text>
                {starValue != null && (
                  <StarRating rating={starValue} size={25} />
                )}
              </View>
            )}

            <Text style={styles.address} numberOfLines={1}>
              {isLoading ? "Loading…" : (prop?.address ?? `Property #${mid}`)}
            </Text>

            {!isLoading && prop && (
              <Text style={styles.subAddress} numberOfLines={1}>
                {[prop.city, prop.province].filter(Boolean).join(", ")}
                {prop.propertyType ? `  ·  ${prop.propertyType}` : ""}
              </Text>
            )}

            {!isLoading && prop && (
              <View style={styles.specsRow}>
                <View style={styles.specsGroup}>
                  {prop.bedrooms != null && (
                    <View style={styles.specPill}>
                      <Text style={styles.specIcon}>🛏</Text>
                      <Text style={styles.specText}>{prop.bedrooms} Bed</Text>
                    </View>
                  )}
                  {prop.bathrooms != null && (
                    <View style={styles.specPill}>
                      <Text style={styles.specIcon}>🚿</Text>
                      <Text style={styles.specText}>{prop.bathrooms} Bath</Text>
                    </View>
                  )}
                </View>

                <TouchableOpacity
                  style={[styles.feedbackBtn, hasRating && styles.feedbackBtnEdit]}
                  onPress={(e) => {
                    e.stopPropagation();
                    setFeedbackOpen(true);
                  }}
                  activeOpacity={0.75}
                  disabled={ratingsLoading}
                >
                  {ratingsLoading ? (
                    <ActivityIndicator size="small" color="#6366f1" />
                  ) : (
                    <Text style={styles.feedbackBtnIcon}>
                      {hasRating ? "✏️" : "⭐"}
                    </Text>
                  )}
                  <Text
                    style={[
                      styles.feedbackBtnText,
                      hasRating && styles.feedbackBtnTextEdit,
                    ]}
                  >
                    {hasRating ? "Edit Feedback" : "Add Feedback"}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            <Text style={styles.awaitingHint}>
              You toured this property — share your thoughts!
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      <PropertyVisitFeedbackForm
        open={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
        property={feedbackProperty}
        masterPropertyId={Number(mid)}
        tourId={tourId}
        existingRating={existingRating}
        onSaved={(saved) => {
          console.log("Rating saved for property", mid, saved);
        }}
      />
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.background.surface,
    borderRadius: 16,
    marginBottom: 16,
    overflow: "hidden",
    flexDirection: "column",
    ...shadows.sm,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  unreviewedCard: {
    borderWidth: 1.5,
    borderColor: "#cbd5e1",
    borderStyle: "dashed",
  },

  imageWrapper: {
    width: "100%",
    height: 180,
    position: "relative",
    backgroundColor: colors.background.subtle,
  },
  imagePlaceholder: {
    width: "100%",
    height: "100%" as any,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#e2e8f0",
  },
  imageBadgeTopLeft: {
    position: "absolute",
    top: 10,
    left: 10,
  },

  cardBody: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    gap: 6,
  },

  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  price: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1e40af",
  },

  address: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text.primary,
    flex: 1,
  },
  subAddress: {
    fontSize: 12,
    color: colors.text.secondary,
    lineHeight: 17,
  },

  specsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 2,
  },
  specsGroup: {
    flexDirection: "row",
    gap: 8,
    flexShrink: 1,
  },
  specPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#f1f5f9",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  specIcon: {
    fontSize: 12,
  },
  specText: {
    fontSize: 12,
    color: colors.text.secondary,
    fontWeight: "600",
  },

  starsRow: {
    flexDirection: "row",
    gap: 2,
  },
  star: {
    fontSize: 14,
  },

  categoryBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 4,
  },
  categoryBadgeIcon: {
    fontSize: 11,
    fontWeight: "700",
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: "700",
  },

  awaitingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  awaitingBadgeIcon: {
    fontSize: 12,
  },
  awaitingBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748b",
  },
  awaitingHint: {
    fontSize: 13,
    color: colors.text.muted,
    fontStyle: "italic",
    marginTop: 2,
  },

  feedbackBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  feedbackBtnEdit: {
    backgroundColor: "#eef2ff",
    borderColor: "#6366f1",
  },
  feedbackBtnIcon: {
    fontSize: 14,
  },
  feedbackBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
  },
  feedbackBtnTextEdit: {
    color: "#6366f1",
  },
});