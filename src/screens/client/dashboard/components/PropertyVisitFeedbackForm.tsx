import { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  StyleSheet,
  StatusBar,
  Platform,
  ActivityIndicator,
  Switch,
  Dimensions,
} from "react-native";
import {
  useCreateClientRating,
  useUpdateClientRating,
  clientQueryKeys,
  type ClientRating,
  type ClientRatingFeedbackCategory,
  type RatingChecklist,
} from "../../../../lib/clientApi";
import { queryClient } from "../../../../lib/queryClient";



const SCREEN_HEIGHT = Dimensions.get("window").height;

// ─── Types ───────────────────────────────────────────────────────────────────

interface PropertyInfo {
  address: string;
  beds: number;
  baths: number;
  price: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  property: PropertyInfo;
  masterPropertyId: number;
  tourId: string;
  /** When provided the form pre-fills and switches to "update" mode */
  existingRating?: ClientRating;
  /** Called after a successful create or update */
  onSaved?: (rating: ClientRating) => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MUST_HAVE_ITEMS = [
  { key: "budgetWithinRange",    label: "Budget within range" },
  { key: "preferredArea",        label: "Located in preferred area" },
  { key: "minimumBedroomsMet",   label: "Minimum bedrooms met" },
  { key: "requiredBathroomsMet", label: "Required bathrooms met" },
  { key: "basement",             label: "Basement requirement met" },
  { key: "school",               label: "School rating met" },
];

const IMPORTANT_ITEMS = [
  { key: "parkingRequirementMet",  label: "Parking requirement met" },
  { key: "backyardRequirementMet", label: "Backyard requirement met" },
  { key: "interior_size",          label: "Interior size acceptable" },
  { key: "lot_size",               label: "Lot size acceptable" },
];

const REJECTION_REASONS = [
  "Price too high",
  "Area not suitable",
  "Property too small",
  "Layout not suitable",
  "Basement not suitable",
  "Parking not enough",
  "School rating too low",
  "Property too old",
  "Did not feel right",
];



// UI decision → API category (used in buildPayload)
const DECISION_TO_CATEGORY: Record<Decision, ClientRatingFeedbackCategory> = {
  offer:          "offer_now",
  future:         "hold_later",
  not_interested: "reject",     // ✅ sends "reject" to API
};

// API category → UI decision (used when pre-filling from existingRating)
const CATEGORY_TO_DECISION: Record<ClientRatingFeedbackCategory, Decision> = {
  offer_now:      "offer",
  hold_later:     "future",
  reject:         "not_interested", 
};

type Decision = "offer" | "future" | "not_interested";

// ─── Decision option styles ───────────────────────────────────────────────────

const DECISIONS = [
  {
    value: "offer" as const,
    label: "📝  Make an Offer",
    sublabel: "Ready to move forward",
    activeStyle: { borderColor: "#10b981", backgroundColor: "#ecfdf5" } as const,
    activeTextStyle: { color: "#065f46" } as const,
    dot: "#10b981",
  },
  {
    value: "future" as const,
    label: "⏳  Keep for Later",
    sublabel: "Maybe in the future",
    activeStyle: { borderColor: "#f59e0b", backgroundColor: "#fffbeb" } as const,
    activeTextStyle: { color: "#92400e" } as const,
    dot: "#f59e0b",
  },
  {
    value: "not_interested" as const,
    label: "❌  Not Interested",
    sublabel: "This one's not for me",
    activeStyle: { borderColor: "#ef4444", backgroundColor: "#fef2f2" } as const,
    activeTextStyle: { color: "#991b1b" } as const,
    dot: "#ef4444",
  },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function Divider() {
  return <View style={styles.divider} />;
}

function SectionHeader({
  step,
  title,
  allSelected,
  onSelectAll,
  switchColor,
}: {
  step: number;
  title: string;
  allSelected?: boolean;
  onSelectAll?: (value: boolean) => void;
  switchColor?: string;
}) {
  return (
    <View style={[styles.sectionHeader, onSelectAll != null && styles.sectionHeaderRow]}>
      <View style={styles.sectionHeaderLeft}>
        <View style={styles.stepBadge}>
          <Text style={styles.stepBadgeText}>{step}</Text>
        </View>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {onSelectAll != null && (
        <View style={styles.sectionHeaderSwitch}>
          <Text style={styles.selectAllLabel}>
            {allSelected ? "Deselect All" : "Select All"}
          </Text>
          <Switch
            value={allSelected ?? false}
            onValueChange={onSelectAll}
            trackColor={{ false: "#e2e8f0", true: switchColor ?? "#6366f1" }}
            thumbColor="#ffffff"
            ios_backgroundColor="#e2e8f0"
          />
        </View>
      )}
    </View>
  );
}

function StarRating({ rating, onRate }: { rating: number; onRate: (r: number) => void }) {
  const labels = ["", "Poor", "Fair", "Good", "Great", "Excellent"];
  return (
    <View>
      <View style={styles.starsRow}>
        {[1, 2, 3, 4, 5].map((s) => (
          <TouchableOpacity key={s} onPress={() => onRate(s)} activeOpacity={0.7} style={styles.starBtn}>
            <Text style={[styles.star, s <= rating && styles.starActive]}>★</Text>
          </TouchableOpacity>
        ))}
      </View>
      {rating > 0 && (
        <Text style={styles.ratingLabel}>
          {rating}/5 — {labels[rating]}
        </Text>
      )}
    </View>
  );
}

function CheckRow({
  label,
  checked,
  onToggle,
  accent,
}: {
  label: string;
  checked: boolean;
  onToggle: () => void;
  accent?: string;
}) {
  return (
    <TouchableOpacity
      onPress={onToggle}
      activeOpacity={0.75}
      style={[styles.checkRow, checked && { borderColor: accent ?? "#6366f1", backgroundColor: "#f5f3ff" }]}
    >
      <View style={[styles.checkbox, checked && { backgroundColor: accent ?? "#6366f1", borderColor: accent ?? "#6366f1" }]}>
        {checked && <Text style={styles.checkmark}>✓</Text>}
      </View>
      <Text style={[styles.checkLabel, checked && { color: "#1e1b4b", fontWeight: "600" }]}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildInitialState(existingRating?: ClientRating) {
  if (!existingRating) {
    return {
      rating: 0,
      mustHaveChecks: {} as Record<string, boolean>,
      importantChecks: {} as Record<string, boolean>,
      decision: null as Decision | null,
      rejectionReasons: [] as string[],
      otherReason: "",
      reason: "Testing",
      notes: "",
      liked: "",
      disliked: "",
    };
  }

  const fb = existingRating.feedback ?? {};
  const checklist: RatingChecklist = fb.checklist ?? {};

  // Flatten checklist into mustHave / important maps
  const mustHaveChecks: Record<string, boolean> = {};
  for (const [k, v] of Object.entries(checklist.mustHave ?? {})) {
    mustHaveChecks[k] = Boolean(v);
  }

  const importantChecks: Record<string, boolean> = {};
  for (const [k, v] of Object.entries(checklist.importantPreferences ?? {})) {
    importantChecks[k] = Boolean(v);
  }

  // Map feedbackCategory → local decision value
 const decision: Decision | null = existingRating.feedbackCategory
  ? (CATEGORY_TO_DECISION[existingRating.feedbackCategory] ?? null)
  : null;

  // Rejection reasons: stored as array in feedback.rejectionReasons
  const rejectionReasons: string[] = Array.isArray(fb.rejectionReasons)
    ? (fb.rejectionReasons as string[])
    : [];

  // "other" reason: anything in rejectionReasons not in the preset list
  const knownReasons = new Set(REJECTION_REASONS);
  const otherReason = rejectionReasons
    .filter((r) => !knownReasons.has(r))
    .join(", ");

  const filteredRejectionReasons = rejectionReasons.filter((r) => knownReasons.has(r));

  return {
    rating: existingRating.rating ?? 0,
    mustHaveChecks,
    importantChecks,
    decision,
    rejectionReasons: filteredRejectionReasons,
    otherReason,
    reason: existingRating.reason ?? "Testing",
    notes: existingRating.notes ?? "",
    liked: typeof fb.liked === "string" ? fb.liked : "",
    disliked: typeof fb.disliked === "string" ? fb.disliked : "",
  };
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function PropertyVisitFeedbackForm({
  open,
  onClose,
  property,
  masterPropertyId,
  tourId,
  existingRating,
  onSaved,
}: Props) {
  const isEditing = existingRating != null;

  // ── State — initialise from existingRating when present ──────────────────
  const [rating, setRating] = useState(0);
  const [mustHaveChecks, setMustHaveChecks] = useState<Record<string, boolean>>({});
  const [importantChecks, setImportantChecks] = useState<Record<string, boolean>>({});
  const [decision, setDecision] = useState<Decision | null>(null);
  const [rejectionReasons, setRejectionReasons] = useState<string[]>([]);
  const [otherReason, setOtherReason] = useState("");
  const [liked, setLiked] = useState("");
  const [disliked, setDisliked] = useState("");

  // Re-hydrate whenever the modal opens or existingRating changes
  useEffect(() => {
    if (open) {
      const s = buildInitialState(existingRating);
      setRating(s.rating);
      setMustHaveChecks(s.mustHaveChecks);
      setImportantChecks(s.importantChecks);
      setDecision(s.decision);
      setRejectionReasons(s.rejectionReasons);
      setOtherReason(s.otherReason);
      setLiked(s.liked);
      setDisliked(s.disliked);
    }
  }, [open, existingRating]);

  // ── Mutations ─────────────────────────────────────────────────────────────
  const createMutation = useCreateClientRating();
  const updateMutation = useUpdateClientRating(existingRating?.id ?? "");

  const isSaving = createMutation.isPending || updateMutation.isPending;

  // ── Helpers ───────────────────────────────────────────────────────────────
  const toggleRejection = (reason: string) => {
    setRejectionReasons((prev) =>
      prev.includes(reason) ? prev.filter((r) => r !== reason) : [...prev, reason]
    );
  };

  const buildPayload = () => {
    // Combine preset + free-text rejection reasons
    const allRejectionReasons = [
      ...rejectionReasons,
      ...(otherReason.trim() ? [otherReason.trim()] : []),
    ];

     // Map UI decision → feedback.decision value sent to API
const feedbackDecision: string | undefined =
  decision === "not_interested" ? "reject"
  : decision === "future"       ? "hold_later"
  : decision ?? undefined; 

    return {
      masterPropertyId,
      tourId,
      rating,
      reason: "Testing",
      feedbackCategory: DECISION_TO_CATEGORY[decision!],
      feedback: {
        checklist: {
          mustHave: mustHaveChecks,
          importantPreferences: importantChecks,
        },
        decision: feedbackDecision,
        rejectionReasons: allRejectionReasons,
        liked,
        disliked,
      },
    };
  };

  const handleSubmit = () => {
    if (!canSubmit || isSaving) return;
    const payload = buildPayload();

    if (isEditing && existingRating?.id) {
      updateMutation.mutate(payload, {
        onSuccess: (saved) => {
          void queryClient.invalidateQueries({ queryKey: clientQueryKeys.stats });
          onSaved?.(saved);
          onClose();
        },
      });
    } else {
      createMutation.mutate(payload, {
        onSuccess: (saved) => {
          void queryClient.invalidateQueries({ queryKey: clientQueryKeys.stats });
          onSaved?.(saved);
          onClose();
        },
      });
    }
  };

  const canSubmit = rating > 0 && decision !== null;
  const likedStep = decision === "not_interested" ? 5 : 4;
  const dislikedStep = decision === "not_interested" ? 6 : 5;

return (
  <Modal
    visible={open}
    animationType="slide"
    transparent
    onRequestClose={onClose}
    statusBarTranslucent
    hardwareAccelerated
  >
    <View style={styles.overlay}>
      <View style={styles.sheet}>
          {/* ── Header ── */}
          <View style={styles.sheetHeader}>
            <View style={styles.dragHandle} />
            <View style={styles.sheetHeaderRow}>
              <View style={{ flex: 1 }}>
                <View style={styles.titleRow}>
                  <Text style={styles.sheetTitle}>
                    {isEditing ? "Edit Feedback" : "Property Feedback"}
                  </Text>
                  {isEditing && (
                    <View style={styles.editBadge}>
                      <Text style={styles.editBadgeText}>✏️ Editing</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.sheetSub}>
                  {isEditing
                    ? "Update your feedback for this property"
                    : "Help us find your perfect home"}
                </Text>
              </View>
              <TouchableOpacity
                onPress={onClose}
                style={styles.closeBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* ── Property card ── */}
            <View style={styles.propertyCard}>
              <View style={styles.propertyIcon}>
                <Text style={styles.propertyIconText}>🏠</Text>
              </View>
              <View style={styles.propertyInfo}>
                <Text style={styles.propertyAddress} numberOfLines={2}>
                  {property.address}
                </Text>
                <Text style={styles.propertyMeta}>
                  {property.beds} Bed · {property.baths} Bath · {property.price}
                </Text>
              </View>
            </View>

            <Divider />

            {/* ── Section 1 – Rating ── */}
            <SectionHeader step={1} title="Overall Rating" />
            <Text style={styles.helper}>How would you rate this property overall?</Text>
            <StarRating rating={rating} onRate={setRating} />

            <Divider />

            {/* ── Section 2 – Requirements ── */}
            <SectionHeader step={2} title="Requirements Check" />

            <View style={styles.groupLabelRow}>
              <Text style={styles.groupLabel}>MUST HAVE</Text>
              <View style={styles.groupSwitch}>
                <Text style={styles.selectAllLabelSmall}>
                  {MUST_HAVE_ITEMS.every((i) => !!mustHaveChecks[i.key]) ? "Deselect All" : "Select All"}
                </Text>
                <Switch
                  value={MUST_HAVE_ITEMS.every((i) => !!mustHaveChecks[i.key])}
                  onValueChange={(val) => {
                    const next: Record<string, boolean> = {};
                    MUST_HAVE_ITEMS.forEach((i) => { next[i.key] = val; });
                    setMustHaveChecks(next);
                  }}
                  trackColor={{ false: "#e2e8f0", true: "#6366f1" }}
                  thumbColor="#ffffff"
                  ios_backgroundColor="#e2e8f0"
                />
              </View>
            </View>
            {MUST_HAVE_ITEMS.map((item) => (
              <CheckRow
                key={item.key}
                label={item.label}
                checked={!!mustHaveChecks[item.key]}
                onToggle={() =>
                  setMustHaveChecks((p) => ({ ...p, [item.key]: !p[item.key] }))
                }
                accent="#6366f1"
              />
            ))}

            <View style={[styles.groupLabelRow, { marginTop: 14 }]}>
              <Text style={styles.groupLabel}>IMPORTANT PREFERENCES</Text>
              <View style={styles.groupSwitch}>
                <Text style={styles.selectAllLabelSmall}>
                  {IMPORTANT_ITEMS.every((i) => !!importantChecks[i.key]) ? "Deselect All" : "Select All"}
                </Text>
                <Switch
                  value={IMPORTANT_ITEMS.every((i) => !!importantChecks[i.key])}
                  onValueChange={(val) => {
                    const next: Record<string, boolean> = {};
                    IMPORTANT_ITEMS.forEach((i) => { next[i.key] = val; });
                    setImportantChecks(next);
                  }}
                  trackColor={{ false: "#e2e8f0", true: "#8b5cf6" }}
                  thumbColor="#ffffff"
                  ios_backgroundColor="#e2e8f0"
                />
              </View>
            </View>
            {IMPORTANT_ITEMS.map((item) => (
              <CheckRow
                key={item.key}
                label={item.label}
                checked={!!importantChecks[item.key]}
                onToggle={() =>
                  setImportantChecks((p) => ({ ...p, [item.key]: !p[item.key] }))
                }
                accent="#8b5cf6"
              />
            ))}

            <Divider />

            {/* ── Section 3 – Decision ── */}
            <SectionHeader step={3} title="What's Your Decision?" />
            <View style={styles.decisionsCol}>
              {DECISIONS.map((opt) => {
                const active = decision === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    onPress={() => setDecision(opt.value)}
                    activeOpacity={0.8}
                    style={[styles.decisionCard, active && opt.activeStyle]}
                  >
                    <View style={[styles.decisionDot, { backgroundColor: opt.dot }]} />
                    <View style={styles.decisionText}>
                      <Text style={[styles.decisionLabel, active && opt.activeTextStyle]}>
                        {opt.label}
                      </Text>
                      <Text style={styles.decisionSub}>{opt.sublabel}</Text>
                    </View>
                    <View style={[styles.radioOuter, active && { borderColor: opt.dot }]}>
                      {active && (
                        <View style={[styles.radioInner, { backgroundColor: opt.dot }]} />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* ── Section 4 – Rejection reasons (conditional) ── */}
            {decision === "not_interested" && (
              <>
                <Divider />
                <SectionHeader
                  step={4}
                  title="Why Not Interested?"
                  allSelected={REJECTION_REASONS.every((r) => rejectionReasons.includes(r))}
                  onSelectAll={(val) =>
                    setRejectionReasons(val ? [...REJECTION_REASONS] : [])
                  }
                  switchColor="#ef4444"
                />
                {REJECTION_REASONS.map((reason) => (
                  <CheckRow
                    key={reason}
                    label={reason}
                    checked={rejectionReasons.includes(reason)}
                    onToggle={() => toggleRejection(reason)}
                    accent="#ef4444"
                  />
                ))}
                <Text style={[styles.groupLabel, { marginTop: 12 }]}>OTHER REASON</Text>
                <TextInput
                  value={otherReason}
                  onChangeText={setOtherReason}
                  placeholder="Any other reason..."
                  placeholderTextColor="#a1a1aa"
                  multiline
                  numberOfLines={3}
                  style={styles.textarea}
                  textAlignVertical="top"
                />
              </>
            )}

            <Divider />

            {/* ── Liked ── */}
            <SectionHeader step={likedStep} title="What Did You Like?" />
            <TextInput
              value={liked}
              onChangeText={setLiked}
              placeholder="e.g. Great kitchen, nice backyard, quiet street..."
              placeholderTextColor="#a1a1aa"
              multiline
              numberOfLines={4}
              style={styles.textarea}
              textAlignVertical="top"
            />

            {/* ── Disliked ── */}
            <View style={{ marginTop: 16 }}>
              <SectionHeader step={dislikedStep} title="What Did You Not Like?" />
              <TextInput
                value={disliked}
                onChangeText={setDisliked}
                placeholder="e.g. Small parking, old basement, noisy area..."
                placeholderTextColor="#a1a1aa"
                multiline
                numberOfLines={4}
                style={styles.textarea}
                textAlignVertical="top"
              />
            </View>

            <Divider />

            {/* ── Submit / Update button ── */}
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={!canSubmit || isSaving}
              activeOpacity={0.85}
              style={[
                styles.submitBtn,
                isEditing && styles.submitBtnEdit,
                (!canSubmit || isSaving) && styles.submitBtnDisabled,
              ]}
            >
              {isSaving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitBtnText}>
                  {isEditing ? "✏️  Update Feedback" : "📤  Submit Feedback"}
                </Text>
              )}
            </TouchableOpacity>

            {!canSubmit && !isSaving && (
              <Text style={styles.submitHint}>
                Please provide a rating and select your decision to submit.
              </Text>
            )}

            <View style={{ height: 32 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
  backgroundColor: "#ffffff",
  borderTopLeftRadius: 24,
  borderTopRightRadius: 24,
  height: SCREEN_HEIGHT * 0.93,
  width: "100%",
  ...Platform.select({
    ios: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.15,
      shadowRadius: 20,
    },
    android: { elevation: 20 },
  }),
},

  sheetHeader: {
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#cbd5e1",
    alignSelf: "center",
    marginBottom: 14,
  },
  sheetHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0f172a",
    letterSpacing: -0.5,
  },
  editBadge: {
    backgroundColor: "#fef3c7",
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: "#fbbf24",
  },
  editBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#92400e",
  },
  sheetSub: {
    fontSize: 13,
    color: "#64748b",
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  closeBtnText: {
    fontSize: 13,
    color: "#64748b",
    fontWeight: "600",
  },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 20 },

  propertyCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    gap: 12,
  },
  propertyIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#ede9fe",
    alignItems: "center",
    justifyContent: "center",
  },
  propertyIconText: { fontSize: 22 },
  propertyInfo: { flex: 1 },
  propertyAddress: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0f172a",
    lineHeight: 20,
  },
  propertyMeta: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 3,
  },

  divider: {
    height: 1,
    backgroundColor: "#f1f5f9",
    marginVertical: 20,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  sectionHeaderRow: {
    justifyContent: "space-between",
  },
  sectionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  sectionHeaderSwitch: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexShrink: 0,
  },
  selectAllLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6366f1",
  },
  groupLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  groupSwitch: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  selectAllLabelSmall: {
    fontSize: 11,
    fontWeight: "600",
    color: "#94a3b8",
  },
  stepBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#6366f1",
    alignItems: "center",
    justifyContent: "center",
  },
  stepBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1e293b",
    letterSpacing: -0.2,
  },

