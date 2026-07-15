import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";
import type { RootStackParamList } from "../../../../navigation/types";
// import { fetchAgentOffer, agentOfferDetailQueryKey, type AgentOffer, type OfferStatus } from '../../../../lib/offersApi';
import {
  fetchAgentOffer,
  agentOfferDetailQueryKey,
  type AgentOffer,
  type OfferStatus,
} from "../../../../lib/offersApi";
import { getApiErrorMessage } from "../../../../lib/apiErrors";
import { colors } from "@/theme";
import { ClientFooter } from "@/screens/client/components/ClientFooter";
import {AgentFooter} from "@/screens/agent/components/AgentFooter";

// ─── Types ─────────────────────────────────────────────────────────────────────
type OfferDetailRouteProp = RouteProp<RootStackParamList, "OfferDetail">;
type OfferDetailNavProp = NativeStackNavigationProp<
  RootStackParamList,
  "OfferDetail"
>;

// ─── Helpers ───────────────────────────────────────────────────────────────────
function formatCurrency(amount: number): string {
  return amount.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

// ─── Status badge ──────────────────────────────────────────────────────────────
const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending: { bg: "#FFF7ED", text: "#C2410C" },
  accepted: { bg: "#F0FDF4", text: "#15803D" },
  rejected: { bg: "#FEF2F2", text: "#B91C1C" },
  withdrawn: { bg: "#F8FAFC", text: "#64748B" },
  countered: { bg: "#EFF6FF", text: "#1D4ED8" },
};

// function StatusBadge({ status }: { status: OfferStatus }) {
//   const { bg, text } = STATUS_COLORS[status] ?? {
//     bg: "#F1F5F9",
//     text: "#475569",
//   };
//   return (
//     <View style={[styles.statusBadge, { backgroundColor: bg }]}>
//       <Text style={[styles.statusText, { color: text }]}>
//         {status.charAt(0).toUpperCase() + status.slice(1)}
//       </Text>
//     </View>
//   );
// }

// ─── Detail Row ────────────────────────────────────────────────────────────────
function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

// ─── Section Card ──────────────────────────────────────────────────────────────
function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

// ─── Main Screen ───────────────────────────────────────────────────────────────
export function OfferDetailScreen() {
  const navigation = useNavigation<OfferDetailNavProp>();
  const route = useRoute<OfferDetailRouteProp>();
  const { offerId } = route.params;

  const {
    data: offer,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<AgentOffer>({
    queryKey: agentOfferDetailQueryKey(offerId),
    queryFn: () => fetchAgentOffer(offerId),
  });

  // ── Loading ────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary.default} />
        <Text style={styles.loadingText}>Loading offer details…</Text>
      </View>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (isError || !offer) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorText}>
          {getApiErrorMessage(error, "Failed to load offer details")}
        </Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
          <Text style={styles.retryBtnText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Content ────────────────────────────────────────────────────────────────
  return (
    <>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero amount card ── */}
        <View style={styles.heroCard}>
          <Text style={styles.heroLabel}>Offer Amount</Text>
          <Text style={styles.heroAmount}>{formatCurrency(offer.amount)}</Text>
          {/* <StatusBadge status={offer.status} /> */}
        </View>

        {/* ── Property & client ── */}
        {/* <SectionCard title="Overview">
        <DetailRow label="Offer ID"         value={offer.id} />
        <DetailRow label="Property"         value={`#${offer.masterPropertyId}`} />
        <DetailRow label="Client"           value={`#${offer.clientProfileId}`} />
        <DetailRow label="Agent"            value={`#${offer.agentId}`} />
      </SectionCard> */}

        <SectionCard title="Overview">
          <DetailRow
            label="Client"
            value={
              offer.clientDisplayName ?? `Client #${offer.clientProfileId}`
            }
          />
          <DetailRow
            label="Property"
            value={
              offer.property?.address ?? `Property #${offer.masterPropertyId}`
            }
          />
          <DetailRow label="Offer ID" value={offer.id} />
        </SectionCard>

        {/* ── Property details (only if present) ── */}
        {offer.property ? (
          <SectionCard title="Property Details">
            <DetailRow label="Address" value={offer.property.address} />
            <DetailRow
              label="Bedrooms"
              value={`${offer.property.bedrooms} bed`}
            />
            <DetailRow
              label="Bathrooms"
              value={`${offer.property.bathrooms} bath`}
            />
            <DetailRow
              label="List Price"
              value={formatCurrency(offer.property.price)}
            />
          </SectionCard>
        ) : null}

        {/* ── Timeline ── */}
        <SectionCard title="Timeline">
          <DetailRow
            label="Submitted"
            value={formatDateTime(offer.submittedAt)}
          />
          <DetailRow
            label="Responded"
            value={formatDateTime(offer.respondedAt)}
          />
        </SectionCard>

        {/* ── Notes (only if present) ── */}
        {offer.notes ? (
          <SectionCard title="Notes">
            <Text style={styles.notesText}>{offer.notes}</Text>
          </SectionCard>
        ) : null}

        {/* ── Rejection reason (only if present) ── */}
        {offer.rejectionReason ? (
          <SectionCard title="Rejection Reason">
            <Text style={styles.rejectionText}>{offer.rejectionReason}</Text>
          </SectionCard>
        ) : null}

        {/* ── Back button ── */}
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.85}
        >
          <Text style={styles.backBtnText}>← Back to Schedule</Text>
        </TouchableOpacity>
      </ScrollView>
      <AgentFooter />
    </>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  content: {
    padding: 16,
    paddingBottom: 40,
    gap: 12,
  },

  // Loading / Error
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: "#64748B",
    marginTop: 8,
  },
  errorIcon: {
    fontSize: 40,
  },
  errorText: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 20,
  },
  retryBtn: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: "#1D4ED8",
    borderRadius: 8,
  },
  retryBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },

  // Hero card
  heroCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 24,
    alignItems: "center",
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  heroLabel: {
    fontSize: 13,
    color: "#94A3B8",
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  heroAmount: {
    fontSize: 36,
    fontWeight: "700",
    color: "#0F172A",
    letterSpacing: -0.5,
  },

  // Status badge
  statusBadge: {
    marginTop: 4,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 13,
    fontWeight: "600",
  },

  // Section card
  sectionCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    gap: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#94A3B8",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 10,
  },

  // Detail row
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  detailLabel: {
    fontSize: 14,
    color: "#64748B",
    fontWeight: "500",
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    color: "#0F172A",
    fontWeight: "500",
    flex: 2,
    textAlign: "right",
  },

  // Notes / rejection
  notesText: {
    fontSize: 14,
    color: "#334155",
    lineHeight: 22,
  },
  rejectionText: {
    fontSize: 14,
    color: "#B91C1C",
    lineHeight: 22,
  },

  // Back button
  backBtn: {
    marginTop: 8,
    alignSelf: "flex-start",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: "#EFF6FF",
  },
  backBtnText: {
    fontSize: 14,
    color: "#1D4ED8",
    fontWeight: "600",
  },
});
