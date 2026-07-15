import React from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import Svg, { Path } from "react-native-svg";
import { queryClient } from "../../../../lib/queryClient";
import { API_GLOBAL_PATHS } from "../../../../lib/apiGlobalPaths";
import { pendingStyles } from "../styles/pending";
import type { ShowingRequest } from "../types";
import { formatShortDate } from "../utils";
import { useNavigation } from "@react-navigation/native";
import { NormalButton } from "@/components/common/ST_Buttons";

// ─── Props ─────────────────────────────────────────────────────────────────────
interface Props {
  isNarrow: boolean;
  pendingOnly: ShowingRequest[];
  onSelectRequest: (id: string) => void;
}

// ─── RequestItem ───────────────────────────────────────────────────────────────
function RequestItem({
  request,
  onPress,
}: {
  request: ShowingRequest;
  onPress: () => void;
}) {
  const label = request.propertyAddress
    ? request.propertyAddress
    : `Request #${request.id.slice(0, 8)}`;
  const extraCount =
    (request.propertyCount ?? 0) > 1
      ? ` +${(request.propertyCount ?? 0) - 1} more`
      : "";

  const submittedDate = request.submittedAt ?? request.createdAt;

  return (
    <TouchableOpacity onPress={onPress} >
    <View style={pendingStyles.requestItem}>
      <View style={pendingStyles.requestAccent} />
      <View style={pendingStyles.requestBody}>
        <Text style={pendingStyles.requestId} numberOfLines={1}>
          {label}
          {extraCount}
        </Text>
        <Text style={pendingStyles.requestClient} numberOfLines={1}>
          from {request.clientName?.trim() || "Client"}
        </Text>
        <Text style={pendingStyles.requestDate} numberOfLines={1}>
          Submitted:{" "}
          {submittedDate ? formatShortDate(submittedDate) : "No Date"}
        </Text>
        <Text style={pendingStyles.requestDate} numberOfLines={1}>
          {/* Note: {request.notes?.trim() || 'No Note'} */}
        </Text>
        {request.preferredDate && (
          <Text style={pendingStyles.requestDate} numberOfLines={1}>
            Preferred: {formatShortDate(request.preferredDate)}
          </Text>
        )}
      </View>
      {/* ── View Button ── */}
      <View style={{ justifyContent: "center", paddingLeft: 8, marginRight: 8 }}>
        <NormalButton
          label="View"
          variant="primary"
          size="sm"
          fullWidth={false}
          onPress={onPress}
        />
      </View>

    </View>
    </TouchableOpacity>
  );
}

// ─── PendingRequestsPanel ──────────────────────────────────────────────────────
export const PendingRequestsPanel = React.forwardRef<View, Props>(
  function PendingRequestsPanel(
    { isNarrow, pendingOnly, onSelectRequest },
    ref,
  ) {
    const navigation = useNavigation<any>();

    const onRefresh = () =>
      queryClient.invalidateQueries({
        queryKey: [API_GLOBAL_PATHS.agentShowingRequests],
      });

    // Dynamic height: show all items if <= 2, otherwise limit height for scrolling.
    // NOTE: pendingPanel has a baked-in minHeight (400). On Android, a maxHeight
    // smaller than that minHeight (e.g. 300) creates a min/max conflict that
    // Android resolves by letting the panel grow to fit content instead of
    // clipping it — which is what breaks ScrollView scrolling. So whenever we
    // cap the height, we must also override minHeight to match/clear it.
    const dynamicHeight = pendingOnly.length > 2 ? 300 : undefined;

    return (
      <View
        ref={ref}
        style={[
          pendingStyles.pendingPanel,
          isNarrow && { width: "100%" },
          dynamicHeight !== undefined && {
            maxHeight: dynamicHeight,
            minHeight: dynamicHeight,
          },
        ]}
      >
        {/* Header */}
        <View style={pendingStyles.pendingHeader}>
          <Text style={pendingStyles.pendingTitle}>Pending Requests</Text>
          <View style={pendingStyles.pendingHeaderRight}>
            <TouchableOpacity
              onPress={onRefresh}
              style={pendingStyles.refreshIconBtn}
              activeOpacity={0.7}
            >
              <Svg
                width={20}
                height={20}
                viewBox="0 0 24 24"
                fill="none"
                stroke="#64748b"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <Path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                <Path d="M21 3v5h-5" />
                <Path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                <Path d="M8 16H3v5" />
              </Svg>
            </TouchableOpacity>
            {pendingOnly.length > 0 && (
              <View style={pendingStyles.pendingCountBadge}>
                <Text style={pendingStyles.pendingCountText}>
                  {pendingOnly.length}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Scrollable Items — wrapper View is required so ScrollView has a bounded height */}
        <View style={pendingStyles.requestsScrollWrapper}>
          {pendingOnly.length > 0 ? (
            <ScrollView
              style={pendingStyles.requestsScroll}
              contentContainerStyle={pendingStyles.requestsScrollContent}
              showsVerticalScrollIndicator
              nestedScrollEnabled
              persistentScrollbar
            >
              {pendingOnly.map((request) => (
                <RequestItem
                  key={request.id}
                  request={request}
                  onPress={() =>
                    navigation.navigate("RoutePlanning", {
                      showingRequestId: request.id,
                    })
                  }
                />
              ))}
            </ScrollView>
          ) : (
            <Text style={pendingStyles.noPendingText}>No pending requests</Text>
          )}
        </View>
      </View>
    );
  },
);

