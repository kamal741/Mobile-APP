/**
 * @file MediaCenterScreen.tsx
 * @description Agent-facing Media Center screen.
 *
 * Features:
 *  - Fetches all agent properties then lazily loads media per property
 *  - Property-wise accordion cards with image + video counts
 *  - Horizontal thumbnail strip with cover badge
 *  - Full-screen lightbox for images (swipeable via FlatList)
 *  - In-app video player modal (expo-av Video)
 *  - Status chips (APPROVED / PENDING_UPLOAD / REJECTED)
 *  - Fully themed via @/theme tokens
 *
 * Dependencies (already in most Expo projects):
 *   expo-av          – video playback
 *   @expo/vector-icons – Ionicons
 *
 * Usage:
 *   <MediaCenterScreen />   (no props needed — reads agent JWT from your api instance)
 */

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Modal,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { Video, ResizeMode } from "expo-av";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAllPropertiesMedia, useDeletePropertyMedia } from "@/lib/agentApi";
import { usePropertyDetail } from "@/lib/propertyApi";
import {
  colors,
  typography,
  spacing,
  shadows,
  radius,
  globalStyles,
} from "@/theme";

import { useRoute, useFocusEffect } from "@react-navigation/native";
import { useClientAllPropertiesMedia } from "@/lib/clientApi";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/types";
import { ClientFooter } from "@/screens/client/components/ClientFooter";
import { AgentFooter } from "../../components/AgentFooter";
// ─── Types ────────────────────────────────────────────────────────────────────

type MediaStatus = "PENDING_UPLOAD" | "APPROVED" | "REJECTED";
type MediaType = "IMAGE" | "VIDEO";
type PropertyFilter = "ALL" | "PHOTOS" | "VIDEOS";
type SortOption = "NEWEST" | "OLDEST" | "MOST_PHOTOS" | "HAS_VIDEOS";

interface MediaItem {
  mediaId: number;
  propertyId: number;
  mediaType: MediaType;
  fileUrl: string;
  thumbnailUrl: string | null;
  contentType: string;
  fileSizeMb: number;
  status: MediaStatus;
  displayOrder: number;
  isCover: boolean;
}

interface PropertyMedia {
  propertyId: number;
  images: MediaItem[];
  videos: MediaItem[];
}

// Minimal property shape derived from the media response.
interface AgentProperty {
  id: number;
  address?: string | null;
  imageUrl?: string | null;
  mlsNumber?: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const THUMB_SIZE = 80;
const THUMB_RADIUS = radius.card;

// ─── Sub-components ───────────────────────────────────────────────────────────

// ── Status chip ───────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<
  MediaStatus,
  { label: string; bg: string; text: string }
> = {
  APPROVED: {
    label: "Live",
    bg: colors.success.surface,
    text: colors.success.default,
  },
  PENDING_UPLOAD: {
    label: "Pending",
    bg: colors.warning.light,
    text: "#92400e",
  },
  REJECTED: {
    label: "Rejected",
    bg: colors.error.light,
    text: colors.error.default,
  },
};

function StatusChip({ status }: Readonly<{ status: MediaStatus }>) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.PENDING_UPLOAD;
  return (
    <View style={[styles.statusChip, { backgroundColor: cfg.bg }]}>
      <Text style={[styles.statusChipText, { color: cfg.text }]}>
        {cfg.label}
      </Text>
    </View>
  );
}

// ── Media thumbnail ───────────────────────────────────────────────────────────

