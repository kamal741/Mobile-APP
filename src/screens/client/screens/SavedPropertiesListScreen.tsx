/**
 * SavedPropertiesListScreen.tsx
 *
 * Displays saved (shortlisted) properties.
 *
 * - userType === 'Client'  → fetches via useClientShortlists(); shows unsave heart.
 * - userType === 'Agent'   → fetches via useAgentClientShortlists(clientId);
 *                            each property is fetched fresh via usePropertyDetail(masterPropertyId);
 *                            heart / unsave is hidden.
 *
 * Route params: { userType: 'Client' | 'Agent'; clientId?: string }
 */

import { View, Text, StyleSheet, FlatList, RefreshControl } from "react-native";
import { useRoute } from "@react-navigation/native";
import { PropertyCard } from "../../../components/PropertyCard";
import {
  useClientShortlists,
  useRemoveClientShortlist,
  type ClientShortlist,
} from "../../../lib/clientApi";
import {
  useAgentClientShortlists,
  type AgentClientShortlistItem,
} from "../../../lib/agentApi";
import { usePropertyDetail } from "../../../lib/propertyApi";
import {
  colors,
  typography,
  spacing,
  shadows,
  border,
  globalStyles,
} from "../../../theme";
import { Card, CardContent } from "../../../components/Card";
import { ClientFooter } from "../components/ClientFooter";

// ─── Types ────────────────────────────────────────────────────────────────────

type UserType = "Client" | "Agent";

// ─── Client item ──────────────────────────────────────────────────────────────

interface ClientSavedItemProps {
  shortlist: ClientShortlist;Up
  onUnsave: (masterPropertyId: number) => void;
  isRemoving: boolean;
}

function ClientSavedItem({
  shortlist,
  onUnsave,
  isRemoving,
}: ClientSavedItemProps) {
  const { data: property, isLoading } = usePropertyDetail(
    shortlist.masterPropertyId,
  );

  if (isLoading || !property) {
    return <CardSkeleton />;
  }

  const normalised = {
    id: property.id,
    address: property.address,
    city: property.city,
    province: property.province,
    mlsNumber: property.mlsNumber,
    bedrooms: property.bedrooms,
    bathrooms: property.bathrooms,
    price: property.price,
    area: property.squareFootage ?? 0,
    propertyType: property.propertyType ?? "",
    imageUrl: property.imageUrl,
    photos: property.photos ?? [],
    distanceKm: undefined,
    drivingDistanceKm: undefined,
    drivingDurationSec: undefined,
  };

  return (
    <View style={styles.cardWrapper}>
      <PropertyCard
        property={normalised}
        savedMode={{
          savedAt: shortlist.createdAt,
          mlsNumber: property.mlsNumber,
          onUnsave: () => onUnsave(shortlist.masterPropertyId),
          isRemoving,
        }}
      />
    </View>
  );
}

// ─── Agent item ───────────────────────────────────────────────────────────────

interface AgentSavedItemProps {
  item: AgentClientShortlistItem;
}

function AgentSavedItem({ item }: AgentSavedItemProps) {
  const { data: property, isLoading } = usePropertyDetail(
    item.masterPropertyId,
  );

  if (isLoading || !property) {
    return <CardSkeleton />;
  }

  const normalised = {
    id: property.id,
    address: property.address,
    city: property.city,
    province: property.province,
    mlsNumber: property.mlsNumber,
    bedrooms: property.bedrooms,
    bathrooms: property.bathrooms,
    price: property.price,
    area: property.squareFootage ?? 0,
    propertyType: property.propertyType ?? "",
    imageUrl: property.imageUrl,
    photos: property.photos ?? [],
    distanceKm: undefined,
    drivingDistanceKm: undefined,
    drivingDurationSec: undefined,
  };

  return (
    <View style={styles.cardWrapper}>
      <PropertyCard
        property={normalised}
        savedMode={{
          savedAt: item.createdAt,
          mlsNumber: property.mlsNumber,
        }}
        userType="Agent"
      />
    </View>
  );
}

// ─── Shared skeleton ──────────────────────────────────────────────────────────

function CardSkeleton() {
  return (
    <View style={styles.cardWrapper}>
      <Card style={styles.cardInner}>
        <View style={styles.skeletonPhoto} />
        <CardContent style={styles.cardContent}>
          <View style={styles.skeletonPrice} />
          <View style={styles.skeletonAddress} />
          <View style={styles.skeletonMeta} />
        </CardContent>
      </Card>
    </View>
  );
}

