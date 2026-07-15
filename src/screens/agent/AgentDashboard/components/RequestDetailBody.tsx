import React, { useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { modalStyles } from "../styles/modal";
import type { RequestDetail, ShowingRequest } from "../types";
import {
  propertyRowsFromRequestDetail,
  formatLongDate,
  formatShortMonthDate,
} from "../utils";
import type { UseMutationResult } from "@tanstack/react-query";
import { DateTimePickerModal } from "../../../../components/DateTimePickerModal";
import {
  PURCHASE_TIMELINES,
  TOUR_INTENTS,
  TOUR_PRIORITIES,
  optionLabel,
  parseTourRequestFeedback,
} from "../../../../lib/tourRequestFeedback";

// ─── Props ─────────────────────────────────────────────────────────────────────
export interface RequestDetailBodyProps {
  requestDetail?: RequestDetail;
  requestDetailLoading: boolean;
  selectedRequestListData?: ShowingRequest;
  updateRequestStatus: UseMutationResult<
    unknown,
    unknown,
    {
      requestId: string;
      status: string;
      preferredDate?: string;
      preferredTime?: string;
    }
  >;
  onClose: () => void;
}

// ─── PropertyDetailItem ────────────────────────────────────────────────────────
function PropertyDetailItem({
  prop,
  index,
}: {
  prop: ReturnType<typeof propertyRowsFromRequestDetail>[0];
  index: number;
}) {
  const meta = [
    prop.city,
    prop.propertyType,
    prop.bedrooms !== undefined && `${prop.bedrooms}bd`,
    prop.bathrooms !== undefined && `${prop.bathrooms}ba`,
    prop.price && `$${Number(prop.price).toLocaleString()}`,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <View style={modalStyles.propDetailItem}>
      <View style={modalStyles.propDetailIndex}>
        <Text style={modalStyles.propDetailIndexText}>{index + 1}</Text>
      </View>
      <View style={modalStyles.propDetailInfo}>
        <Text style={modalStyles.propDetailAddress} numberOfLines={1}>
          {prop.address}
        </Text>
        {meta ? <Text style={modalStyles.propDetailMeta}>{meta}</Text> : null}
      </View>
    </View>
  );
}

// ─── RequestDetailBody ─────────────────────────────────────────────────────────
export function RequestDetailBody({
  requestDetail,
  requestDetailLoading,
  selectedRequestListData,
  updateRequestStatus,
  onClose,
}: RequestDetailBodyProps) {
  // ── Local date/time state (editable) ────────────────────────────────────────
  const [pickerVisible, setPickerVisible] = useState(false);
  const [editedDate, setEditedDate] = useState<string | undefined>(undefined);
  const [editedTime, setEditedTime] = useState<string | undefined>(undefined);
  const [dateError, setDateError] = useState(false);

  // Resolved values: prefer local edits, fall back to server data
  const resolvedDate = editedDate ?? requestDetail?.preferredDate ?? "";
  const resolvedTime = editedTime ?? requestDetail?.preferredTime ?? "";

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const hasDateTime = Boolean(resolvedDate);

  const displayDateText = resolvedDate
    ? formatLongDate(resolvedDate)
    : "Tap to select a date";

  const displayTimeText = resolvedTime || "";

  // ── Loading / error states ───────────────────────────────────────────────────
  if (requestDetailLoading) {
    return (
      <View style={modalStyles.modalLoader}>
        <ActivityIndicator size="large" color="#1e40af" />
      </View>
    );
  }

  if (!requestDetail) {
    return (
      <Text style={modalStyles.detailEmpty}>
        Could not load request details.
      </Text>
    );
  }

  const propertyRows = propertyRowsFromRequestDetail(requestDetail);
  const tourFeedback = parseTourRequestFeedback(requestDetail.notes);

  // ── Approve with the (possibly edited) date/time ───────────────────────────
  const handleApprove = () => {
    if (!hasDateTime) {
      setDateError(true);
      return;
    }
    setDateError(false);
    updateRequestStatus.mutate(
      {
        requestId: requestDetail.id,
        status: "approved",
        preferredDate: resolvedDate,
        ...(resolvedTime ? { preferredTime: resolvedTime } : {}),
      },
      { onSuccess: onClose },
    );
  };

  const handleReject = () => {
    updateRequestStatus.mutate(
      { requestId: requestDetail.id, status: "rejected" },
      { onSuccess: onClose },
    );
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Client */}
      <View style={modalStyles.detailSection}>
        <Text style={modalStyles.detailSectionLabel}>CLIENT</Text>
        <View style={modalStyles.detailRow}>
          <Text style={modalStyles.detailIcon}>👤</Text>
          <Text style={modalStyles.detailValue}>
            {requestDetail.clientName?.trim() ||
              selectedRequestListData?.clientName?.trim() ||
              "Unknown Client"}
          </Text>
        </View>
      </View>

      {/* Date & Time — editable */}
      <View style={modalStyles.detailSection}>
        <View style={localStyles.sectionLabelRow}>
          <Text style={modalStyles.detailSectionLabel}>
            PREFERRED DATE &amp; TIME
          </Text>
          {/* Required badge */}
          <View style={localStyles.requiredBadge}>
            <Text style={localStyles.requiredText}>Required</Text>
          </View>
        </View>

        {/* Tappable date/time row */}
        <TouchableOpacity
          style={[
            localStyles.dateTimeRow,
            dateError && localStyles.dateTimeRowError,
          ]}
          onPress={() => {
            setDateError(false);
            setPickerVisible(true);
          }}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Edit preferred date and time"
        >
          {/* Calendar icon */}
          <View
            style={[
              localStyles.calendarIcon,
              !hasDateTime && localStyles.calendarIconEmpty,
            ]}
          >
            <Text style={localStyles.calendarEmoji}>📅</Text>
          </View>

          <View style={localStyles.dateTimeTextGroup}>
            <Text
              style={[
                localStyles.dateText,
                !hasDateTime && localStyles.datePlaceholder,
              ]}
            >
              {displayDateText}
            </Text>
            {resolvedTime ? (
              <Text style={localStyles.timeText}>🕐 {displayTimeText}</Text>
            ) : hasDateTime ? (
              <Text style={localStyles.timePlaceholder}>Tap to add time →</Text>
            ) : null}
          </View>

          {/* Edit chevron */}
          <Text style={localStyles.editChevron}>✏️</Text>
        </TouchableOpacity>

        {/* Validation error */}
        {dateError && (
          <Text style={localStyles.errorText}>
            ⚠️ Please select a date and time before approving.
          </Text>
        )}
      </View>

      {/* Properties */}
      <View style={modalStyles.detailSection}>
        <Text style={modalStyles.detailSectionLabel}>
          PROPERTIES ({propertyRows.length})
        </Text>
        {propertyRows.length > 0 ? (
          propertyRows.map((prop, idx) => (
            <PropertyDetailItem key={prop.id} prop={prop} index={idx} />
          ))
        ) : (
          <Text style={modalStyles.detailEmpty}>No properties listed</Text>
        )}
      </View>

      {/* Client tour interest */}
      {tourFeedback ? (
        <View style={modalStyles.detailSection}>
          <Text style={modalStyles.detailSectionLabel}>
            CLIENT'S TOUR INTEREST
          </Text>
          <View style={localStyles.feedbackSummary}>
            {tourFeedback.intent ? (
              <View style={localStyles.feedbackRow}>
                <Text style={localStyles.feedbackKey}>Main goal</Text>
                <Text style={localStyles.feedbackValue}>
                  {optionLabel(TOUR_INTENTS, tourFeedback.intent)}
                </Text>
              </View>
            ) : null}
            {tourFeedback.timeline ? (
              <View style={localStyles.feedbackRow}>
                <Text style={localStyles.feedbackKey}>Timeline</Text>
                <Text style={localStyles.feedbackValue}>
                  {optionLabel(PURCHASE_TIMELINES, tourFeedback.timeline)}
                </Text>
              </View>
            ) : null}
            {tourFeedback.priorities.length > 0 ? (
              <View style={localStyles.feedbackPriorities}>
                <Text style={localStyles.feedbackKey}>Priorities</Text>
                <View style={localStyles.priorityChips}>
                  {tourFeedback.priorities.map((priority) => (
                    <View style={localStyles.priorityChip} key={priority}>
                      <Text style={localStyles.priorityChipText}>
                        {optionLabel(TOUR_PRIORITIES, priority)}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}
            {tourFeedback.comments ? (
              <View style={localStyles.feedbackComments}>
                <Text style={localStyles.feedbackKey}>Additional context</Text>
                <Text style={localStyles.feedbackCommentText}>
                  {tourFeedback.comments}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      ) : null}

      {/* Requested on */}
      {requestDetail.createdAt && (
        <Text style={modalStyles.requestedOn}>
          Requested on {formatShortMonthDate(requestDetail.createdAt)}
        </Text>
      )}

      {/* Actions */}
      <View style={modalStyles.modalActions}>
        <TouchableOpacity
          style={modalStyles.modalRejectBtn}
          onPress={handleReject}
          disabled={updateRequestStatus.isPending}
        >
          <Text style={modalStyles.modalRejectText}>Reject</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={modalStyles.modalApproveBtn}
          onPress={handleApprove}
          disabled={updateRequestStatus.isPending}
        >
          {updateRequestStatus.isPending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={modalStyles.modalApproveText}>Approve Request</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Date + Time picker (two-step) */}
      <DateTimePickerModal
        visible={pickerVisible}
        initialDate={resolvedDate}
        initialTime={resolvedTime}
        onConfirm={({ date, time }) => {
          setEditedDate(date);
          setEditedTime(time);
          setPickerVisible(false);
        }}
        onDismiss={() => setPickerVisible(false)}
      />
    </>
  );
}

// ─── Local styles (scoped to this file) ───────────────────────────────────────
import { StyleSheet } from "react-native";

const localStyles = StyleSheet.create({
  feedbackSummary: {
    borderWidth: 1,
    borderColor: "#cfe3da",
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#f6faf8",
  },
  feedbackRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 13,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: "#e3eee9",
  },
  feedbackKey: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748b",
    textTransform: "uppercase",
  },
  feedbackValue: {
    flex: 1,
    textAlign: "right",
    fontSize: 13,
    fontWeight: "700",
    color: "#176b55",
  },
  feedbackPriorities: {
    paddingHorizontal: 13,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: "#e3eee9",
  },
  priorityChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8,
  },
  priorityChip: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: "#e1f2ea",
  },
  priorityChipText: { fontSize: 11, fontWeight: "600", color: "#176b55" },
  feedbackComments: { paddingHorizontal: 13, paddingVertical: 11 },
  feedbackCommentText: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
    color: "#475569",
  },
  sectionLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  requiredBadge: {
    backgroundColor: "#fef2f2",
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  requiredText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#ef4444",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  dateTimeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  dateTimeRowError: {
    borderColor: "#ef4444",
    backgroundColor: "#fff5f5",
  },
  calendarIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#eff6ff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  calendarIconEmpty: {
    backgroundColor: "#f1f5f9",
    borderColor: "#cbd5e1",
  },
  calendarEmoji: { fontSize: 18 },
  dateTimeTextGroup: { flex: 1 },
  dateText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0f172a",
  },
  datePlaceholder: {
    color: "#94a3b8",
    fontWeight: "400",
  },
  timeText: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,
  },
  timePlaceholder: {
    fontSize: 11,
    color: "#93c5fd",
    marginTop: 2,
    fontStyle: "italic",
  },
  editChevron: { fontSize: 14 },
  errorText: {
    fontSize: 12,
    color: "#ef4444",
    marginTop: 6,
    fontWeight: "500",
  },
});