function MediaThumb({
  item,
  onPress,
  onDeletePress,
  readonly = false,
}: Readonly<{
  item: MediaItem;
  onPress: (item: MediaItem) => void;
  onDeletePress: (item: MediaItem) => void;
  readonly?: boolean;
}>) {
  const isVideo = item.mediaType === "VIDEO";
  const src = item.thumbnailUrl ?? item.fileUrl;
  let statusDotColor: string = colors.warning.default;
  if (item.status === "APPROVED") {
    statusDotColor = colors.success.default;
  } else if (item.status === "REJECTED") {
    statusDotColor = colors.error.default;
  }

  return (
    <TouchableOpacity
      onPress={() => onPress(item)}
      style={styles.thumbWrapper}
      activeOpacity={0.82}
    >
      {/* <Image source={{ uri: src }} style={styles.thumb} resizeMode="cover" /> */}

      <Image
        source={{ uri: src }}
        style={styles.thumb}
        contentFit="cover"
        cachePolicy="memory-disk"
        transition={150}
        recyclingKey={String(item.mediaId)}
      />

      {/* Dark gradient overlay */}
      <View style={styles.thumbOverlay} />

      {/* Video play icon */}
      {isVideo && (
        <View style={styles.thumbPlayBtn}>
          <Ionicons name="play" size={14} color="#fff" />
        </View>
      )}

      {/* Cover badge */}
      {item.isCover && (
        <View style={styles.coverBadge}>
          <Ionicons name="star" size={9} color="#fff" />
        </View>
      )}

      {/* Status dot */}
      <View
        style={[
          styles.statusDot,
          {
            backgroundColor: statusDotColor,
          },
        ]}
      />

      {/* Delete button */}
      {/* Delete button — agent only */}
      {!readonly && (
        <TouchableOpacity
          style={styles.thumbDeleteBtn}
          onPress={(e) => {
            e.stopPropagation();
            onDeletePress(item);
          }}
          hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
        >
          <Ionicons name="trash" size={11} color="#fff" />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

// ── Property media card ───────────────────────────────────────────────────────
function PropertyMediaCard({
  property,
  media,
  isLoading,
  isExpanded,
  onToggle,
  onMediaPress,
  onDeletePress,
  readonly = false,
}: Readonly<{
  property: AgentProperty;
  media: PropertyMedia | null;
  isLoading: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  onMediaPress: (item: MediaItem, allMedia: MediaItem[]) => void;
  onDeletePress: (item: MediaItem) => void;
  readonly?: boolean;
}>) {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const rotateAnim = useRef(new Animated.Value(isExpanded ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(rotateAnim, {
      toValue: isExpanded ? 1 : 0,
      useNativeDriver: true,
      tension: 80,
      friction: 12,
    }).start();
  }, [isExpanded]);

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "90deg"],
  });

  const allMedia = media
    ? [...(media.images ?? []), ...(media.videos ?? [])].sort(
        (a, b) => a.displayOrder - b.displayOrder,
      )
    : [];

  const imageCount = media?.images.length ?? 0;
  const videoCount = media?.videos.length ?? 0;
  const mlsBadgeText = property.mlsNumber?.trim()
    ? property.mlsNumber
    : `#${property.id}`;

  let expandedContent: React.ReactNode;
  if (isLoading) {
    expandedContent = (
      <View style={styles.loadingRow}>
        <ActivityIndicator size="small" color={colors.primary.default} />
        <Text style={styles.loadingText}>Loading media…</Text>
      </View>
    );
  } else if (allMedia.length === 0) {
    expandedContent = (
      <View style={styles.emptyMedia}>
        <Ionicons
          name="cloud-upload-outline"
          size={28}
          color={colors.text.muted}
        />
        <Text style={styles.emptyMediaText}>No media uploaded yet</Text>
      </View>
    );
  } else {
    expandedContent = (
      <>
        {imageCount > 0 && (
          <View style={styles.sectionLabelRow}>
            <Ionicons name="images" size={13} color={colors.primary.default} />
            <Text style={styles.sectionLabel}>Photos ({imageCount})</Text>
          </View>
        )}
        {imageCount > 0 && (
          <View style={styles.thumbGrid}>
            {(media?.images ?? [])
              .sort((a, b) => a.displayOrder - b.displayOrder)
              .map((img) => (
                <MediaThumb
                  key={img.mediaId}
                  item={img}
                  onPress={(item) => onMediaPress(item, allMedia)}
                  onDeletePress={onDeletePress}
                  readonly={readonly}
                />
              ))}
          </View>
        )}

        {videoCount > 0 && (
          <>
            <View style={[styles.sectionLabelRow, { marginTop: spacing.md }]}>
              <Ionicons
                name="videocam"
                size={13}
                color={colors.purple.default}
              />
              <Text
                style={[styles.sectionLabel, { color: colors.purple.default }]}
              >
                Videos ({videoCount})
              </Text>
            </View>
            <View style={styles.thumbGrid}>
              {(media?.videos ?? [])
                .sort((a, b) => a.displayOrder - b.displayOrder)
                .map((vid) => (
                  <MediaThumb
                    key={vid.mediaId}
                    item={vid}
                    onPress={(item) => onMediaPress(item, allMedia)}
                    onDeletePress={onDeletePress}
                    readonly={readonly}
                  />
                ))}
            </View>
          </>
        )}
      </>
    );
  }

  return (
    <View style={styles.propertyCard}>
      {/* ── Card header ── */}
      <TouchableOpacity
        style={styles.cardHeader}
        onPress={onToggle}
        activeOpacity={0.85}
      >
        {/* Property hero thumbnail */}
        <View style={styles.propThumb}>
          {/* {property.imageUrl ? (
            <Image
              source={{ uri: property.imageUrl }}
              style={StyleSheet.absoluteFill}
              resizeMode="cover"
            />
          ) : (
            <View
              style={[StyleSheet.absoluteFill, styles.propThumbPlaceholder]}
            >
              <Ionicons
                name="home-outline"
                size={22}
                color={colors.text.muted}
              />
            </View>
          )} */}

          {property.imageUrl ? (
            <Image
              source={{ uri: property.imageUrl }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              cachePolicy="memory-disk"
              transition={150}
              recyclingKey={String(property.id)}
            />
          ) : (
            <View
              style={[StyleSheet.absoluteFill, styles.propThumbPlaceholder]}
            >
              <Ionicons
                name="home-outline"
                size={22}
                color={colors.text.muted}
              />
            </View>
          )}

          {/* Property MLS tag */}
          <View style={styles.priceTag}>
            <Text style={styles.priceTagText}>{mlsBadgeText}</Text>
          </View>
        </View>

        {/* Property info */}
        <View style={styles.propInfo}>
          <Text style={styles.propAddress} numberOfLines={1}>
            {property.address ?? `Property #${property.id}`}
          </Text>
          {/* Media count pills */}
          <View style={styles.countRow}>
            <View style={styles.countPill}>
              <Ionicons
                name="images-outline"
                size={11}
                color={colors.primary.default}
              />
              <Text style={styles.countPillText}>{imageCount} photos</Text>
            </View>
            {videoCount > 0 && (
              <View style={[styles.countPill, styles.countPillVideo]}>
                <Ionicons
                  name="videocam-outline"
                  size={11}
                  color={colors.purple.default}
                />
                <Text
                  style={[
                    styles.countPillText,
                    { color: colors.purple.default },
                  ]}
                >
                  {videoCount} videos
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Upload icon button — agent only */}
        {!readonly && (
          <TouchableOpacity
            style={styles.uploadIconBtn}
            onPress={(e) => {
              e.stopPropagation();
              navigation.navigate("MediaUpload", {
                propertyId: property.id,
                propertyAddress: String(property.address),
              });
            }}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Ionicons
              name="cloud-upload-outline"
              size={20}
              color={colors.primary.default}
            />
          </TouchableOpacity>
        )}

        {/* Chevron */}
        <Animated.View style={{ transform: [{ rotate }] }}>
          <Ionicons
            name="chevron-forward"
            size={20}
            color={colors.text.muted}
          />
        </Animated.View>
      </TouchableOpacity>

      {/* ── Expanded media strip ── */}
      {isExpanded && (
        <View style={styles.expandedBody}>
          <View style={styles.divider} />
          {expandedContent}
        </View>
      )}
    </View>
  );
}

// ─── Image Lightbox ───────────────────────────────────────────────────────────
function ImageLightbox({
  visible,
  items,
  startIndex,
  onClose,
}: Readonly<{
  visible: boolean;
  items: MediaItem[];
  startIndex: number;
  onClose: () => void;
}>) {
  const { width: SCREEN_W, height: SCREEN_H } = useWindowDimensions();
  const flatRef = useRef<FlatList>(null);
  const [current, setCurrent] = useState(startIndex);

  useEffect(() => {
    if (visible && flatRef.current) {
      // Small delay to let the modal mount
      setTimeout(() => {
        flatRef.current?.scrollToIndex({ index: startIndex, animated: false });
        setCurrent(startIndex);
      }, 100);
    }
  }, [visible, startIndex]);

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems[0]) setCurrent(viewableItems[0].index ?? 0);
  }).current;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <StatusBar hidden />
      <View style={styles.lightboxBg}>
        {/* Top bar */}
        <SafeAreaView edges={["top"]} style={styles.lightboxTopBar}>
          <TouchableOpacity onPress={onClose} style={styles.lightboxCloseBtn}>
            <Ionicons name="close" size={26} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.lightboxCounter}>
            {current + 1} / {items.length}
          </Text>
          <View style={{ width: 44 }} />
        </SafeAreaView>

        {/* Swipeable image list */}
        <FlatList
          ref={flatRef}
          data={items}
          horizontal
          pagingEnabled
          keyExtractor={(item) => String(item.mediaId)}
          showsHorizontalScrollIndicator={false}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
          getItemLayout={(_, i) => ({
            length: SCREEN_W,
            offset: SCREEN_W * i,
            index: i,
          })}
          renderItem={({ item }) => (
            <View
              style={{
                width: SCREEN_W,
                height: SCREEN_H,
                justifyContent: "center",
              }}
            >
              {/* <Image
                source={{ uri: item.fileUrl }}
                style={{ width: SCREEN_W, height: SCREEN_H * 0.78 }}
                resizeMode="contain"
              />
              */}

              <Image
                source={{ uri: item.fileUrl }}
                style={{ width: SCREEN_W, height: SCREEN_H * 0.78 }}
                contentFit="contain"
                cachePolicy="memory-disk"
                priority="high"
              />
            </View>
          )}
        />

        {/* Bottom metadata */}
        {items[current] && (
          <SafeAreaView edges={["bottom"]} style={styles.lightboxMeta}>
            <StatusChip status={items[current].status} />
            <Text style={styles.lightboxMetaSize}>
              {items[current].fileSizeMb} MB
            </Text>
            {items[current].isCover && (
              <View style={styles.lightboxCoverBadge}>
                <Ionicons
                  name="star"
                  size={12}
                  color={colors.warning.default}
                />
                <Text style={styles.lightboxCoverText}>Cover</Text>
              </View>
            )}
          </SafeAreaView>
        )}
      </View>
    </Modal>
  );
}

