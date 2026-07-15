// components/PropertyCardAgent.tsx - Agent
import {
  View,
  Text,
  TouchableOpacity,
  Linking,
  StyleSheet,
} from "react-native";
import { Share2 } from "lucide-react-native";
import { useNavigation } from "@react-navigation/native";
import { Card, CardContent } from "../../../../components/Card";
import {
  PropertyPhotoCarousel,
  PropertyPhoto,
} from "../../../../components/PropertyPhotoCarousel";
import { NormalButton } from "@/components/common/ST_Buttons";
import { PropertySearchItem } from "../../../../lib/propertyApi";

type Props = {
  item: PropertySearchItem;
  isAgent: boolean;
  inCart: boolean;
  onCartToggle: () => void;
  onNavigateToDetail: () => void;
  onShareProperty: () => void;
  onOpenFullScreen: (photos: PropertyPhoto[], startIndex: number) => void;
};

const formatPrice = (price: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(price);

export function PropertyCardAgent({
  item,
  isAgent,
  inCart,
  onCartToggle,
  onNavigateToDetail,
  onShareProperty,
  onOpenFullScreen,
}: Props) {
  const navigation = useNavigation<any>();

  const tourPhoto = (item.photos ?? []).find(
    (p) => p.mediaCategory === "Video Tour Website"
  );
  const displayPhotos = (item.photos ?? []).filter(
    (p) => !p.mediaCategory || p.mediaCategory === "Property Photo"
  );

  return (
    <Card style={styles.propertyCard}>
      <PropertyPhotoCarousel
        photos={displayPhotos}
        imageUrl={item.imageUrl}
        height={180}
        onEnlargePress={(photos, startIndex) => onOpenFullScreen(photos, startIndex)}
      />

      {/* Price row — kept outside the card body TouchableOpacity to avoid
          nested-touchable conflicts on Android */}
      <View style={styles.priceRowOuter}>
        <Text style={styles.price}>{formatPrice(item.price)}</Text>
        <View style={styles.priceRowActions}>
          {isAgent && (
            <TouchableOpacity
              style={styles.shareIconBtn}
              onPress={onShareProperty}
              activeOpacity={0.75}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Share2 size={18} color="#1d4ed8" />
            </TouchableOpacity>
          )}
          {tourPhoto && (
            <TouchableOpacity
              onPress={() => Linking.openURL(tourPhoto.url)}
              activeOpacity={0.8}
            >
              <NormalButton
                label="View in 360°"
                variant="primary"
                size="sm"
                fullWidth={false}
                onPress={() => Linking.openURL(tourPhoto.url)}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Card body — tap navigates to detail */}
      <TouchableOpacity activeOpacity={0.85} onPress={onNavigateToDetail}>
        <CardContent>
          <Text style={styles.address} numberOfLines={2}>
            {item.address}
          </Text>
          {(item.city || item.province) && (
            <Text style={styles.location}>
              {[item.city, item.province].filter(Boolean).join(", ")}
            </Text>
          )}

          <View style={styles.details}>
            <Text style={styles.detail}>{item.bedrooms} bed</Text>
            <Text style={styles.detailDivider}>•</Text>
            <Text style={styles.detail}>{item.bathrooms} bath</Text>
            {item.area && (
              <>
                <Text style={styles.detailDivider}>•</Text>
                <Text style={styles.detail}>{item.area}</Text>
              </>
            )}
            {item.propertyType && (
              <>
                <Text style={styles.detailDivider}>•</Text>
                <Text style={styles.detail}>{item.propertyType}</Text>
              </>
            )}
          </View>

          {/* Action buttons — stopPropagation prevents triggering card nav */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.uploadButton}
              onPress={(e) => {
                e.stopPropagation();
                navigation.navigate("MediaUpload", {
                  propertyId: item.id,
                  propertyAddress: item.address,
                });
              }}
            >
              <Text style={styles.uploadButtonText}>📤 Upload Media</Text>
            </TouchableOpacity>

            {!isAgent && (
              <TouchableOpacity
                style={[styles.viewMediaButton, inCart && styles.cartButtonActive]}
                onPress={(e) => {
                  e.stopPropagation();
                  onCartToggle();
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
            )}

            {!isAgent && (
              <TouchableOpacity
                style={styles.viewMediaButton}
                onPress={(e) => {
                  e.stopPropagation();
                  navigation.navigate("MediaCenter", {
                    userType: "Client",
                    propertyId: item.id,
                  });
                }}
              >
                <Text style={styles.viewMediaButtonText}>🖼️ View Media</Text>
              </TouchableOpacity>
            )}
          </View>
        </CardContent>
      </TouchableOpacity>
    </Card>
  );
}

const styles = StyleSheet.create({
  propertyCard: {
    marginBottom: 16,
    overflow: "hidden",
  },
  priceRowOuter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  price: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1e40af",
  },
  priceRowActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
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
  detailDivider: {
    fontSize: 13,
    color: "#94a3b8",
    marginHorizontal: 6,
  },
  actionRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  uploadButton: {
    flex: 1,
    backgroundColor: "#f0fdf4",
    borderWidth: 1.5,
    borderColor: "#86efac",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  uploadButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#16a34a",
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
  cartButtonActive: {
    backgroundColor: "#1e40af",
    borderColor: "#1e40af",
  },
  cartButtonTextActive: {
    color: "#ffffff",
  },
});