  helper: {
    fontSize: 13,
    color: "#64748b",
    marginBottom: 14,
    marginTop: -4,
  },

  starsRow: { flexDirection: "row", gap: 4 },
  starBtn: { padding: 4 },
  star: { fontSize: 34, color: "#e2e8f0" },
  starActive: { color: "#fbbf24" },
  ratingLabel: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: "600",
    color: "#f59e0b",
  },

  groupLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#94a3b8",
    letterSpacing: 1.2,
  },

  checkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    backgroundColor: "#fff",
    marginBottom: 7,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#cbd5e1",
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  checkmark: { color: "#fff", fontSize: 13, fontWeight: "700", lineHeight: 16 },
  checkLabel: { fontSize: 14, color: "#374151", flex: 1 },

  decisionsCol: { gap: 10 },
  decisionCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    backgroundColor: "#fafafa",
    gap: 12,
  },
  decisionDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  decisionText: { flex: 1 },
  decisionLabel: { fontSize: 14, fontWeight: "700", color: "#1e293b" },
  decisionSub: { fontSize: 11, color: "#94a3b8", marginTop: 1 },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#cbd5e1",
    alignItems: "center",
    justifyContent: "center",
  },
  radioInner: {
    width: 11,
    height: 11,
    borderRadius: 5.5,
  },

  textarea: {
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: "#1e293b",
    backgroundColor: "#f8fafc",
    minHeight: 90,
    lineHeight: 20,
  },

  submitBtn: {
    backgroundColor: "#6366f1",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#6366f1",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 12,
      },
      android: { elevation: 8 },
    }),
  },
  submitBtnEdit: {
    backgroundColor: "#f59e0b",
    ...Platform.select({
      ios: { shadowColor: "#f59e0b" },
      android: {},
    }),
  },
  submitBtnDisabled: {
    backgroundColor: "#c7d2fe",
    ...Platform.select({
      ios: { shadowOpacity: 0 },
      android: { elevation: 0 },
    }),
  },
  submitBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  submitHint: {
    textAlign: "center",
    fontSize: 12,
    color: "#94a3b8",
    marginTop: 10,
  },
});