function SkeletonList() {
  return (
    <View style={globalStyles.screenContainer}>
      <View style={styles.listContent}>
        {[1, 2, 3].map((k) => (
          <View key={k} style={{ width: "100%" }}>
            <CardSkeleton />
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Client view ──────────────────────────────────────────────────────────────

function ClientSavedList() {
  const {
    data: shortlists = [],
    isLoading,
    refetch,
    isRefetching,
  } = useClientShortlists();

  const removeShortlist = useRemoveClientShortlist();

  if (isLoading) return <SkeletonList />;

  return (
    <View style={globalStyles.screenContainer}>
      <CountHeader count={shortlists.length} />
      <FlatList
        data={shortlists}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ClientSavedItem
            shortlist={item}
            onUnsave={(id) => removeShortlist.mutate(id)}
            isRemoving={
              removeShortlist.isPending &&
              removeShortlist.variables === item.masterPropertyId
            }
          />
        )}
        contentContainerStyle={[
          styles.listContent,
          shortlists.length === 0 && { flex: 1 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.primary.default}
          />
        }
        ListEmptyComponent={<EmptyState />}
      />
    </View>
  );
}

// ─── Agent view ───────────────────────────────────────────────────────────────

function AgentSavedList({ clientId }: { clientId: string }) {
  const {
    data: items = [],
    isLoading,
    refetch,
    isRefetching,
  } = useAgentClientShortlists(clientId);

  if (isLoading) return <SkeletonList />;

  return (
    <View style={globalStyles.screenContainer}>
      <CountHeader count={items.length} />
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <AgentSavedItem item={item} />}
        contentContainerStyle={[
          styles.listContent,
          items.length === 0 && { flex: 1 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.primary.default}
          />
        }
        ListEmptyComponent={<EmptyState />}
      />
    </View>
  );
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function CountHeader({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <View style={styles.header}>
      <Text style={styles.headerCount}>
        {count} saved {count === 1 ? "property" : "properties"}
      </Text>
    </View>
  );
}

function EmptyState() {
  return (
    <View style={globalStyles.emptyState}>
      <Text style={styles.emptyIcon}>🤍</Text>
      <Text style={styles.emptyTitle}>No Saved Properties</Text>
      <Text style={styles.emptySubtitle}>
        Tap the heart icon on any property to save it here.
      </Text>
    </View>
  );
}

// ─── Screen entry point ───────────────────────────────────────────────────────

export function SavedPropertiesListScreen() {
  const route = useRoute<any>();
  const userType = (route.params?.userType ?? "Client") as UserType;
  const clientId = route.params?.clientId as string | undefined;

  if (userType === "Agent" && clientId) {
    return (
      <>
        <AgentSavedList clientId={clientId} />
        <ClientFooter />
      </>
    );
  }

  return (
    <>
      <ClientSavedList />
      <ClientFooter />
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.background.surface,
    paddingHorizontal: spacing["3xl"],
    paddingVertical: spacing.lg,
    borderBottomWidth: border.width.thin,
    borderBottomColor: colors.border.default,
  },
  headerCount: {
    ...typography.caption,
    color: colors.text.secondary,
    fontWeight: "600",
  },

  listContent: {
    padding: spacing["3xl"],
    gap: spacing["3xl"],
    paddingBottom: 100,
  },

  cardWrapper: {
    width: "100%",
  },
  cardInner: {
    marginBottom: 0,
    overflow: "hidden",
    backgroundColor: colors.background.surface,
    borderRadius: border.radius.card,
    borderWidth: border.width.thin,
    borderColor: colors.border.default,
    ...shadows.sm,
  },
  cardContent: {
    padding: spacing["3xl"],
  },

  skeletonPhoto: {
    height: 160,
    backgroundColor: colors.border.light,
  },
  skeletonPrice: {
    height: 20,
    width: "50%",
    borderRadius: border.radius.chipSm,
    backgroundColor: colors.border.default,
    marginBottom: spacing.md,
  },
  skeletonAddress: {
    height: 14,
    width: "80%",
    borderRadius: border.radius.chipSm,
    backgroundColor: colors.border.light,
    marginBottom: spacing.md,
  },
  skeletonMeta: {
    height: 32,
    borderRadius: border.radius.item,
    backgroundColor: colors.border.light,
  },

  emptyIcon: {
    fontSize: 52,
  },
  emptyTitle: {
    ...typography.h2,
    color: colors.text.primary,
  },
  emptySubtitle: {
    ...typography.bodySmall,
    textAlign: "center",
    color: colors.text.secondary,
    maxWidth: 260,
  },
});
