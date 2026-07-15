import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Mail, MessageCircle } from "lucide-react-native";
import { useNavigation } from "@react-navigation/native";
import { Client } from "../types/client.types";
import { ClientItemStats } from "../hooks/useClientItemStats";
import { ClientBadges } from "./ClientBadges";
import { getInitials } from "../utils/client.utils";
import { colors, radius, spacing } from "../styles/shared.styles";
import { useOpenDirectConversation } from "../../../../hooks/useChat"; // adjust path to match your project
import { useAgentClientNameMap } from "../../../../hooks/useAgentClientNameMap";
import { conversationTitle } from "../../../../lib/chat/display";

interface Props {
  item: Client;
  onPress: (client: Client) => void;
  stats?: ClientItemStats;
  statsLoading?: boolean;
}

export function ClientListItem({ item, onPress, stats, statsLoading }: Props) {
  const navigation = useNavigation<any>();
  const openDirectConversation = useOpenDirectConversation();

  // Derive badge flags from API stats when available, fall back to Client fields
  const totalOffers = stats?.offers.total ?? item.offersCount ?? 0;
  const rejectedOffers = stats?.offers.rejected ?? item.rejectedCount ?? 0;
  const totalTours = stats?.totalTours ?? item.toursCount ?? 0;
  const shortlisted =
    stats?.shortlistedProperties ?? item.shortlistedCount ?? 0;

  const hasActiveOffers =
    (stats?.offers.pending ?? 0) + (stats?.offers.accepted ?? 0) > 0;
  const isInactive = !hasActiveOffers && totalTours <= 1;
  const isBuyer = item.clientType === "buyer";
  const isRenter = item.clientType === "renter";

  const statCells = [
    { label: "Tours", value: totalTours, red: false },
    { label: "Shortlisted", value: shortlisted, red: false },
    { label: "Offers", value: totalOffers, red: false },
    { label: "Rejected", value: rejectedOffers, red: true },
  ];

  // ─── Chat handler ─────────────────────────────────────────────────────────
  const handleOpenChat = async () => {
    try {
      const conversation = await openDirectConversation.mutateAsync(item.id);
      const title =
        `${item.firstName ?? ""} ${item.lastName ?? ""}`.trim() || "Client";
      navigation.navigate("ChatRoom", {
        conversationId: conversation.id,
        otherUserName: title,
      });
    } catch {
      Alert.alert("Unable to open chat", "Please try again in a moment.");
    }
  };

  const isChatLoading = openDirectConversation.isPending;

  return (
    <TouchableOpacity onPress={() => onPress(item)} activeOpacity={0.85}>
      <View style={styles.row}>
        {/* Top: Avatar + Info + Action icons */}
        <View style={styles.rowTop}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {getInitials(item.firstName, item.lastName)}
            </Text>
          </View>

          <View style={styles.info}>
            <Text style={styles.name} numberOfLines={1}>
              {item.firstName} {item.lastName}
            </Text>
            <View style={styles.emailRow}>
              <Mail
                size={11}
                color={colors.textDisabled}
                style={{ marginRight: 3 }}
              />
              <Text style={styles.email} numberOfLines={1}>
                {item.email}
              </Text>
            </View>
            <ClientBadges
              hasActiveOffers={hasActiveOffers}
              isInactive={isInactive}
              isBuyer={isBuyer}
              isRenter={isRenter}
            />
          </View>

          <View style={styles.actions}>
            {/* Stop propagation so the row's onPress doesn't also fire */}
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={(e) => {
                e.stopPropagation();
                handleOpenChat();
              }}
              disabled={isChatLoading}
              activeOpacity={0.7}
            >
              {isChatLoading ? (
                <ActivityIndicator size="small" color={colors.textDisabled} />
              ) : (
                <MessageCircle size={16} color={colors.textDisabled} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Bottom: Stats grid */}
        <View style={styles.statsGrid}>
          {statsLoading ? (
            <View style={styles.statsLoader}>
              <ActivityIndicator size="small" color={colors.textDisabled} />
            </View>
          ) : (
            statCells.map((stat) => (
              <View key={stat.label} style={styles.statCell}>
                <Text style={[styles.statValue, stat.red && styles.statRed]}>
                  {stat.value}
                </Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            ))
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}


const styles = StyleSheet.create({
  row: {
    paddingHorizontal: 14,
    paddingVertical: spacing.md,
    gap: spacing.sm + 2,
  },
  rowTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm + 2,
  },

  avatar: {
    width: 42,
    height: 42,
    borderRadius: radius.pill,
    backgroundColor: colors.bgMuted,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  avatarText: { color: "#475569", fontSize: 14, fontWeight: "600" },

  info: { flex: 1, minWidth: 0, gap: 2 },
  name: { fontSize: 14, fontWeight: "700", color: colors.textPrimary },
  emailRow: { flexDirection: "row", alignItems: "center" },
  email: { fontSize: 11, color: colors.textMuted, flex: 1 },

  actions: { gap: 6, alignItems: "center", flexShrink: 0 },
  iconBtn: {
    width: 30,
    height: 30,
    borderRadius: 7,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.bgPage,
    borderWidth: 1,
    borderColor: colors.border,
  },

  statsGrid: {
    flexDirection: "row",
    backgroundColor: colors.bgPage,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: "hidden",
    minHeight: 44,
  },
  statsLoader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  statCell: {
    flex: 1,
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderRightWidth: 1,
    borderRightColor: colors.borderLight,
  },
  statValue: { fontSize: 14, fontWeight: "700", color: colors.textPrimary },
  statLabel: {
    fontSize: 9,
    color: colors.textDisabled,
    textAlign: "center",
    marginTop: 1,
  },
  statRed: { color: colors.danger },
});
