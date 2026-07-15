import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useRoute, RouteProp } from "@react-navigation/native";
import { useClientRatingsSummary } from "../../../../lib/clientApi";
import type { ClientRating } from "../../../../lib/clientApi";
import { colors } from "../../../../theme/colors";
import { spacing } from "../../../../theme/spacing";
import { border } from "../../../../theme/border";
import { ClientFooter } from "../../components/ClientFooter";
import { PropertyRatingCard } from "../components/PropertyRatingCard";

// ─── Tab config ───────────────────────────────────────────────────────────────

type TabKey = "all" | "liked" | "rejected";

const TABS: { key: TabKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "liked", label: "Liked" },
  { key: "rejected", label: "Rejected" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isLiked(r: ClientRating) {
  return (
    r.feedbackCategory === "offer_now" || r.feedbackCategory === "hold_later"
  );
}

function isRejected(r: ClientRating) {
  return r.feedbackCategory === "reject";
}

// ─── Route params ────────────────────────────────────────────────────────────

type PropertyRatingsRouteParams = {
  PropertyRatings: { initialTab?: TabKey };
};

export function PropertyRatingsScreen() {
  const route =
    useRoute<RouteProp<PropertyRatingsRouteParams, "PropertyRatings">>();
  const initialTab: TabKey = route.params?.initialTab ?? "all";
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);

  const {
    data: summary,
    isLoading,
    refetch,
    isRefetching,
  } = useClientRatingsSummary();

  const ratings: ClientRating[] = summary?.ratings ?? [];
  const unreviewedTours = summary?.unreviewedCompletedTours ?? [];

  // Deduplicate unreviewed by masterPropertyId, excluding already-rated ones
  const ratedPropertyIds = new Set(ratings.map((r) => r.masterPropertyId));
  const uniqueUnreviewed = unreviewedTours.filter(
    (u, idx, arr) =>
      !ratedPropertyIds.has(u.masterPropertyId) &&
      arr.findIndex((x) => x.masterPropertyId === u.masterPropertyId) === idx,
  );

  const filteredRatings = ratings.filter((r) => {
    if (activeTab === "liked") return isLiked(r);
    if (activeTab === "rejected") return isRejected(r);
    return true;
  });

  // Sort newest first
  const sortedRatings = [...filteredRatings].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  // ── Tab counts ──────────────────────────────────────────────────────────────
  const counts: Record<TabKey, number> = {
    all: ratings.length + uniqueUnreviewed.length,
    liked: ratings.filter(isLiked).length,
    rejected: ratings.filter(isRejected).length,
  };

  // ── Combined list items for "all" tab ────────────────────────────────────────
  type ListItem =
    | { kind: "rated"; data: ClientRating }
    | {
        kind: "unreviewed";
        masterPropertyId: number;
        tourId: string;
        key: string;
      }
    | { kind: "section"; label: string; key: string };

  const allTabItems: ListItem[] =
    activeTab === "all"
      ? [
          ...sortedRatings.map((r) => ({ kind: "rated" as const, data: r })),
          ...(uniqueUnreviewed.length > 0
            ? [
                {
                  kind: "section" as const,
                  label: "Awaiting Review",
                  key: "section-unreviewed",
                },
                ...uniqueUnreviewed.map((u) => ({
                  kind: "unreviewed" as const,
                  masterPropertyId: u.masterPropertyId,
                  tourId: String(u.tourId),
                  key: `unreviewed-${u.masterPropertyId}`,
                })),
              ]
            : []),
        ]
      : sortedRatings.map((r) => ({ kind: "rated" as const, data: r }));

  return (
    <View style={styles.container}>
      {/* Tabs */}
      <View style={styles.tabContainer}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
            activeOpacity={0.7}
          >
            <View style={styles.tabLabelRow}>
              <Text
                style={[
                  styles.tabText,
                  activeTab === tab.key && styles.tabTextActive,
                ]}
              >
                {tab.label}
              </Text>
              {counts[tab.key] > 0 && (
                <View
                  style={[
                    styles.tabBadge,
                    activeTab === tab.key
                      ? styles.tabBadgeActive
                      : styles.tabBadgeInactive,
                  ]}
                >
                  <Text
                    style={[
                      styles.tabBadgeText,
                      activeTab === tab.key && styles.tabBadgeTextActive,
                    ]}
                  >
                    {counts[tab.key]}
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary.default} />
          <Text style={styles.loadingText}>Loading ratings…</Text>
        </View>
      ) : (
        <FlatList
          data={allTabItems}
          keyExtractor={(item) =>
            item.kind === "rated"
              ? item.data.id
              : item.kind === "section"
                ? item.key
                : item.key
          }
          renderItem={({ item }) => {
            if (item.kind === "section") {
              return (
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionHeaderText}>{item.label}</Text>
                  <View style={styles.sectionHeaderBadge}>
                    <Text style={styles.sectionHeaderBadgeText}>
                      {uniqueUnreviewed.length}
                    </Text>
                  </View>
                </View>
              );
            }
            if (item.kind === "unreviewed") {
              return (
                <PropertyRatingCard
                  masterPropertyId={item.masterPropertyId}
                  tourId={item.tourId}
                />
              );
            }
            return (
              <PropertyRatingCard
                masterPropertyId={item.data.masterPropertyId}
                tourId={String(item.data.tourId)}
                initialRating={item.data}
              />
            );
          }}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={onRefresh}
              tintColor={colors.primary.default}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>
                {activeTab === "liked"
                  ? "❤️"
                  : activeTab === "rejected"
                    ? "🚫"
                    : "🏠"}
              </Text>
              <Text style={styles.emptyTitle}>
                {activeTab === "liked"
                  ? "No Liked Properties"
                  : activeTab === "rejected"
                    ? "No Rejected Properties"
                    : "No Ratings Yet"}
              </Text>
              <Text style={styles.emptyText}>
                {activeTab === "liked"
                  ? "Properties you like will appear here"
                  : activeTab === "rejected"
                    ? "Properties you reject will appear here"
                    : "Rate properties after your tours to see them here"}
              </Text>
            </View>
          }
        />
      )}
      <ClientFooter />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f1f5f9",
  },

  // ── Tabs ─────────────────────────────────────────────────────────────────────
  tabContainer: {
    flexDirection: "row",
    backgroundColor: colors.background.surface,
    borderBottomWidth: border.width.thin,
    borderBottomColor: colors.border.default,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing["3xl"],
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: {
    borderBottomColor: colors.primary.default,
  },
  tabLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.text.secondary,
  },
  tabTextActive: {
    color: colors.primary.default,
    fontWeight: "600",
  },
  tabBadge: {
    borderRadius: border.radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 1,
    minWidth: 20,
    alignItems: "center",
  },
  tabBadgeActive: { backgroundColor: colors.primary.default },
  tabBadgeInactive: { backgroundColor: colors.background.badge },
  tabBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.text.secondary,
  },
  tabBadgeTextActive: { color: colors.text.inverse },

  // ── List ─────────────────────────────────────────────────────────────────────
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 60,
  },

  // ── Loading ───────────────────────────────────────────────────────────────────
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xl,
  },
  loadingText: {
    fontSize: 14,
    color: colors.text.secondary,
  },

  // ── Empty state ───────────────────────────────────────────────────────────────
  emptyContainer: {
    alignItems: "center",
    paddingTop: 72,
    paddingHorizontal: spacing["5xl"],
  },
  emptyIcon: {
    fontSize: 52,
    marginBottom: spacing["3xl"],
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text.primary,
    textAlign: "center",
  },
  emptyText: {
    fontSize: 14,
    color: colors.text.secondary,
    marginTop: spacing.xs,
    textAlign: "center",
    lineHeight: 20,
  },

  // ── Section header ────────────────────────────────────────────────────────────
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: 12,
    marginTop: 4,
  },
  sectionHeaderText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.text.muted,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  sectionHeaderBadge: {
    backgroundColor: "#e2e8f0",
    borderRadius: border.radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 22,
    alignItems: "center",
  },
  sectionHeaderBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748b",
  },
});
