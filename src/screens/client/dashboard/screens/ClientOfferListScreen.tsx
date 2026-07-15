import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  StatusBar,
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  useClientOffers,
  useCatalogProperty,
  ClientOffer,
  ClientOfferStatus,
} from "../../../../lib/clientApi";
import { useAgentOffers, AgentOffer } from "../../../../lib/agentApi";
import {
  colors,
  typography,
  spacing,
  border,
  shadows,
  globalStyles,
} from "@/theme";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useAuth } from "../../../../contexts/AuthContext";
import { ClientFooter } from "../../components/ClientFooter";
import { AgentFooter } from "@/screens/agent/components/AgentFooter";

// ─── Route params ──────────────────────────────────────────────────────────────

interface RouteParams {
  /** Present when navigated from the agent-side ClientProfileScreen. */
  userType?: "Agent" | "Client";
  /** The client whose offers to load (agent view only). */
  clientId?: string;
}

// ─── Unified offer shape ───────────────────────────────────────────────────────

/**
 * Normalised offer used by OfferCard — works for both the client-API
 * shape (ClientOffer) and the agent-API shape (AgentOffer).
 */
interface NormalisedOffer {
  id: string;
  masterPropertyId: number;
  amount: number;
  status: string;
  rejectionReason: string | null;
  submittedAt: string;
  respondedAt: string | null;
  notes: string | null;
  /** Pre-resolved address — available immediately in the agent response. */
  resolvedAddress?: string;
  /** Pre-resolved MLS number — available immediately in the agent response. */
  resolvedMlsNumber?: string;
}

function normaliseClientOffer(o: ClientOffer): NormalisedOffer {
  return {
    id: o.id,
    masterPropertyId: o.masterPropertyId,
    amount: o.amount,
    status: o.status,
    rejectionReason: o.rejectionReason,
    submittedAt: o.submittedAt,
    respondedAt: o.respondedAt,
    notes: o.notes ?? null,
  };
}

function normaliseAgentOffer(o: AgentOffer): NormalisedOffer {
  return {
    id: o.id,
    masterPropertyId: o.masterPropertyId,
    amount: o.amount,
    status: o.status,
    rejectionReason: o.rejectionReason,
    submittedAt: o.submittedAt,
    respondedAt: o.respondedAt,
    notes: o.notes,
    resolvedAddress: o.property?.address,
    resolvedMlsNumber: undefined, // not in agent offer payload
  };
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── Sub-components ────────────────────────────────────────────────────────────

interface OfferCardProps {
  offer: NormalisedOffer;
  agentName: string;
  userType: "Agent" | "Client";
}

function OfferCard({ offer, agentName, userType }: OfferCardProps) {
  const navigation = useNavigation<any>();

  const handleView = (offer: AgentOffer) => {
    navigation.navigate("OfferDetail", { offerId: offer.id });
  };

  // Only fetch the catalog property when the address wasn't already embedded
  // (i.e. client-API path). For agent-API responses the address comes inline.
  const skipCatalogFetch = !!offer.resolvedAddress;
  const { data: property, isLoading: propertyLoading } = useCatalogProperty(
    offer.masterPropertyId,
    { enabled: !skipCatalogFetch },
  );

  const propertyAddress = skipCatalogFetch
    ? offer.resolvedAddress!
    : propertyLoading
      ? "Loading address…"
      : property?.address
        ? `${property.address}`
        : `Property #${offer.masterPropertyId}`;

  const mlsNumber = offer.resolvedMlsNumber ?? property?.mlsNumber ?? "";

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={() =>
        userType === "Agent"
          ? navigation.navigate("OfferDetail", { offerId: offer.id })
          : navigation.navigate("ClientOfferDetails", {
              offerId: offer.id,
              agentName: agentName,
              mlsNumber: mlsNumber,
              propertyAddress: propertyAddress,
              userType: userType,
            })
      }
    >
     <View style={styles.card}>
  {/* Card Header */}
  <View style={styles.propertyAddressBadge}>
    <Text style={styles.propertyAddressValue} numberOfLines={1}>
      {propertyAddress}
    </Text>
  </View>

  {/* Amount + Submitted Row */}
  <View style={styles.amountSubmittedRow}>
    <View style={styles.amountBlock}>
      <Text style={styles.amountLabel}>Offer Amount</Text>
      <Text style={styles.amountValue}>{formatCurrency(offer.amount)}</Text>
    </View>

    <View style={styles.submittedBlock}>
      <Text style={styles.metaLabel}>Submitted</Text>
      <Text style={styles.metaValue}>{formatDate(offer.submittedAt)}</Text>
      <Text style={styles.metaSubvalue}>{formatTime(offer.submittedAt)}</Text>
    </View>
  </View>

  {/* Divider */}
  <View style={styles.divider} />

  {/* Response + Agent Row (client only) */}
  {userType === "Client" && (
    <View style={styles.metaGrid}>
      <View style={[styles.metaItem, styles.MetaLeftItem]}>
        <Text style={styles.metaLabel}>Response</Text>
        {offer.respondedAt ? (
          <>
            <Text style={styles.metaValue}>{formatDate(offer.respondedAt)}</Text>
            <Text style={styles.metaSubvalue}>{formatTime(offer.respondedAt)}</Text>
          </>
        ) : (
          <Text style={styles.metaPending}>Awaiting…</Text>
        )}
      </View>

      <View style={styles.metaDivider} />

      <View style={[styles.metaItem, styles.MetaRightItem]}>
        <Text style={styles.metaLabel}>Agent</Text>
        <Text style={styles.metaValue} numberOfLines={2}>
          {agentName}
        </Text>
      </View>
    </View>
  )}

  {/* Notes */}
  {!!offer.notes && (
    <View style={styles.noteBox}>
      <Text style={styles.noteIcon}>💬</Text>
      <Text style={styles.noteText} numberOfLines={2}>
        {offer.notes}
      </Text>
    </View>
  )}

  {/* Rejection Reason */}
  {!!offer.rejectionReason && (
    <View style={styles.rejectionBox}>
      <Text style={styles.rejectionLabel}>Rejection Reason</Text>
      <Text style={styles.rejectionText}>{offer.rejectionReason}</Text>
    </View>
  )}

  {/* Offer ID Footer */}
  <Text style={styles.offerId} numberOfLines={1}>
    ID: {offer.id}
  </Text>
</View>

    </TouchableOpacity>
  );
}

