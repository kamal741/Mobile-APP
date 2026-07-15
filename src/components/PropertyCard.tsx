import { useState, memo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";
import { useTourCart } from "../contexts/TourCartContext";
import { Card, CardContent } from "./Card";
import { PropertyPhotoCarousel, PropertyPhoto } from "./PropertyPhotoCarousel";
import { FullScreenImageModal } from "@/screens/agent/BrowseProperty/components/FullScreenImageModal";
import { PropertySearchItem } from "../lib/propertyApi";
import { colors, typography, spacing, border, shadows } from "../theme";
import { NormalButton, IconButton, getVariantColor } from "@/components/common/ST_Buttons";
import Svg, { Path } from "react-native-svg";
import { Heart, Share2 } from "lucide-react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAuth } from "../contexts/AuthContext";
import { useOpenClientDirectConversation } from "../hooks/useChat";
import { Ionicons } from "@expo/vector-icons";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPrice(price: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(price);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ─── Upload Media Icon ────────────────────────────────────────────────────────

function UploadMediaIcon({ size = 16, color = "#ffffff" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M23 19C23 19.5304 22.7893 20.0391 22.4142 20.4142C22.0391 20.7893 21.5304 21 21 21H3C2.46957 21 1.96086 20.7893 1.58579 20.4142C1.21071 20.0391 1 19.5304 1 19V8C1 7.46957 1.21071 6.96086 1.58579 6.58579C1.96086 6.21071 2.46957 6 3 6H7L9 3H15L17 6H21C21.5304 6 22.0391 6.21071 22.4142 6.58579C22.7893 6.96086 23 7.46957 23 8V19Z"
        stroke={color}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M12 10V16M12 10L9.5 12.5M12 10L14.5 12.5"
        stroke={color}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

type Props = {
  property: PropertySearchItem;
  userType?: "Client" | "Agent";
  isSaved?: boolean;
  isSaving?: boolean;
  onSaveToggle?: () => void;
  savedMode?: {
    savedAt: string;
    mlsNumber?: string | null;
    onUnsave?: () => void;
    isRemoving?: boolean;
  };
};

// ─── Component ────────────────────────────────────────────────────────────────

function PropertyCardComponent({
  property,
  savedMode,
  isSaved,
  isSaving,
  onSaveToggle,
  userType = "Client",
}: Props) {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { addToCart, removeFromCart, isInCart } = useTourCart();
  const { user } = useAuth();
  const openClientDirectConversation = useOpenClientDirectConversation();

  const [fsModal, setFsModal] = useState<{
    photos: PropertyPhoto[];
    startIndex: number;
  } | null>(null);

  const sharedMediaPropertyIds: number[] =
    user?.agentDetails?.sharedMedia?.sharedMediaPropertyIds ?? [];
  const canViewMedia =
    userType === "Client" && sharedMediaPropertyIds.includes(property.id);

  const inCart = isInCart(String(property.id));

  const tourPhoto = (property.photos ?? []).find(
    (p) => p.mediaCategory === "Video Tour Website",
  );
  const displayPhotos = (property.photos ?? []).filter(
    (p) => !p.mediaCategory || p.mediaCategory === "Property Photo",
  );

  // ── Agent details (client context only) ───────────────────────────────────
  const clientAgentDetails =
    user?.role === "client"
      ? (
          user as {
            agentDetails?: {
              id?: number | null;
              displayName?: string | null;
              profileImageUrl?: string | null;
            } | null;
          }
        ).agentDetails
      : undefined;

  const agentDisplayName = clientAgentDetails?.displayName ?? "Your Agent";

  // ── Share property to agent chat ──────────────────────────────────────────


  const handleShareToAgent = async () => {
  const agentId = clientAgentDetails?.id;
  if (!agentId) {
    Alert.alert(
      "No agent assigned",
      "Your agent chat will appear here once a conversation has been started.",
    );
    return;
  }

  try {
    const conversation = await openClientDirectConversation.mutateAsync(agentId);
    navigation.navigate("ChatRoom", {
      conversationId: conversation.id,
      otherUserName: agentDisplayName,
      sharedProperty: {
        id: property.id,
        address: property.address,
        price: property.price,
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms,
        city: property.city,
        province: property.province,
        propertyType: property.propertyType,
        imageUrl: property.imageUrl,
      },
    });
  } catch {
    Alert.alert("Unable to open chat", "Please try again in a moment.");
  }
};

  const handleCartToggle = () => {
    if (inCart) {
      removeFromCart(String(property.id));
    } else {
      addToCart({
        id: String(property.id),
        address: property.address,
        price: property.price,
        bedrooms: property.bedrooms,
        bathrooms: String(property.bathrooms),
        squareFootage: property.area,
        imageUrl: property.imageUrl,
      });
    }
  };

  const addressParts = [property.address];
  if (property.city && !property.address.includes(property.city)) {
    addressParts.push(property.city);
  }
  if (property.province && !property.address.includes(property.province)) {
    addressParts.push(property.province);
  }
  const fullAddress = addressParts.join(", ");

  const showHeartBtn = savedMode && savedMode.onUnsave;

  return (
    <>
      <Card style={styles.propertyCard}>
        {/* ── Photo — no navigation, tap only enlarges/swipes ── */}
        <View style={styles.photoWrapper}>
          <PropertyPhotoCarousel
            photos={displayPhotos}
            imageUrl={property.imageUrl}
            height={savedMode ? 160 : 180}
            showIndicators={!savedMode}
            onEnlargePress={(photos, startIndex) =>
              setFsModal({ photos, startIndex })
            }
          />

          {/* Heart unsave button — saved mode */}
          {savedMode && savedMode.onUnsave && (
            <TouchableOpacity
              style={styles.heartBtn}
              onPress={(e) => {
                e.stopPropagation();
                savedMode.onUnsave!();
              }}
              disabled={savedMode.isRemoving}
              activeOpacity={0.8}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              {savedMode.isRemoving ? (
                <ActivityIndicator size="small" color={colors.error.default} />
              ) : (
                <Text style={[styles.heartIcon, styles.heartIconSaved]}>♥</Text>
              )}
            </TouchableOpacity>
          )}

          


          {userType === "Agent" && (
            <View style={[styles.uploadBtnContainer, styles.uploadBtnTopLeft]}>
              <Ionicons
                name="cloud-upload-outline"
                size={24}
                color={colors.primary.mid}
                onPress={() => {
                  navigation.navigate("MediaUpload", {
                    propertyId: property.id,
                    propertyAddress: fullAddress,
                  });
                }}
              />
            </View>
          )}

        </View>

        {/* ── Card body — tap navigates to detail; buttons inside stop propagation ── */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() =>
            navigation.navigate("PropertyDetails", { propertyId: property.id })
          }
        >
          <CardContent>
            {/* ── Price row ── */}
            <View style={styles.priceRow}>
              <Text style={styles.price}>{formatPrice(property.price)}</Text>

              
              <View style={styles.priceActions}>

                {userType === "Client" && (
                  <TouchableOpacity
                    style={styles.shareIconBtn}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleShareToAgent();
                    }}
                    disabled={openClientDirectConversation.isPending}
                    activeOpacity={0.75}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    {openClientDirectConversation.isPending ? (
                      <ActivityIndicator size="small" color="#1d4ed8" />
                    ) : (
                      <Share2 size={18} color="#1d4ed8" />
                    )}
                  </TouchableOpacity>
                )}

                {/* 360 Tour button */}
                {tourPhoto && (
                  <NormalButton
                    label="View in 360°"
                    variant="primary"
                    size="sm"
                    fullWidth={false}
                    onPress={(e?: { stopPropagation?: () => void }) => {
                      e?.stopPropagation?.();
                      Linking.openURL(tourPhoto.url);
                    }}
                  />
                )}
                {/* Type badge — saved mode */}
                {savedMode && property.propertyType && (
                  <View style={styles.typeBadge}>
                    <Text style={styles.typeBadgeText}>{property.propertyType}</Text>
                  </View>
                )}
                {/* Heart save/unsave — browse mode */}
                {!savedMode && onSaveToggle && (
                  <TouchableOpacity
                    style={[
                      styles.shortlistIconBtn,
                      isSaved && styles.shortlistIconBtnSaved,
                    ]}
                    onPress={(e) => {
                      e.stopPropagation();
                      onSaveToggle();
                    }}
                    disabled={isSaving}
                    activeOpacity={0.7}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    {isSaving ? (
                      <ActivityIndicator size="small" color={colors.error.default} />
                    ) : (
                      <Heart
                        size={22}
                        color={isSaved ? "#ffffff" : "#94a3b8"}
                        fill={isSaved ? "#ffffff" : "transparent"}
                      />
                    )}
                  </TouchableOpacity>
                )}
                {/* Share to agent — client browse mode only */}
                
              </View>
            </View>

            {/* ── Address ── */}
            <Text style={styles.address} numberOfLines={2}>
              {savedMode ? fullAddress : property.address}
            </Text>

            {/* City / Province — browse mode only */}
            {!savedMode && (property.city || property.province) && (
              <Text style={styles.location}>
                {[property.city, property.province].filter(Boolean).join(", ")}
              </Text>
            )}

            {/* ── Stats ── */}
            {savedMode ? (
              <View style={styles.pillRow}>
                <View style={styles.pillItem}>
                  <Text style={styles.pillValue}>{property.bedrooms}</Text>
                  <Text style={styles.pillLabel}>Beds</Text>
                </View>
                <View style={styles.pillDivider} />
                <View style={styles.pillItem}>
                  <Text style={styles.pillValue}>{property.bathrooms}</Text>
                  <Text style={styles.pillLabel}>Baths</Text>
                </View>
                {property.squareFootage || property.area ? (
                  <>
                    <View style={styles.pillDivider} />
                    <View style={styles.pillItem}>
                      <Text style={styles.pillValue}>
                        {property.squareFootage
                          ? property.squareFootage.toLocaleString()
                          : property.area}
                      </Text>
                      <Text style={styles.pillLabel}>Sq Ft</Text>
                    </View>
                  </>
                ) : null}
              </View>
            ) : (
              <View style={styles.details}>
                <Text style={styles.detail}>{property.bedrooms} bed</Text>
                <Text style={styles.detailDot}>•</Text>
                <Text style={styles.detail}>{property.bathrooms} bath</Text>
                {property.area && (
                  <>
                    <Text style={styles.detailDot}>•</Text>
                    <Text style={styles.detail}>{property.area}</Text>
                  </>
                )}
                {property.propertyType && (
                  <>
                    <Text style={styles.detailDot}>•</Text>
                    <Text style={styles.detail}>{property.propertyType}</Text>
                  </>
                )}
              </View>
            )}

            {/* ── MLS + saved date footer — saved mode only ── */}
            {savedMode && (
              <View style={styles.footer}>
                <Text style={styles.savedDate}>
                  Saved {formatDate(savedMode.savedAt)}
                </Text>
              </View>
            )}

            {/* ── Add to Tour + View Media — browse mode, client only ── */}
            {!savedMode && (
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.viewMediaButton, inCart && styles.cartButtonActive]}
                  onPress={(e) => {
                    e.stopPropagation();
                    handleCartToggle();
                  }}
                >
                  <Text
                    style={[
                      styles.viewMediaButtonText,
                      inCart && styles.cartButtonTextActive,
                    ]}
                  >
                    {inCart ? "✓ In Cart" : "+ Add to Tour"}
                  </Text>
                </TouchableOpacity>

                {canViewMedia && (
                  <TouchableOpacity
                    style={styles.viewMediaButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      navigation.navigate("MediaCenter", {
                        userType: "Client",
                        propertyId: property.id,
                      });
                    }}
                  >
                    <Text style={styles.viewMediaButtonText}>🖼️ View Media</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </CardContent>
        </TouchableOpacity>
      </Card>

      <FullScreenImageModal
        visible={fsModal !== null}
        photos={fsModal?.photos ?? []}
        startIndex={fsModal?.startIndex ?? 0}
        onClose={() => setFsModal(null)}
      />
    </>
  );
}

export const PropertyCard = memo(PropertyCardComponent);

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  propertyCard: {
    marginBottom: 16,
    marginHorizontal: 8,
    overflow: "hidden",
  },
  photoWrapper: {
    position: "relative",
  },
  heartBtn: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  heartIcon: {
    fontSize: 20,
    color: "#94a3b8",
    lineHeight: 24,
  },
  heartIconSaved: {
    color: colors.error.default,
  },
  uploadBtn: {
    position: "absolute",
    top: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: colors.primary.mid,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  uploadBtnWithHeart: {
    right: 56,
  },
  uploadBtnAlone: {
    right: 12,
  },
  uploadLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#ffffff",
    letterSpacing: 0.2,
  },
  priceActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  shortlistIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#dbe7f3",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  shortlistIconBtnSaved: {
    backgroundColor: "#ef4444",
    borderColor: "#ef4444",
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
  typeBadge: {
    backgroundColor: colors.primary.light,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xxs,
    borderRadius: border.radius.chipSm,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.primary.mid,
  },
  // ── Share icon button (identical to PropertyCardAgent) ──
  shareIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: "#eff6ff",
    borderWidth: 1.5,
    borderColor: "#93c5fd",
    alignItems: "center",
    justifyContent: "center",
  },
  address: {
    fontSize: 14,
    color: "#1e293b",
    marginTop: 4,
    lineHeight: 20,
  },
  location: {
    fontSize: 13,
    color: "#64748b",
    marginTop: 2,
  },
  details: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 8,
    marginBottom: 12,
  },
  detail: {
    fontSize: 13,
    color: "#94a3b8",
  },
  detailDot: {
    fontSize: 13,
    color: "#94a3b8",
    marginHorizontal: 6,
  },
  pillRow: {
    flexDirection: "row",
    backgroundColor: colors.background.subtle,
    borderRadius: border.radius.item,
    paddingVertical: spacing.md,
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
    justifyContent: "center",
  },
  pillItem: {
    alignItems: "center",
    paddingHorizontal: spacing["3xl"],
  },
  pillValue: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text.primary,
  },
  pillLabel: {
    fontSize: 11,
    color: colors.text.muted,
    marginTop: 2,
  },
  pillDivider: {
    width: 1,
    backgroundColor: colors.border.default,
    marginVertical: spacing.xs,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  mls: {
    fontSize: 12,
    color: colors.text.muted,
  },
  savedDate: {
    fontSize: 12,
    color: colors.text.muted,
  },
  cartButton: {
    flex: 1,
    backgroundColor: "#f1f5f9",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  cartButtonActive: {
    backgroundColor: "#1e40af",
  },
  cartButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1e40af",
  },
  cartButtonTextActive: {
    color: "#ffffff",
  },
uploadBtnContainer: {
    position: "absolute",
    top: 10,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary.light ?? "#E8F0FE",
    alignItems: "center",
    justifyContent: "center",
  },
  uploadBtnTopLeft: {
    left: 12,
  },
  actionRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  viewMediaButton: {
    flex: 1,
    backgroundColor: "#eff6ff",
    borderWidth: 1.5,
    borderColor: "#93c5fd",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  viewMediaButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1d4ed8",
  },


});