// ─── Video Player Modal ────────────────────────────────────────────────────────
function VideoPlayerModal({
  visible,
  item,
  onClose,
}: Readonly<{
  visible: boolean;
  item: MediaItem | null;
  onClose: () => void;
}>) {
  const { width: SCREEN_W } = useWindowDimensions();
  const videoRef = useRef<Video>(null);

  useEffect(() => {
    if (!visible && videoRef.current) {
      videoRef.current.pauseAsync().catch(() => {});
    }
  }, [visible]);

  if (!item) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <StatusBar hidden />
      <View style={styles.videoModalBg}>
        {/* Header */}
        <SafeAreaView edges={["top"]} style={styles.videoModalHeader}>
          <TouchableOpacity onPress={onClose} style={styles.lightboxCloseBtn}>
            <Ionicons name="chevron-down" size={26} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.videoModalTitle} numberOfLines={1}>
            Property Video
          </Text>
          <View style={{ width: 44 }} />
        </SafeAreaView>

        {/* Player */}
        <View style={styles.videoPlayerWrap}>
          <Video
            ref={videoRef}
            source={{ uri: item.fileUrl }}
            style={{ width: SCREEN_W, height: SCREEN_W * (9 / 16) }}
            useNativeControls
            resizeMode={ResizeMode.CONTAIN}
            shouldPlay
          />
        </View>

        {/* Metadata row */}
        <SafeAreaView edges={["bottom"]} style={styles.videoMetaRow}>
          <StatusChip status={item.status} />
          <Text style={styles.lightboxMetaSize}>
            {item.fileSizeMb} MB · {item.contentType}
          </Text>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