// ─── Data hooks (branched by userType) ────────────────────────────────────────

function useOffersData(userType: "Agent" | "Client", clientId?: string) {
  // Agent path — uses agent JWT, filters by clientProfileId
  const agentQuery = useAgentOffers(
    { page: 0, size: 50, clientProfileId: clientId },
    { enabled: userType === "Agent" },
  );

  // Client path — uses client JWT (original behaviour)
  const clientQuery = useClientOffers(
    { page: 0, size: 50 },
    { enabled: userType === "Client" },
  );

  if (userType === "Agent") {
    return {
      offers: (agentQuery.data?.content ?? []).map(normaliseAgentOffer),
      isLoading: agentQuery.isLoading,
      isError: agentQuery.isError,
      refetch: agentQuery.refetch,
    };
  }

  return {
    offers: (clientQuery.data?.content ?? []).map(normaliseClientOffer),
    isLoading: clientQuery.isLoading,
    isError: clientQuery.isError,
    refetch: clientQuery.refetch,
  };
}

// ─── Main Screen ───────────────────────────────────────────────────────────────

export default function ClientOfferListScreen() {
  const [refreshing, setRefreshing] = useState(false);

  const route = useRoute<any>();
  const params = (route.params ?? {}) as RouteParams;
  const userType = params.userType ?? "Client";
  const clientId = params.clientId;

  const { user } = useAuth();
  const agentName = user?.agentDetails?.displayName ?? "N/A";

  const { offers, isLoading, isError, refetch } = useOffersData(
    userType,
    clientId,
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  return (
    <>
    <SafeAreaView style={globalStyles.safeContainer}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={colors.background.screen}
      />

      {isLoading ? (
        <View style={globalStyles.centeredFull}>
          <ActivityIndicator size="large" color={colors.primary.default} />
          <Text style={styles.loadingText}>Loading offers…</Text>
        </View>
      ) : isError ? (
        <View style={globalStyles.centeredFull}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorSubtitle}>Unable to load offers.</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
            <Text style={styles.retryBtnText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : offers.length === 0 ? (
        <View style={globalStyles.centeredFull}>
          <Text style={styles.emptyIcon}>📋</Text>
          <Text style={styles.emptyTitle}>No offers found</Text>
          <Text style={styles.emptySubtitle}>
            No offers have been made yet.
          </Text>
        </View>
      ) : (
        <FlatList
          data={offers}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <OfferCard offer={item} agentName={agentName} userType={userType} />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary.default}
            />
          }
        />
      )}
      
    </SafeAreaView>
    {userType === "Agent" ?  <AgentFooter /> : <ClientFooter />}
    </>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // List
  listContent: {
    padding: spacing["3xl"],
    gap: spacing.xl,
    paddingBottom: spacing["9xl"],
  },

  // Card
  card: {
    backgroundColor: colors.background.surface,
    borderRadius: border.radius.card,
    borderWidth: border.width.thin,
    borderColor: colors.border.default,
    padding: spacing["4xl"],
    gap: spacing.xl,
    ...shadows.card,
  },

  // Property Address Badge
  propertyAddressBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.primary.hover,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xxs + 1,
    borderRadius: border.radius.chipSm,
    alignSelf: "flex-start",
    maxWidth: "100%",
  },
  propertyAddressValue: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.primary.default,
    flexShrink: 1,
  },

  // Amount
  amountRow: {
    gap: spacing.xxs,
  },
  amountLabel: {
    ...typography.labelMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  amountValue: {
    fontSize: 26,
    fontWeight: "800",
    color: colors.text.primary,
    lineHeight: 30,
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: colors.border.light,
  },

  // Meta Grid
  metaGrid: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  metaItem: {
    flex: 1,
    gap: spacing.xxs,
  },
  MetaLeftItem: {
    alignItems: "flex-start",
  },
  MetaRightItem: {
    alignItems: "flex-end",
  },
  metaDivider: {
    width: 1,
    height: "100%",
    backgroundColor: colors.border.light,
    marginHorizontal: spacing.md,
  },
  metaLabel: {
    ...typography.labelMuted,
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  metaValue: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.text.primary,
  },
  metaSubvalue: {
    ...typography.caption,
    fontSize: 11,
  },
  metaPending: {
    fontSize: 13,
    fontWeight: "500",
    color: colors.text.muted,
    fontStyle: "italic",
  },

  // Notes
  noteBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    backgroundColor: colors.background.subtle,
    borderRadius: border.radius.btn,
    padding: spacing.xl,
  },
  noteIcon: {
    fontSize: 14,
    marginTop: 1,
  },
  noteText: {
    flex: 1,
    ...typography.bodySmall,
    fontSize: 13,
    lineHeight: 18,
  },

  // Rejection Reason
  rejectionBox: {
    backgroundColor: colors.error.light,
    borderRadius: border.radius.btn,
    padding: spacing.xl,
    gap: spacing.xxs,
  },
  rejectionLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.error.default,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  rejectionText: {
    ...typography.bodySmall,
    color: colors.error.default,
  },

  // Offer ID
  offerId: {
    ...typography.caption,
    fontSize: 10,
    color: colors.text.muted,
  },

  // Loading
  loadingText: {
    ...typography.caption,
    marginTop: spacing.xl,
  },

  // Error
  errorIcon: {
    fontSize: 40,
    marginBottom: spacing.xl,
  },
  errorTitle: {
    ...typography.h3,
    marginBottom: spacing.xs,
  },
  errorSubtitle: {
    ...typography.bodySmall,
    textAlign: "center",
    marginBottom: spacing["3xl"],
  },
  retryBtn: {
    ...globalStyles.btnPrimary,
    paddingHorizontal: spacing["6xl"],
  },
  retryBtnText: {
    ...typography.buttonPrimary,
    fontSize: 14,
  },

  // Empty
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing.xl,
  },
  emptyTitle: {
    ...typography.h3,
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    ...typography.bodySmall,
    textAlign: "center",
    maxWidth: 240,
  },


  amountSubmittedRow: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "flex-start",
},
amountBlock: {
  gap: spacing.xxs,
},
submittedBlock: {
  gap: spacing.xxs,
  alignItems: "flex-end",
},

});