// ─── Property card with detail fetch ─────────────────────────────────────────
// Thin wrapper: fetches address from the catalog API and passes it into the card.
function PropertyMediaCardWithDetail(
  props: Omit<React.ComponentProps<typeof PropertyMediaCard>, "property"> & {
    property: AgentProperty;
    onAddressResolved?: (propertyId: number, address: string) => void;
  },
) {
  const { onAddressResolved, ...rest } = props;
  const { data: detail } = usePropertyDetail(props.property.id);

  useEffect(() => {
    if (detail?.address) {
      onAddressResolved?.(props.property.id, detail.address);
    }
  }, [detail?.address, onAddressResolved, props.property.id]);

  const enriched: AgentProperty = {
    ...rest.property,
    address: detail?.address ?? null,
    mlsNumber: detail?.mlsNumber ?? null,
  };
  return <PropertyMediaCard {...rest} property={enriched} />;
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function MediaCenterScreen() {
  const route = useRoute<any>();
  const userType: "Agent" | "Client" = route.params?.userType ?? "Agent";
  const focusPropertyId: number | undefined = route.params?.propertyId;
  const isClient = userType === "Client";

  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  // ── State ──────────────────────────────────────────────────────────────────
  const [properties, setProperties] = useState<AgentProperty[]>([]);
  const [mediaMap, setMediaMap] = useState<Record<number, PropertyMedia>>({});
  const [propertyAddressMap, setPropertyAddressMap] = useState<
    Record<number, string>
  >({});
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [sortOption, setSortOption] = useState<SortOption>("NEWEST");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [propertyFilter, setPropertyFilter] = useState<PropertyFilter>("ALL");

  // Lightbox
  const [lightboxItems, setLightboxItems] = useState<MediaItem[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // Video player
  const [videoItem, setVideoItem] = useState<MediaItem | null>(null);
  const [videoOpen, setVideoOpen] = useState(false);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<MediaItem | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingPropertyId, setDeletingPropertyId] = useState<number | null>(
    null,
  );

  const deleteMutation = useDeletePropertyMedia(deletingPropertyId ?? "");

  // ── Data fetching ──────────────────────────────────────────────────────────
  const agentMediaQuery = useAllPropertiesMedia({ enabled: !isClient });
  const clientMediaQuery = useClientAllPropertiesMedia({ enabled: isClient });

  const {
    data: allMediaData,
    isLoading: propertiesLoading,
    error: propertiesErrorObj,
    refetch: refetchAllMedia,
  } = isClient ? clientMediaQuery : agentMediaQuery;

  const propertiesError = propertiesErrorObj?.message ?? null;

  const handleDeletePress = useCallback((item: MediaItem) => {
    setDeletingPropertyId(item.propertyId);
    setDeleteTarget(item);
    setDeleteDialogOpen(true);
  }, []);

  const removeDeletedMediaFromState = useCallback((target: MediaItem) => {
    setMediaMap((prev) => {
      const existing = prev[target.propertyId];
      if (!existing) return prev;

      return {
        ...prev,
        [target.propertyId]: {
          ...existing,
          images: existing.images.filter((m) => m.mediaId !== target.mediaId),
          videos: existing.videos.filter((m) => m.mediaId !== target.mediaId),
        },
      };
    });
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    if (!deleteTarget) return;
    deleteMutation.mutate([deleteTarget.mediaId], {
      onSuccess: () => {
        removeDeletedMediaFromState(deleteTarget);
        void refetchAllMedia();
        setDeleteDialogOpen(false);
        setDeleteTarget(null);
      },
      onError: () => {
        setDeleteDialogOpen(false);
        setDeleteTarget(null);
      },
    });
  }, [
    deleteTarget,
    deleteMutation,
    refetchAllMedia,
    removeDeletedMediaFromState,
  ]);

  const handleDeleteCancel = useCallback(() => {
    setDeleteDialogOpen(false);
    setDeleteTarget(null);
  }, []);

  // Summary stats
  const totalPhotos = Object.values(mediaMap).reduce(
    (s, m) => s + m.images.length,
    0,
  );
  const totalVideos = Object.values(mediaMap).reduce(
    (s, m) => s + m.videos.length,
    0,
  );

  const displayProperties =
    focusPropertyId == null
      ? properties
      : properties.filter((p) => p.id === focusPropertyId);

  const filteredProperties = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const numericQuery = normalizedQuery.replace(/\D/g, "");

    return displayProperties.filter((property) => {
      const media = mediaMap[property.id];
      if (!media) return false;

      const resolvedAddress =
        propertyAddressMap[property.id] ?? property.address ?? "";
      const matchesId =
        numericQuery.length > 0 &&
        property.id.toString().includes(numericQuery);

      const matchesQuery =
        normalizedQuery.length === 0 ||
        matchesId ||
        resolvedAddress.toLowerCase().includes(normalizedQuery);

      if (!matchesQuery) return false;

      if (propertyFilter === "PHOTOS") return (media.images?.length ?? 0) > 0;
      if (propertyFilter === "VIDEOS") return (media.videos?.length ?? 0) > 0;
      return true;
    });
  }, [
    displayProperties,
    mediaMap,
    propertyAddressMap,
    propertyFilter,
    searchQuery,
  ]);

  const sortedProperties = useMemo(() => {
    const list = [...filteredProperties];

    const latestMediaId = (propertyId: number) => {
      const media = mediaMap[propertyId];
      if (!media) return 0;
      const ids = [...(media.images ?? []), ...(media.videos ?? [])].map(
        (m) => m.mediaId,
      );
      return ids.length > 0 ? Math.max(...ids) : 0;
    };

    const oldestMediaId = (propertyId: number) => {
      const media = mediaMap[propertyId];
      if (!media) return Number.MAX_SAFE_INTEGER;
      const ids = [...(media.images ?? []), ...(media.videos ?? [])].map(
        (m) => m.mediaId,
      );
      return ids.length > 0 ? Math.min(...ids) : Number.MAX_SAFE_INTEGER;
    };

    const photoCount = (propertyId: number) =>
      mediaMap[propertyId]?.images?.length ?? 0;
    const videoCount = (propertyId: number) =>
      mediaMap[propertyId]?.videos?.length ?? 0;

    switch (sortOption) {
      case "OLDEST":
        return list.sort((a, b) => oldestMediaId(a.id) - oldestMediaId(b.id));
      case "MOST_PHOTOS":
        return list.sort((a, b) => photoCount(b.id) - photoCount(a.id));
      case "HAS_VIDEOS":
        return list.sort((a, b) => {
          const aHasVideos = videoCount(a.id) > 0;
          const bHasVideos = videoCount(b.id) > 0;
          if (aHasVideos !== bHasVideos) return bHasVideos ? 1 : -1;
          return videoCount(b.id) - videoCount(a.id);
        });
      case "NEWEST":
      default:
        return list.sort((a, b) => latestMediaId(b.id) - latestMediaId(a.id));
    }
  }, [filteredProperties, mediaMap, sortOption]);

  const handleAddressResolved = useCallback(
    (propertyId: number, address: string) => {
      setPropertyAddressMap((prev) => {
        if (prev[propertyId] === address) return prev;
        return { ...prev, [propertyId]: address };
      });
    },
    [],
  );

  useEffect(() => {
    if (!allMediaData) return;

    // Normalise client response (uses `url`/`id`) to match agent shape (`fileUrl`/`mediaId`).
    const normalised = allMediaData.map((pm: any) => ({
      propertyId: pm.propertyId,
      images: (pm.images ?? []).map((img: any) => ({
        ...img,
        mediaId: img.mediaId ?? img.id,
        fileUrl: img.fileUrl ?? img.url,
        isCover: img.isCover ?? img.cover ?? false,
        status: img.status ?? "APPROVED",
      })),
      videos: (pm.videos ?? []).map((vid: any) => ({
        ...vid,
        mediaId: vid.mediaId ?? vid.id,
        fileUrl: vid.fileUrl ?? vid.url,
        isCover: vid.isCover ?? vid.cover ?? false,
        status: vid.status ?? "APPROVED",
      })),
    }));

    const props: AgentProperty[] = normalised.map((pm) => ({
      id: pm.propertyId,
      imageUrl: pm.images[0]?.fileUrl ?? null,
    }));
    const map: Record<number, PropertyMedia> = {};
    normalised.forEach((pm) => {
      map[pm.propertyId] = pm;
    });

    setProperties(props);
    setMediaMap(map);
  }, [allMediaData]);

  useEffect(() => {
    if (focusPropertyId == null || properties.length === 0) return;
    setExpandedIds(new Set([focusPropertyId]));
  }, [focusPropertyId, properties]);

  // ── Expand / collapse ──────────────────────────────────────────────────────
  const toggleExpand = useCallback((propertyId: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(propertyId)) {
        next.delete(propertyId);
      } else {
        next.add(propertyId);
        // Media is already pre-loaded from fetchAllMedia — no lazy fetch needed
      }
      return next;
    });
  }, []);

  const expandAllVisible = useCallback(() => {
    setExpandedIds(new Set(sortedProperties.map((p) => p.id)));
  }, [sortedProperties]);

  const collapseAll = useCallback(() => {
    setExpandedIds(new Set());
  }, []);

  const listSeparator = useCallback(
    () => <View style={{ height: spacing.md }} />,
    [],
  );

  // After handleRefresh (line ~1288)
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refetchAllMedia();
    } finally {
      setIsRefreshing(false);
    }
  }, [refetchAllMedia]);

  // ── Refresh when returning from MediaUploadScreen ─────────────────────────
  const hasMountedRef = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (!hasMountedRef.current) {
        hasMountedRef.current = true;
        return;
      }
      void refetchAllMedia();
    }, [refetchAllMedia]),
  );

  // ── Media press ────────────────────────────────────────────────────────────
  const handleMediaPress = useCallback(
    (item: MediaItem, allMedia: MediaItem[]) => {
      if (item.mediaType === "VIDEO") {
        setVideoItem(item);
        setVideoOpen(true);
      } else {
        const images = allMedia.filter((m) => m.mediaType === "IMAGE");
        const idx = images.findIndex((m) => m.mediaId === item.mediaId);
        setLightboxItems(images);
        setLightboxIndex(Math.max(0, idx));
        setLightboxOpen(true);
      }
    },
    [],
  );

  const bodyContent = (() => {
    if (propertiesLoading) {
      return (
        <View style={globalStyles.centeredFull}>
          <ActivityIndicator size="large" color={colors.primary.default} />
          <Text style={[typography.caption, { marginTop: spacing.md }]}>
            Loading properties…
          </Text>
        </View>
      );
    }

    if (propertiesError) {
      return (
        <View style={globalStyles.centeredFull}>
          <Ionicons
            name="warning-outline"
            size={40}
            color={colors.error.default}
          />
          <Text
            style={[
              typography.bodySmall,
              { marginTop: spacing.md, textAlign: "center" },
            ]}
          >
            {propertiesError}
          </Text>
          <TouchableOpacity
            style={[globalStyles.btnPrimary, { marginTop: spacing["3xl"] }]}
            onPress={() => refetchAllMedia()}
          >
            <Text style={typography.buttonPrimary}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (properties.length === 0) {
      return (
        <View style={globalStyles.centeredFull}>
          <Ionicons name="home-outline" size={48} color={colors.text.muted} />
          <Text
            style={[
              typography.h3,
              { marginTop: spacing.xl, color: colors.text.muted },
            ]}
          >
            No properties yet
          </Text>
          <Text
            style={[
              typography.bodySmall,
              { marginTop: spacing.md, textAlign: "center" },
            ]}
          >
            Properties you manage will appear here.
          </Text>
        </View>
      );
    }

    return (
      <>
        <View style={styles.toolbarWrap}>
          <View style={styles.searchInputWrap}>
            <Ionicons
              name="search-outline"
              size={16}
              color={colors.text.muted}
            />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search by property id or address"
              placeholderTextColor={colors.text.muted}
              underlineColorAndroid="transparent"
              selectionColor={colors.primary.default}
              cursorColor={colors.primary.default}
              autoCorrect={false}
              spellCheck={false}
              autoComplete="off"
              textContentType="none"
              importantForAutofill="no"
              style={[
                styles.searchInput,
                Platform.OS === "web"
                  ? ({
                      outlineWidth: 0,
                      outlineStyle: "none",
                      outlineColor: "transparent",
                      boxShadow: "none",
                    } as any)
                  : null,
              ]}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery("")}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Ionicons
                  name="close-circle"
                  size={16}
                  color={colors.text.muted}
                />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.toolbarActionsRow}>
            <View style={styles.filterChipsRow}>
              {(
                [
                  ["ALL", "All"],
                  ["PHOTOS", "Photos"],
                  ["VIDEOS", "Videos"],
                ] as const
              ).map(([value, label]) => {
                const selected = propertyFilter === value;
                return (
                  <TouchableOpacity
                    key={value}
                    style={[
                      styles.filterChip,
                      selected && styles.filterChipActive,
                    ]}
                    onPress={() => setPropertyFilter(value)}
                    activeOpacity={0.86}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        selected && styles.filterChipTextActive,
                      ]}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.sortChipsRow}>
              {(
                [
                  ["NEWEST", "Newest"],
                  ["OLDEST", "Oldest"],
                  ["MOST_PHOTOS", "Most photos"],
                  ["HAS_VIDEOS", "Has videos"],
                ] as const
              ).map(([value, label]) => {
                const selected = sortOption === value;
                return (
                  <TouchableOpacity
                    key={value}
                    style={[styles.sortChip, selected && styles.sortChipActive]}
                    onPress={() => setSortOption(value)}
                    activeOpacity={0.86}
                  >
                    <Text
                      style={[
                        styles.sortChipText,
                        selected && styles.sortChipTextActive,
                      ]}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.expandActionsRow}>
              <TouchableOpacity
                style={styles.expandActionBtn}
                onPress={expandAllVisible}
              >
                <Text style={styles.expandActionText}>Expand all</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.expandActionBtn}
                onPress={collapseAll}
              >
                <Text style={styles.expandActionText}>Collapse all</Text>
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.toolbarHint}>
            Showing {sortedProperties.length} of {displayProperties.length}{" "}
            properties
          </Text>
        </View>

        {sortedProperties.length === 0 ? (
          <View style={globalStyles.centeredFull}>
            <Ionicons
              name="search-outline"
              size={40}
              color={colors.text.muted}
            />
            <Text
              style={[
                typography.h3,
                { marginTop: spacing.lg, color: colors.text.secondary },
              ]}
            >
              No matching properties
            </Text>
            <Text
              style={[
                typography.bodySmall,
                { marginTop: spacing.sm, textAlign: "center" },
              ]}
            >
              Try a different search or filter.
            </Text>
          </View>
        ) : (
          <FlatList
            data={sortedProperties}
            keyExtractor={(p) => String(p.id)}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            ItemSeparatorComponent={listSeparator}
            renderItem={({ item: property }) => (
              <PropertyMediaCardWithDetail
                property={property}
                media={mediaMap[property.id] ?? null}
                isLoading={false}
                isExpanded={expandedIds.has(property.id)}
                onToggle={() => toggleExpand(property.id)}
                onMediaPress={handleMediaPress}
                onDeletePress={handleDeletePress}
                readonly={isClient}
                onAddressResolved={handleAddressResolved}
              />
            )}
          />
        )}
      </>
    );
  })();

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={globalStyles.safeContainer} edges={["top"]}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={colors.background.screen}
      />

      {/* ── Header ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Media Center</Text>
          <Text style={styles.headerSubtitle}>Manage your property media</Text>
        </View>
        <View style={styles.headerStats}>
          <View style={styles.statPill}>
            <Ionicons name="images" size={13} color={colors.primary.default} />
            <Text style={styles.statPillText}>{totalPhotos}</Text>
          </View>
          <View style={[styles.statPill, { marginLeft: spacing.xs }]}>
            <Ionicons name="videocam" size={13} color={colors.purple.default} />
            <Text
              style={[styles.statPillText, { color: colors.purple.default }]}
            >
              {totalVideos}
            </Text>
          </View>
        </View>
      </View>

      {/* ── Body ── */}
      {bodyContent}

      {/* ── Lightbox ── */}
      <ImageLightbox
        visible={lightboxOpen}
        items={lightboxItems}
        startIndex={lightboxIndex}
        onClose={() => setLightboxOpen(false)}
      />

      {/* ── Video player ── */}
      <VideoPlayerModal
        visible={videoOpen}
        item={videoItem}
        onClose={() => setVideoOpen(false)}
      />

      {/* ── Delete confirmation dialog ── */}
      <Modal
        visible={deleteDialogOpen}
        transparent
        animationType="fade"
        onRequestClose={handleDeleteCancel}
      >
        <Pressable style={styles.dialogOverlay} onPress={handleDeleteCancel}>
          <Pressable style={styles.dialogBox} onPress={() => {}}>
            <View style={styles.dialogIconWrap}>
              <Ionicons
                name="trash-outline"
                size={28}
                color={colors.error.default}
              />
            </View>
            <Text style={styles.dialogTitle}>Delete Media?</Text>
            <Text style={styles.dialogBody}>
              This will permanently remove this{" "}
              {deleteTarget?.mediaType === "VIDEO" ? "video" : "photo"} from the
              property. This action cannot be undone.
            </Text>
            <View style={styles.dialogActions}>
              <TouchableOpacity
                style={styles.dialogBtnCancel}
                onPress={handleDeleteCancel}
                disabled={deleteMutation.isPending}
              >
                <Text style={styles.dialogBtnCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.dialogBtnDelete,
                  deleteMutation.isPending && { opacity: 0.6 },
                ]}
                onPress={handleDeleteConfirm}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.dialogBtnDeleteText}>Delete</Text>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
      {userType == "Agent" ? <AgentFooter /> : <ClientFooter />}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // ── Header ────────────────────────────────────────────────────────────────
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing["3xl"],
    paddingVertical: spacing.xl,
    backgroundColor: colors.background.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
    ...shadows.xs,
  },
  headerTitle: {
    ...typography.h1,
  },
  headerSubtitle: {
    ...typography.caption,
    marginTop: 2,
  },
  headerStats: {
    flexDirection: "row",
    alignItems: "center",
  },
  statPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.primary.hover,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  statPillText: {
    ...typography.captionBold,
    color: colors.primary.default,
  },

  // ── List ──────────────────────────────────────────────────────────────────
  toolbarWrap: {
    paddingHorizontal: spacing["3xl"],
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.background.screen,
    gap: spacing.md,
  },
  searchInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.background.surface,
    borderRadius: radius.item,
    paddingHorizontal: spacing.md,
    height: 42,
  },
  searchInput: {
    flex: 1,
    ...typography.bodySmall,
    color: colors.text.primary,
    paddingVertical: 0,
    borderWidth: 0,
    borderTopWidth: 0,
    borderBottomWidth: 0,
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderColor: "transparent",
    borderBottomColor: "transparent",
    borderStyle: "solid",
    backgroundColor: "transparent",
  },
  toolbarActionsRow: {
    gap: spacing.sm,
  },
  filterChipsRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  sortChipsRow: {
    flexDirection: "row",
    gap: spacing.sm,
    flexWrap: "wrap",
  },
  filterChip: {
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.background.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  filterChipActive: {
    borderColor: colors.primary.default,
    backgroundColor: colors.primary.hover,
  },
  filterChipText: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  filterChipTextActive: {
    ...typography.captionBold,
    color: colors.primary.default,
  },
  sortChip: {
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.background.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  sortChipActive: {
    borderColor: colors.purple.default,
    backgroundColor: colors.purple.surface,
  },
  sortChipText: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  sortChipTextActive: {
    ...typography.captionBold,
    color: colors.purple.default,
  },
  expandActionsRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  expandActionBtn: {
    borderRadius: radius.item,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.background.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  expandActionText: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  toolbarHint: {
    ...typography.caption,
    color: colors.text.muted,
  },
  listContent: {
    padding: spacing["3xl"],
    paddingBottom: spacing["9xl"],
  },

  // ── Property card ─────────────────────────────────────────────────────────
  propertyCard: {
    backgroundColor: colors.background.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border.default,
    overflow: "hidden",
    ...shadows.sm,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.xl,
    gap: spacing.xl,
  },

  // Property thumbnail in header
  propThumb: {
    width: 72,
    height: 72,
    borderRadius: radius.item,
    overflow: "hidden",
    backgroundColor: colors.background.subtle,
    position: "relative",
  },
  propThumbPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  priceTag: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(15,23,42,0.72)",
    paddingVertical: 2,
    alignItems: "center",
  },
  priceTagText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 0.4,
  },

  // Property info
  propInfo: {
    flex: 1,
    gap: 3,
  },
  propAddress: {
    ...typography.label,
  },
  propMeta: {
    ...typography.caption,
  },
  propBeds: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginTop: 2,
  },
  propBedsText: {
    fontSize: 11,
    color: colors.text.secondary,
    fontWeight: "500",
  },
  countRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 5,
  },
  countPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: colors.primary.hover,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  countPillVideo: {
    backgroundColor: colors.purple.surface,
  },
  countPillText: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.primary.default,
  },

  // ── Expanded body ─────────────────────────────────────────────────────────
  expandedBody: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border.light,
    marginBottom: spacing.lg,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.lg,
  },
  loadingText: {
    ...typography.caption,
  },
  emptyMedia: {
    alignItems: "center",
    paddingVertical: spacing["4xl"],
    gap: spacing.md,
  },
  emptyMediaText: {
    ...typography.caption,
    color: colors.text.muted,
  },
  sectionLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: spacing.md,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.primary.default,
  },
  thumbGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    paddingBottom: spacing.xs,
  },

  // ── Thumbnail ─────────────────────────────────────────────────────────────
  thumbWrapper: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_RADIUS,
    position: "relative",
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_RADIUS,
    overflow: "hidden",
  },
  thumbOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.12)",
    borderRadius: THUMB_RADIUS,
  },
  thumbPlayBtn: {
    position: "absolute",
    bottom: 6,
    right: 6,
    backgroundColor: "rgba(0,0,0,0.65)",
    borderRadius: radius.full,
    width: 22,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  coverBadge: {
    position: "absolute",
    top: 5,
    left: 5,
    backgroundColor: colors.warning.default,
    borderRadius: radius.full,
    width: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  statusDot: {
    position: "absolute",
    bottom: 6,
    left: 6,
    width: 8,
    height: 8,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: "#fff",
  },

  // ── Status chip ────────────────────────────────────────────────────────────
  statusChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  statusChipText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },

  // ── Lightbox ───────────────────────────────────────────────────────────────
  lightboxBg: {
    flex: 1,
    backgroundColor: "#000",
  },
  lightboxTopBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing["3xl"],
    paddingBottom: spacing.md,
  },
  lightboxCloseBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  lightboxCounter: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  lightboxMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing["3xl"],
    paddingTop: spacing.md,
  },
  lightboxMetaSize: {
    color: colors.palette.slate400,
    fontSize: 12,
    fontWeight: "500",
  },
  lightboxCoverBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  lightboxCoverText: {
    color: colors.warning.default,
    fontSize: 12,
    fontWeight: "600",
  },

  // ── Video modal ────────────────────────────────────────────────────────────
  videoModalBg: {
    flex: 1,
    backgroundColor: "#0a0a0f",
  },
  videoModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing["3xl"],
    paddingBottom: spacing.md,
  },
  videoModalTitle: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
    flex: 1,
    textAlign: "center",
  },
  videoPlayerWrap: {
    flex: 1,
    justifyContent: "center",
  },
  videoPlayer: {
    // dimensions moved to inline style via useWindowDimensions() in VideoPlayerModal
  },
  videoMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing["3xl"],
    paddingTop: spacing.md,
  },

  // ── Media thumb delete button ──────────────────────────────────────────────
  thumbDeleteBtn: {
    position: "absolute",
    top: 5,
    right: 5,
    backgroundColor: "rgba(36, 36, 36, 0.82)",
    borderRadius: radius.full,
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },

  // ── Delete confirmation dialog ─────────────────────────────────────────────
  dialogOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing["3xl"],
  },
  dialogBox: {
    width: "100%",
    backgroundColor: colors.background.surface,
    borderRadius: radius.card,
    padding: spacing["3xl"],
    alignItems: "center",
    ...shadows.lg,
  },
  dialogIconWrap: {
    width: 56,
    height: 56,
    borderRadius: radius.full,
    backgroundColor: colors.error.light,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xl,
  },
  dialogTitle: {
    ...typography.h3,
    marginBottom: spacing.md,
  },
  dialogBody: {
    ...typography.bodySmall,
    color: colors.text.secondary,
    textAlign: "center",
    marginBottom: spacing["3xl"],
  },
  dialogActions: {
    flexDirection: "row",
    gap: spacing.md,
    width: "100%",
  },
  dialogBtnCancel: {
    flex: 1,
    paddingVertical: spacing.lg,
    borderRadius: radius.item,
    borderWidth: 1,
    borderColor: colors.border.default,
    alignItems: "center",
  },
  dialogBtnCancelText: {
    ...typography.buttonSecondary,
  },
  dialogBtnDelete: {
    flex: 1,
    paddingVertical: spacing.lg,
    borderRadius: radius.item,
    backgroundColor: colors.error.default,
    alignItems: "center",
  },
  dialogBtnDeleteText: {
    ...typography.buttonPrimary,
    color: "#fff",
  },

  uploadIconBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.primary.hover,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm,
  },
});
