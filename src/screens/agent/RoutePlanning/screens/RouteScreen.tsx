import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  CarFront,
  Check,
  Clock3,
  LocateFixed,
  Radio,
  RefreshCw,
  Route,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react-native";
import { Property, SortOption } from "../types";
import { colors, shadow, sharedStyles } from "../theme";
import { SORT_OPTIONS } from "../constants";
import {
  CalculateRoutePlanPayload,
  RoutePlanResponse,
  useCalculateRoutePlan,
  useDeleteShowingRequestProperty,
  useMoveShowingRequestProperty,
  useUpdateShowingRequestStatus,
  useUpdateRouteStops,
} from "@/lib/agentRoutePlanningAPI";
import { getApiErrorMessage } from "@/lib/apiErrors";
import RoutePropertyCard from "../components/common/RoutePropertyCard";
import MiniMap from "../components/common/MiniMap";
import SuccessModal from "../components/modals/SuccessModal";
import RemovePropertyModal from "../components/modals/RemovePropertyModal";
import { recascadeStartTimes } from "../utils/timeUtils";

interface RouteScreenProps {
  properties: Property[];
  sortBy: SortOption;
  routePlan: RoutePlanResponse;
  /** ID of the showing request — required for the delete, recalculate & approve API calls */
  showingRequestId: string;
  onSortChange: (option: SortOption) => void;
  onBack: () => void;
  /** Called when the user edits start time or viewing duration on a card */
  onUpdateProperty?: (updated: Property) => void;
  /** Receives the full recascaded list whenever any card changes */
  onUpdateProperties?: (updated: Property[]) => void;
  /** Preferred start time from the showing request, e.g. "10:30 AM" */
  preferredTime?: string;
  /** Called after the approve API succeeds and the agent dismisses the success modal */
  onApproveSuccess: () => void;
  onRecalculate: () => void;
  /**
   * Called after a successful recalculate so the parent (RoutePlanningScreen)
   * can store the latest RoutePlanResponse.
   */
  onRouteRecalculated: (plan: RoutePlanResponse) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Convert metres → "X.X km" */
function formatDistance(metres: number | undefined | null): string {
  if (!metres) return "—";
  return `${(metres / 1000).toFixed(1)} km`;
}

/** Convert seconds → "Xh Ym" or "Ym" */
function formatDuration(seconds: number | undefined | null): string {
  if (!seconds) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function formatRouteDate(
  iso: string | undefined | null,
  timezone: string,
): string {
  if (!iso) return "Date unavailable";
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: timezone,
    });
  } catch {
    return iso;
  }
}

/**
 * Convert preferredTime ("10:30 AM" / "10:30 A" / "10:30") → storage format "10:30 A".
 * Returns undefined if preferredTime is empty/unparseable.
 */
function parsePreferredTime(
  preferredTime: string | undefined,
): string | undefined {
  if (!preferredTime) return undefined;
  const match = preferredTime.match(/(\d+):(\d+)\s*([AP]M?)?/i);
  if (!match) return undefined;
  const h = match[1];
  const m = match[2];
  const ampmRaw = (match[3] ?? "A").toUpperCase();
  const ampmChar = ampmRaw.startsWith("P") ? "P" : "A";
  return `${h}:${m} ${ampmChar}`;
}

/**
 * Produce a stable key from a property list so we can detect genuine
 * external replacements (recalculate, remove) vs cascade-only updates.
 */
function propertyListKey(props: Property[]): string {
  return props.map((p) => p.id).join(",");
}

/** Map the current sortBy option to the API's sortMode string. */
function sortOptionToMode(sortBy: SortOption): string {
  return sortBy === "Time" ? "time" : "distance";
}

/**
 * Combine a date string ("2026-06-30" or "2026-06-26T12:30:00Z") and a
 * stored startTime ("10:30 A" | "10:30 P") into an ISO UTC datetime string.
 * e.g. preferredDate="2026-06-30", startTime="2:45 P" → "2026-06-30T14:45:00Z"
 *
 * Uses the date portion of preferredDate and the time from startTime.
 * Treats the agent-entered time as UTC (no tz conversion) to match the API contract.
 */
function buildScheduledStartAt(
  preferredDate: string | undefined | null,
  startTime: string | undefined | null,
): string {
  const mins = startTimeToMinutes(startTime);
  if (!preferredDate || mins === null) return "";

  // Extract just the YYYY-MM-DD part (handles both "2026-06-30" and ISO strings)
  const datePart = preferredDate.split("T")[0];
  const hh = Math.floor(mins / 60);
  const mm = mins % 60;
  return `${datePart}T${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:00Z`;
}

/**
 * Convert stored startTime ("10:30 A" | "10:30 P") to total minutes since midnight.
 * Returns null if unparseable.
 */
function startTimeToMinutes(
  startTime: string | undefined | null,
): number | null {
  if (!startTime) return null;
  const match = startTime.match(/(\d+):(\d+)\s*([AP])?/i);
  if (!match) return null;
  let h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const ampmChar = (match[3] ?? "A").toUpperCase();
  if (ampmChar === "P" && h !== 12) h += 12;
  if (ampmChar === "A" && h === 12) h = 0;
  return h * 60 + m;
}

/**
 * Format total minutes since midnight → "10:30 AM"
 */
function minsToDisplayTime(totalMinutes: number): string {
  // Normalise to the current-day window (handles multi-day overflow correctly).
  const dayMins = ((totalMinutes % 1440) + 1440) % 1440;
  const hh = Math.floor(dayMins / 60);
  const mm = dayMins % 60;
  const period = hh >= 12 ? "PM" : "AM";
  const displayH = hh % 12 === 0 ? 12 : hh % 12;
  return `${displayH}:${String(mm).padStart(2, "0")} ${period}`;
}

/**
 * Format total minutes since midnight → stored startTime format "10:30 A" / "10:30 P"
 */
function minsToStorageFormat(totalMinutes: number): string {
  // Normalise to the current-day window (handles multi-day overflow correctly).
  const dayMins = ((totalMinutes % 1440) + 1440) % 1440;
  const hh = Math.floor(dayMins / 60);
  const mm = dayMins % 60;
  const ampmChar = hh >= 12 ? "P" : "A";
  const displayH = hh % 12 === 0 ? 12 : hh % 12;
  return `${displayH}:${String(mm).padStart(2, "0")} ${ampmChar}`;
}

/**
 * Convert stored startTime ("10:30 A" | "10:30 P") → API format "HH:MM AM/PM"
 * e.g. "10:30 A" → "10:30 AM", "6:00 P" → "6:00 PM"
 */
function startTimeToApiFormat(startTime: string | undefined | null): string {
  if (!startTime) return "";
  const mins = startTimeToMinutes(startTime);
  if (mins === null) return startTime;
  return minsToDisplayTime(mins);
}



function zonedDateParts(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);
  return {
    year: value("year"),
    month: value("month"),
    day: value("day"),
    hour: value("hour"),
    minute: value("minute"),
    second: value("second"),
  };
}

/** Parse an ISO instant into minutes since midnight in the app-supplied route timezone. */
function isoToMinutes(
  iso: string | undefined | null,
  timezone: string,
): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  try {
    const parts = zonedDateParts(d, timezone);
    return parts.hour * 60 + parts.minute;
  } catch {
    return d.getUTCHours() * 60 + d.getUTCMinutes();
  }
}

/** Convert route-local minutes back to an ISO instant using the app-supplied timezone. */
function minsToIso(
  totalMinutes: number,
  referenceDateIso: string,
  timezone: string,
): string {
  const normalised = ((totalMinutes % 1440) + 1440) % 1440;
  const dayOffset = Math.floor(totalMinutes / 1440);
  const hour = Math.floor(normalised / 60);
  const minute = normalised % 60;
  const reference = new Date(referenceDateIso);

  try {
    const local = zonedDateParts(reference, timezone);
    const wallClockUtc = Date.UTC(
      local.year,
      local.month - 1,
      local.day + dayOffset,
      hour,
      minute,
      0,
    );
    const offsetAt = (timestamp: number) => {
      const parts = zonedDateParts(new Date(timestamp), timezone);
      return Date.UTC(
        parts.year,
        parts.month - 1,
        parts.day,
        parts.hour,
        parts.minute,
        parts.second,
      ) - timestamp;
    };
    let instant = wallClockUtc - offsetAt(wallClockUtc);
    instant = wallClockUtc - offsetAt(instant);
    return new Date(instant).toISOString();
  } catch {
    const datePart = referenceDateIso.split("T")[0];
    return `${datePart}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00Z`;
  }
}


// ─── KPI Strip ────────────────────────────────────────────────────────────────

const KPIStrip: React.FC<{
  stops: number;
  driveDurationSeconds: number | undefined | null;
  viewingDurationSeconds: number | undefined | null;
}> = ({ stops, driveDurationSeconds, viewingDurationSeconds }) => {
  const kpis = [
    { label: "Stops", value: String(stops) },
    { label: "Drive Time", value: formatDuration(driveDurationSeconds) },
    { label: "Viewing", value: formatDuration(viewingDurationSeconds) },
  ];
  return (
    <View style={styles.kpiStrip}>
      {kpis.map((kpi, i) => (
        <View
          key={kpi.label}
          style={[styles.kpiItem, i < kpis.length - 1 && styles.kpiItemBorder]}
        >
          <Text style={styles.kpiLabel}>{kpi.label}</Text>
          <Text style={styles.kpiValue}>{kpi.value}</Text>
        </View>
      ))}
    </View>
  );
};

// ─── Sort Controls ────────────────────────────────────────────────────────────

const SortControls: React.FC<{
  sortBy: SortOption;
  onSortChange: (opt: SortOption) => void;
}> = ({ sortBy, onSortChange }) => (
  <View style={styles.sortCard}>
    <View style={styles.sortCardTop}>
      <View>
        <Text style={styles.sortByLabel}>Route preference</Text>
        <Text style={styles.sortBySubtext}>Choose how stops are ordered</Text>
      </View>
      <View style={styles.trafficPill}>
        <Radio size={12} color="#15803D" strokeWidth={2.3} />
        <Text style={styles.trafficPillText}>Live traffic on</Text>
      </View>
    </View>
    <View style={styles.sortOptions}>
      {SORT_OPTIONS.map((opt) => {
        const isActive = sortBy === opt;
        return (
          <TouchableOpacity
            key={opt}
            style={[styles.sortBtn, isActive && styles.sortBtnActive]}
            onPress={() => onSortChange(opt)}
            activeOpacity={0.8}
          >
            {opt === "Distance" ? (
              <Route
                size={16}
                color={isActive ? colors.white : colors.textSecondary}
                strokeWidth={2.2}
              />
            ) : (
              <Clock3
                size={16}
                color={isActive ? colors.white : colors.textSecondary}
                strokeWidth={2.2}
              />
            )}
            <Text
              style={[styles.sortBtnText, isActive && styles.sortBtnTextActive]}
            >
              {opt}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  </View>
);

// ─── Delete Confirmation Modal ────────────────────────────────────────────────

// ─── Route Screen ─────────────────────────────────────────────────────────────

const RouteScreen: React.FC<RouteScreenProps> = ({
  properties: propProperties,
  sortBy,
  routePlan,
  showingRequestId,
  onSortChange,
  onBack,
  onUpdateProperty,
  onUpdateProperties,
  onApproveSuccess,
  onRecalculate,
  onRouteRecalculated,
  preferredTime,
}) => {
  const routeTimezone =
    routePlan.start?.timezone
    ?? Intl.DateTimeFormat().resolvedOptions().timeZone;

  // ── API hooks ─────────────────────────────────────────────────────────────
  const { mutate: deleteProperty, isPending: isDeleting } =
    useDeleteShowingRequestProperty(showingRequestId);

  const { mutate: moveProperty, isPending: isMoving } =
    useMoveShowingRequestProperty(showingRequestId);

  const { mutate: calculateRoute, isPending: isRecalculating } =
    useCalculateRoutePlan(showingRequestId);

  const { mutate: approveRequest, isPending: isApproving } =
    useUpdateShowingRequestStatus(showingRequestId);

  // ── Success modal state ───────────────────────────────────────────────────
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [approveError, setApproveError] = useState<string | null>(null);
  const [rejectError, setRejectError] = useState<string | null>(null);
  const [statusAction, setStatusAction] = useState<"approve" | "reject" | null>(null);

  // ── Dirty state — true when the agent has changed something that requires
  //    a fresh recalculate before they can approve ──────────────────────────
  const [isDirty, setIsDirty] = useState(false);

  // ── Delete confirmation state ─────────────────────────────────────────────
  const [propertyToDelete, setPropertyToDelete] = useState<Property | null>(
    null,
  );

  // ── Build the initial seeded list exactly once ────────────────────────────
  const parsedPreferredTime = parsePreferredTime(preferredTime);

  // const seedProperties = useCallback(
  //   (props: Property[]): Property[] => {
  //     // Build a lookup from normalised street line → stop data.
  //     // Stops carry only the street ("10231 OLD PINECREST ROAD") while
  //     // Property.address is the full address including city/province.
  //     // We normalise both sides to just the part before the first comma so
  //     // "10231 OLD PINECREST ROAD" matches
  //     // "10231 OLD PINECREST ROAD, Brampton (Northwest Brampton), Ontario".
  //     const streetKey = (addr: string | undefined | null) =>
  //       (addr ?? "").split(",")[0].trim().toUpperCase();

  //     // Map street → full stop (we need driveDurationSecondsFromPrevious)
  //     const stopByStreet = new Map<string, (typeof routePlan.stops)[number]>();
  //     const requestedIdByStreet = new Map<string, string>();
  //     for (const stop of routePlan.stops ?? []) {
  //       if (stop.address) {
  //         const key = streetKey(stop.address);
  //         stopByStreet.set(key, stop);
  //         if (stop.requestedPropertyId) {
  //           requestedIdByStreet.set(key, stop.requestedPropertyId);
  //         }
  //       }
  //     }

  //     // Sort properties to match the API stop order so the running-time cursor
  //     // accumulates correctly and the UI list matches the optimised route.
  //     const orderByStreet = new Map<string, number>();
  //     for (const stop of routePlan.stops ?? []) {
  //       if (stop.address) {
  //         orderByStreet.set(streetKey(stop.address), stop.order ?? Infinity);
  //       }
  //     }
  //     const sortedProps = [...props].sort((a, b) => {
  //       const orderA = orderByStreet.get(streetKey(a.address)) ?? Infinity;
  //       const orderB = orderByStreet.get(streetKey(b.address)) ?? Infinity;
  //       return orderA - orderB;
  //     });

  //     // Parse preferred start time into total minutes since midnight.
  //     // This is the time the agent departs from the start point.
  //     const departureMins: number | null = parsedPreferredTime
  //       ? startTimeToMinutes(parsedPreferredTime)
  //       : null;

  //     // Build properties with calculated start times:
  //     //  • Stop 1 start = departure time + drive from start → stop 1
  //     //  • Stop N start = stop (N-1) start + viewing(N-1) + buffer(N-1) + drive(N-1 → N)
  //     const bufferMins = routePlan.request?.bufferMinutesPerStop ?? 10;

  //     // Build a stops array sorted by order so index matches sortedProps index.
  //     const sortedStops = [...(routePlan.stops ?? [])].sort(
  //       (a, b) => (a.order ?? 0) - (b.order ?? 0),
  //     );

  //     let runningMins: number | null = departureMins;

  //     const seeded = sortedProps.map((p, idx) => {
  //       const key = streetKey(p.address);
  //       // Match stop by position (sortedProps is already ordered by stop.order)
  //       // so index-based lookup is reliable even when address strings differ.
  //       const stop = sortedStops[idx];

  //       // Drive time FROM previous stop (or start point) INTO this stop.
  //       const driveSecs = stop?.driveDurationSecondsFromPrevious ?? 0;
  //       const driveMins = Math.round(driveSecs / 60);

  //       let newStartTime = p.startTime;

  //       if (runningMins !== null) {
  //         // thisStop start = end of previous stop + drive time to here
  //         const thisStartMins = runningMins + driveMins;
  //         newStartTime = minsToStorageFormat(thisStartMins);
  //         // Advance cursor: viewing time + buffer before next stop.
  //         const viewingMins =
  //           p.viewingMin ?? stop?.viewingDurationMinutes ?? 30;
  //         runningMins = thisStartMins + viewingMins + bufferMins;
  //       }

  //       return {
  //         ...p,
  //         requestedPropertyId:
  //           requestedIdByStreet.get(key) ??
  //           stop?.requestedPropertyId ??
  //           p.requestedPropertyId,
  //         viewingMin: p.viewingMin ?? stop?.viewingDurationMinutes ?? 30,
  //         driveMinFromPrevious: driveMins, // ← add this line
  //         startTime: newStartTime,
  //       };

  //       // return {
  //       //   ...p,
  //       //   requestedPropertyId:
  //       //     requestedIdByStreet.get(key) ?? stop?.requestedPropertyId ?? p.requestedPropertyId,
  //       //   viewingMin: p.viewingMin ?? stop?.viewingDurationMinutes ?? 30,
  //       //   startTime: newStartTime,
  //       // };
  //     });

  //     return seeded;
  //   },
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  //   [
  //     parsedPreferredTime,
  //     routePlan.stops,
  //     routePlan.request?.bufferMinutesPerStop,
  //   ],
  // );





const seedProperties = useCallback(
  (props: Property[]): Property[] => {
    const streetKey = (addr: string | undefined | null) =>
      (addr ?? '').split(',')[0].trim().toUpperCase();

    const stopByStreet = new Map<string, (typeof routePlan.stops)[number]>();
    const requestedIdByStreet = new Map<string, string>();
    for (const stop of routePlan.stops ?? []) {
      if (stop.address) {
        const key = streetKey(stop.address);
        stopByStreet.set(key, stop);
        if (stop.requestedPropertyId) {
          requestedIdByStreet.set(key, stop.requestedPropertyId);
        }
      }
    }

    const orderByStreet = new Map<string, number>();
    for (const stop of routePlan.stops ?? []) {
      if (stop.address) {
        orderByStreet.set(streetKey(stop.address), stop.order ?? Infinity);
      }
    }
    const sortedProps = [...props].sort((a, b) => {
      const orderA = orderByStreet.get(streetKey(a.address)) ?? Infinity;
      const orderB = orderByStreet.get(streetKey(b.address)) ?? Infinity;
      return orderA - orderB;
    });

    const sortedStops = [...(routePlan.stops ?? [])].sort(
      (a, b) => (a.order ?? 0) - (b.order ?? 0),
    );

    return sortedProps.map((p, idx) => {
      const key = streetKey(p.address);
      const stop = sortedStops[idx];

      const driveSecs = stop?.driveDurationSecondsFromPrevious ?? 0;
      const driveMins = Math.round(driveSecs / 60);

      // ── Use ISO times from the API response directly ──────────────────────
      const scheduledStartAt = stop?.scheduledStartAt ?? undefined;
      const scheduledEndAt   = stop?.scheduledEndAt   ?? undefined;
      const etaAt            = stop?.etaAt            ?? undefined;

      // startTime (storage format "10:30 A") derived from scheduledStartAt
      const startMins = isoToMinutes(scheduledStartAt, routeTimezone);
      const newStartTime = startMins !== null
        ? minsToStorageFormat(startMins)
        : p.startTime;

      // eta display string derived from etaAt
      const etaMins = isoToMinutes(etaAt, routeTimezone);
      const newEta = etaMins !== null ? minsToDisplayTime(etaMins) : p.eta;

      return {
        ...p,
        requestedPropertyId:
          requestedIdByStreet.get(key) ?? stop?.requestedPropertyId ?? p.requestedPropertyId,
        viewingMin:        stop?.viewingDurationMinutes ?? p.viewingMin ?? 30,
        driveMinFromPrevious: driveMins,
        startTime:         newStartTime,
        scheduledStartAt,
        scheduledEndAt,
        eta:               newEta,
      };
    });
  },
  [routePlan.stops, routePlan.request?.bufferMinutesPerStop, routeTimezone],
);







  /** Re-stamp drive times and requestedPropertyId from fresh stop data without
   *  overwriting agent-edited startTime or viewingMin values. */
  const enrichProperties = useCallback(
    (props: Property[]): Property[] => {
      const streetKey = (addr: string | undefined | null) =>
        (addr ?? "").split(",")[0].trim().toUpperCase();

      const requestedIdByStreet = new Map<string, string>();
      const sortedStops = [...(routePlan.stops ?? [])].sort(
        (a, b) => (a.order ?? 0) - (b.order ?? 0),
      );
      for (const stop of routePlan.stops ?? []) {
        if (stop.address && stop.requestedPropertyId) {
          requestedIdByStreet.set(
            streetKey(stop.address),
            stop.requestedPropertyId,
          );
        }
      }

      return props.map((p, idx) => {
        const stop = sortedStops[idx];
        const driveMins = Math.round(
          (stop?.driveDurationSecondsFromPrevious ?? 0) / 60,
        );
        const key = streetKey(p.address);
        return {
          ...p,
          requestedPropertyId:
            requestedIdByStreet.get(key) ??
            stop?.requestedPropertyId ??
            p.requestedPropertyId,
          driveMinFromPrevious: driveMins,
        };
      });
    },
    [routePlan.stops],
  );

  const [properties, setProperties] = useState<Property[]>(() =>
    seedProperties(propProperties),
  );

  // Track the last property-ID fingerprint we seeded from so we only re-seed
  // when the parent provides a genuinely new list (remove / recalculate).
  const seededKeyRef = useRef<string>(propertyListKey(propProperties));

  // Track the sortBy value that was active when the last calculate completed
  // so we can detect sort changes after a successful recalculate.
  const lastCalculatedSortRef = useRef<SortOption>(sortBy);

  useEffect(() => {
    const incomingKey = propertyListKey(propProperties);
    if (incomingKey === seededKeyRef.current) return;
    seededKeyRef.current = incomingKey;
    setProperties(seedProperties(propProperties));
  }, [propProperties, seedProperties]);

  // Re-enrich requestedPropertyId whenever the routePlan stops change
  // (e.g. after a recalculate). The property list IDs stay the same so the
  // above effect won't fire — we need this separate one.
  const lastStopsKeyRef = useRef<string>(
    (routePlan.stops ?? []).map((s) => s.id).join(","),
  );
  useEffect(() => {
    const stopsKey = (routePlan.stops ?? []).map((s) => s.id).join(",");
    if (stopsKey === lastStopsKeyRef.current) return;
    lastStopsKeyRef.current = stopsKey;
    setProperties((prev) => enrichProperties(prev));
    setProperties((prev) => seedProperties(prev));
  }, [routePlan.stops, seedProperties]);

  // ── Mark dirty when the sort option changes ───────────────────────────────
  // We compare against the sort that was in effect when the last successful
  // recalculate (or initial calculate) completed.
  useEffect(() => {
    if (sortBy !== lastCalculatedSortRef.current) {
      setIsDirty(true);
    }
  }, [sortBy]);

  // ── Cascade handler ───────────────────────────────────────────────────────
  // const handleUpdateProperty = (updated: Property) => {
  //   setProperties((prev) => {
  //     const idx = prev.findIndex((p) => p.id === updated.id);
  //     if (idx === -1) return prev;

  //     const next = [...prev];
  //     next[idx] = updated;
  //     const cascaded = recascadeStartTimes(next, idx);

  //     seededKeyRef.current = propertyListKey(cascaded);
  //     onUpdateProperty?.(updated);
  //     onUpdateProperties?.(cascaded);

  //     return cascaded;
  //   });

  //   // Any edit to a property's start time or viewing duration makes the
  //   // current route plan stale.
  //   setIsDirty(true);
  // };

  // ── Stops-update hook ─────────────────────────────────────────────────────
  const { mutate: updateStops } = useUpdateRouteStops(showingRequestId);

  // ── Cascade handler ───────────────────────────────────────────────────────
  // const handleUpdateProperty = (updated: Property) => {
  //   setProperties((prev) => {
  //     const idx = prev.findIndex((p) => p.id === updated.id);
  //     if (idx === -1) return prev;

  //     const next = [...prev];
  //     next[idx] = updated;
  //     const bufferMins = routePlan.request?.bufferMinutesPerStop ?? 10;
  //     const cascaded = recascadeStartTimes(next, idx, bufferMins);

  //     seededKeyRef.current = propertyListKey(cascaded);
  //     onUpdateProperty?.(updated);
  //     onUpdateProperties?.(cascaded);

  //     // Build stops payload for all properties at or after the edited one.
  //     // Earlier stops are unaffected so we only need to send the changed tail.
  //     const stopsPayload = cascaded.slice(idx).map((p, i) => ({
  //       requestedPropertyId:    p.requestedPropertyId ?? '',
  //       routeOrder:             idx + i + 1,           // 1-based
  //       scheduledStartTime:     p.startTime
  //         ? startTimeToApiFormat(p.startTime)
  //         : '',
  //       viewingDurationMinutes: p.viewingMin ?? 30,
  //     }));

  //     updateStops(
  //       {
  //         stops:       stopsPayload,
  //         recalculate: false,
  //         sortMode:    sortOptionToMode(sortBy),
  //       },
  //       {
  //         onError: (err) =>
  //           console.error('[RouteScreen] updateRouteStops failed:', err),
  //       },
  //     );

  //     return cascaded;
  //   });

  //   setIsDirty(true);
  // };

  // ── Cascade handler ───────────────────────────────────────────────────────
  // const handleUpdateProperty = (updated: Property) => {
  //   setProperties((prev) => {
  //     const idx = prev.findIndex((p) => p.id === updated.id);
  //     if (idx === -1) return prev;

  //     const oldProp = prev[idx];
  //     const next = [...prev];
  //     next[idx] = updated;

  //     // Compute how much startTime and viewingMin changed on the edited property.
  //     const oldStartMins = startTimeToMinutes(oldProp.startTime) ?? 0;
  //     const newStartMins = startTimeToMinutes(updated.startTime) ?? 0;
  //     const startDelta = newStartMins - oldStartMins;

  //     const oldViewing = oldProp.viewingMin ?? 30;
  //     const newViewing = updated.viewingMin ?? 30;
  //     const viewingDelta = newViewing - oldViewing;

  //     // Total shift to apply to every following property.
  //     const totalDelta = startDelta + viewingDelta;

  //     // Shift all properties after the edited one by the delta,
  //     // preserving their individually edited times.
  //     for (let i = idx + 1; i < next.length; i++) {
  //       const currentMins = startTimeToMinutes(next[i].startTime) ?? 0;
  //       const shiftedMins = currentMins + totalDelta;
  //       next[i] = {
  //         ...next[i],
  //         startTime: minsToStorageFormat(shiftedMins),
  //         eta: minsToDisplayTime(shiftedMins),
  //       };
  //     }

  //     seededKeyRef.current = propertyListKey(next);
  //     onUpdateProperty?.(updated);
  //     onUpdateProperties?.(next);

  //     // Build stops payload for all properties at or after the edited one.
  //     // const stopsPayload = next.slice(idx).map((p, i) => ({
  //     //   requestedPropertyId:    p.requestedPropertyId ?? '',
  //     //   routeOrder:             idx + i + 1,
  //     //   scheduledStartTime:     p.startTime ? startTimeToApiFormat(p.startTime) : '',
  //     //   viewingDurationMinutes: p.viewingMin ?? 30,
  //     // }));

  //     const stopsPayload = next.slice(idx).map((p, i) => ({
  //       requestedPropertyId: p.requestedPropertyId ?? "",
  //       routeOrder: idx + i + 1,
  //       scheduledStartAt: buildScheduledStartAt(
  //         routePlan.request?.preferredDate,
  //         p.startTime,
  //       ),
  //       viewingDurationMinutes: p.viewingMin ?? 30,
  //     }));

  //     updateStops(
  //       {
  //         stops: stopsPayload,
  //         recalculate: false,
  //         sortMode: sortOptionToMode(sortBy),
  //       },
  //       {
  //         onError: (err) =>
  //           console.error("[RouteScreen] updateRouteStops failed:", err),
  //       },
  //     );

  //     return next;
  //   });

  //   setIsDirty(true);
  // };

  const handleUpdateProperty = (updated: Property) => {
  setProperties((prev) => {
    const idx = prev.findIndex((p) => p.id === updated.id);
    if (idx === -1) return prev;

    const oldProp = prev[idx];
    const next = [...prev];
    next[idx] = updated;

    // Delta in minutes from what the agent changed on this card
    const oldStartMins = startTimeToMinutes(oldProp.startTime) ?? 0;
    const newStartMins = startTimeToMinutes(updated.startTime) ?? 0;
    const startDelta   = newStartMins - oldStartMins;

    const oldViewing   = oldProp.viewingMin ?? 30;
    const newViewing   = updated.viewingMin ?? 30;
    const viewingDelta = newViewing - oldViewing;

    const totalDelta = startDelta + viewingDelta;

    // Reference date from the edited card's scheduledStartAt (fallback to preferredDate)
    const refIso =
      updated.scheduledStartAt ??
      oldProp.scheduledStartAt ??
      routePlan.request?.preferredDate ??
      '';

    // Shift all following cards by the same delta, updating ISO fields too
    for (let i = idx + 1; i < next.length; i++) {
      const cur = next[i];
      const curStartMins = startTimeToMinutes(cur.startTime) ?? 0;
      const shifted      = curStartMins + totalDelta;

      // Derive a reference date for this stop (use its own scheduledStartAt or fall back)
      const stopRefIso = cur.scheduledStartAt ?? refIso;

      const shiftedStartAt = stopRefIso
        ? minsToIso(shifted, stopRefIso, routeTimezone)
        : undefined;
      const shiftedEndMins = shifted + (cur.viewingMin ?? 30);
      const shiftedEndAt = stopRefIso
        ? minsToIso(shiftedEndMins, stopRefIso, routeTimezone)
        : undefined;

      next[i] = {
        ...cur,
        startTime:        minsToStorageFormat(shifted),
        eta:              minsToDisplayTime(shifted),
        scheduledStartAt: shiftedStartAt,
        scheduledEndAt:   shiftedEndAt,
      };
    }

    // Recompute scheduledEndAt for the edited card itself
    const editedEndMins  = newStartMins + newViewing;
    const editedStartAt = refIso
      ? minsToIso(newStartMins, refIso, routeTimezone)
      : updated.scheduledStartAt;
    const editedEndAt = refIso
      ? minsToIso(editedEndMins, refIso, routeTimezone)
      : updated.scheduledEndAt;
    next[idx] = { ...next[idx], scheduledStartAt: editedStartAt, scheduledEndAt: editedEndAt };

    seededKeyRef.current = propertyListKey(next);
    onUpdateProperty?.(updated);
    onUpdateProperties?.(next);

    // Build stops payload with ISO scheduledStartAt
    const stopsPayload = next.slice(idx).map((p, i) => ({
      requestedPropertyId:    p.requestedPropertyId ?? '',
      routeOrder:             idx + i + 1,
      scheduledStartAt:       p.scheduledStartAt ?? buildScheduledStartAt(routePlan.request?.preferredDate, p.startTime),
      viewingDurationMinutes: p.viewingMin ?? 30,
    }));

    updateStops(
      { stops: stopsPayload, recalculate: false, sortMode: sortOptionToMode(sortBy) },
      { onError: (err) => console.error('[RouteScreen] updateRouteStops failed:', err) },
    );

    return next;
  });

  setIsDirty(true);
};

  // ── Delete handlers ───────────────────────────────────────────────────────

  /** Called by RoutePropertyCard when agent taps the ✕ icon */
  const handleRemovePress = (property: Property) => {
    setPropertyToDelete(property);
  };

  const handleCancelDelete = () => {
    if (isDeleting || isMoving) return; // don't dismiss mid-flight
    setPropertyToDelete(null);
  };

  /**
   * Agent chose "Move to New Request".
   *
   * Calls PATCH …/properties/:requestedPropertyId/move with recalculate: false.
   * On success the property is removed from the local list (it now lives in a
   * new showing request) and the route is marked stale so the agent must
   * recalculate before approving.
   */
  const handleMoveToNew = () => {
    if (!propertyToDelete) return;

    const requestedPropertyId = propertyToDelete.requestedPropertyId;

    moveProperty(
      { requestedPropertyId, recalculate: false },
      {
        onSuccess: () => {
          setProperties((prev) => {
            const filtered = prev.filter(
              (p) =>
                p.requestedPropertyId !== propertyToDelete.requestedPropertyId,
            );
            const cascaded = recascadeStartTimes(filtered, 0);

            seededKeyRef.current = propertyListKey(cascaded);
            onUpdateProperties?.(cascaded);

            return cascaded;
          });
          setPropertyToDelete(null);
          // Moving a property makes the route stale
          setApproveError(null);
          setIsDirty(true);
        },
        onError: (err) => {
          console.error("[RouteScreen] Failed to move property:", err);
          // Keep modal open so agent can retry or cancel
        },
      },
    );
  };

  /*
   * We pass recalculate: false so the server just removes the property;
   * the agent can hit RECALCULATE ROUTE afterwards if they want a fresh plan.
   * Flip to `true` if you want the server to auto-recalculate.
   */
  const handleConfirmDelete = () => {
    if (!propertyToDelete) return;

    // Use `requestedPropertyId` from the RoutePlanStop mapping (stops[].requestedPropertyId
    // in the calculate API response). This is the showing-request scoped property ID
    // required by DELETE …/showing-requests/:requestId/properties/:requestedPropertyId.
    // It is NOT the masterPropertyId or the stop's own id.
    const requestedPropertyId = propertyToDelete.requestedPropertyId;

    deleteProperty(
      { requestedPropertyId, recalculate: false },
      {
        onSuccess: () => {
          // Remove from local list and re-cascade start times
          setProperties((prev) => {
            const filtered = prev.filter(
              (p) =>
                p.requestedPropertyId !== propertyToDelete.requestedPropertyId,
            );
            const cascaded = recascadeStartTimes(filtered, 0);

            // Keep parent in sync
            seededKeyRef.current = propertyListKey(cascaded);
            onUpdateProperties?.(cascaded);

            return cascaded;
          });
          setPropertyToDelete(null);
          // Deleting a property makes the route stale
          setApproveError(null);
          setIsDirty(true);
        },
        onError: (err) => {
          console.error("[RouteScreen] Failed to delete property:", err);
          // Keep modal open so agent can retry or cancel
        },
      },
    );
  };

  // ── Recalculate handler ───────────────────────────────────────────────────

  /**
   * Calls the calculate API with the current sortBy option.
   * On success:
   *  - clears the dirty flag
   *  - snapshots the sort that produced this plan
   *  - propagates the fresh RoutePlanResponse up to RoutePlanningScreen
   */
  const handleRecalculate = () => {
    setApproveError(null);

    const payload: CalculateRoutePlanPayload = {
      sortMode: sortOptionToMode(sortBy),
      startType: routePlan.start?.type ?? "agent_address",
      startLabel: routePlan.start?.label ?? "Agent Address",
      liveTrafficEnabled: true,
      timezone:
        routePlan.start?.timezone ??
        Intl.DateTimeFormat().resolvedOptions().timeZone,
    } as CalculateRoutePlanPayload;

    calculateRoute(payload, {
      onSuccess: (freshPlan) => {
        setApproveError(null);
        setIsDirty(false);
        lastCalculatedSortRef.current = sortBy;
        onRouteRecalculated(freshPlan);
      },
      onError: (err) => {
        console.error("[RouteScreen] Recalculate failed:", err);
        // Leave isDirty=true so the agent knows they still need to recalculate
        onRecalculate(); // surface error modal via parent if needed
      },
    });
  };

  // ── Derived display values ────────────────────────────────────────────────

  const conflictCount = properties.filter((p) => p.conflict).length;

  const totalDistanceMetres: number | undefined =
    routePlan.summary?.totalDistanceMeters ?? undefined;
  const drivingSeconds: number | undefined =
    routePlan.summary?.totalDriveDurationSeconds ?? undefined;
  const viewingSeconds: number | undefined =
    routePlan.summary?.totalViewingDurationSeconds ?? undefined;
  const totalSeconds: number | undefined =
    routePlan.summary?.totalDurationSeconds ?? undefined;

  const startLabel: string = routePlan.start?.label ?? "Start Point";
  const orderedRouteStops = [...(routePlan.stops ?? [])].sort(
    (first, second) => (first.order ?? 0) - (second.order ?? 0),
  );
  const firstRouteStop = orderedRouteStops[0];
  const firstLegDriveSeconds =
    firstRouteStop?.driveDurationSecondsFromPrevious ?? null;
  const firstLegEtaMinutes = isoToMinutes(
    firstRouteStop?.etaAt,
    routeTimezone,
  );
  const firstLegDepartureMinutes =
    firstLegEtaMinutes !== null && firstLegDriveSeconds !== null
      ? firstLegEtaMinutes - Math.round(firstLegDriveSeconds / 60)
      : null;
  const firstLegDepartureLabel =
    firstLegDepartureMinutes !== null
      ? minsToDisplayTime(firstLegDepartureMinutes)
      : routePlan.request?.preferredStartTime ?? "—";
  const firstLegArrivalLabel =
    firstLegEtaMinutes !== null
      ? minsToDisplayTime(firstLegEtaMinutes)
      : properties[0]?.eta ?? "—";
  const hasFirstLeg =
    firstRouteStop != null
    && firstRouteStop.driveDistanceMetersFromPrevious != null
    && firstLegDriveSeconds != null;

  const totalSummary = totalSeconds
    ? `Total: ${formatDistance(totalDistanceMetres)} • ${formatDuration(totalSeconds)} incl. viewing`
    : "Calculating total…";

  const isStatusUpdating = isApproving;
  const isApproveSubmitting = isStatusUpdating && statusAction === "approve";
  const isRejectSubmitting = isStatusUpdating && statusAction === "reject";
  const approveDisabled = isDirty || isRecalculating || isStatusUpdating;
  const rejectDisabled = isDirty || isRecalculating || isStatusUpdating;
  const routeDateLabel = formatRouteDate(
    routePlan.request?.preferredDate,
    routeTimezone,
  );
  const readinessLabel = isDirty
    ? "Needs update"
    : conflictCount > 0
      ? "Review conflicts"
      : "Ready to approve";

  // ── Approve handler ───────────────────────────────────────────────────────

  /**
   * Calls PATCH …/status with:
   *  - status: "pending" (as required by the API contract)
   *  - preferredDate: ISO datetime from the original showing request
   *    e.g. "2026-06-26T12:30:00Z"
   *  - preferredTime: the first property's actual scheduled start time
   *    in "HH:MM AM/PM" format, e.g. "06:00 PM"
   *
   * On success the SuccessModal is shown; the agent dismisses it via
   * onApproveSuccess which lets the parent navigate away.
   */
  const handleApprove = () => {
    if (isStatusUpdating) return;
    setApproveError(null);
    setRejectError(null);
    setStatusAction("approve");

    // Use the first property's startTime as the preferredTime for the API.
    // This reflects any edits the agent made to the schedule.
    const firstPropertyStartTime = properties[0]?.startTime;
    const apiPreferredTime =
      startTimeToApiFormat(firstPropertyStartTime) ||
      routePlan.request?.preferredStartTime ||
      "";

    approveRequest(
      {
        status: "approved",
        preferredDate: routePlan.request?.preferredDate ?? "",
        preferredTime: apiPreferredTime,
        timezone:
          routePlan.start?.timezone
          ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      {
        onSuccess: () => {
          setApproveError(null);
          setShowSuccessModal(true);
        },
        onError: (err) => {
          const message = getApiErrorMessage(
            err,
            "Unable to approve this route. Please try again.",
          );
          setApproveError(message);
          console.error("[RouteScreen] Approve failed:", err);
        },
        onSettled: () => {
          setStatusAction(null);
        },
      },
    );
  };

  const handleReject = () => {
    if (isStatusUpdating) return;
    setRejectError(null);
    setApproveError(null);
    setStatusAction("reject");

    // Use the first property's startTime as the preferredTime for the API.
    const firstPropertyStartTime = properties[0]?.startTime;
    const apiPreferredTime =
      startTimeToApiFormat(firstPropertyStartTime) ||
      routePlan.request?.preferredStartTime ||
      "";

    approveRequest(
      {
        status: "rejected",
        preferredDate: routePlan.request?.preferredDate ?? "",
        preferredTime: apiPreferredTime,
        timezone:
          routePlan.start?.timezone
          ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      {
        onSuccess: () => {
          setRejectError(null);
          onApproveSuccess();
        },
        onError: (err) => {
          const message = getApiErrorMessage(
            err,
            "Unable to reject this route. Please try again.",
          );
          setRejectError(message);
          console.error("[RouteScreen] Reject failed:", err);
        },
        onSettled: () => {
          setStatusAction(null);
        },
      },
    );
  };

  // ── SuccessModal data ─────────────────────────────────────────────────────

  const successClientName = routePlan.request?.clientName ?? "—";
  const successPropertyCount =
    routePlan.summary?.stopCount ?? properties.length;

  /** Format "2026-06-30" or "2026-06-26T12:30:00Z" → "June 30, 2026" */
  const successDate = (() => {
    const raw = routePlan.request?.preferredDate;
    if (!raw) return "—";
    try {
      return new Date(raw).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
      });
    } catch {
      return raw;
    }
  })();

  /**
   * Build "6:00 PM – 7:30 PM" using:
   *  - start = first property's actual startTime (reflects agent edits)
   *  - end   = last property's startTime + viewingMin
   *
   * Falls back to routePlan.request?.preferredStartTime if properties are empty.
   */
  const successTimeRange = (() => {
    if (properties.length === 0) {
      const raw = routePlan.request?.preferredStartTime;
      return raw ?? "—";
    }

    const firstProp = properties[0];
    const lastProp = properties[properties.length - 1];

    const startMins = startTimeToMinutes(firstProp.startTime);
    if (startMins === null) return routePlan.request?.preferredStartTime ?? "—";

    const lastStartMins = startTimeToMinutes(lastProp.startTime) ?? startMins;
    const endMins = lastStartMins + (lastProp.viewingMin ?? 30);

    return `${minsToDisplayTime(startMins)} – ${minsToDisplayTime(endMins)}`;
  })();

  /**
   * Per-property scheduled times for the SuccessModal summary.
   * Each entry shows the property address and its cascaded start time.
   */
  const successPropertyTimes = properties.map((p) => ({
    address: p.address ?? "Unknown address",
    time: p.startTime
      ? minsToDisplayTime(startTimeToMinutes(p.startTime) ?? 0)
      : "—",
  }));

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={sharedStyles.screenContainer}>
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.reviewContextCard}>
          <View style={styles.reviewClientRow}>
            <View style={styles.reviewAvatar}>
              <Text style={styles.reviewAvatarText}>
                {(routePlan.request?.clientName ?? "C").charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.reviewClientCopy}>
              <Text style={styles.reviewEyebrow}>FINAL ROUTE REVIEW</Text>
              <Text style={styles.reviewClientName} numberOfLines={1}>
                {routePlan.request?.clientName ?? "Tour client"}
              </Text>
            </View>
            <View
              style={[
                styles.readinessPill,
                isDirty && styles.readinessPillWarning,
                !isDirty && conflictCount > 0 && styles.readinessPillConflict,
              ]}
            >
              {isDirty || conflictCount > 0 ? (
                <AlertTriangle
                  size={12}
                  color={isDirty ? "#B45309" : colors.dangerText}
                  strokeWidth={2.4}
                />
              ) : (
                <ShieldCheck size={13} color="#15803D" strokeWidth={2.3} />
              )}
              <Text
                style={[
                  styles.readinessText,
                  isDirty && styles.readinessTextWarning,
                  !isDirty && conflictCount > 0 && styles.readinessTextConflict,
                ]}
              >
                {readinessLabel}
              </Text>
            </View>
          </View>

          <View style={styles.reviewScheduleRow}>
            <View style={styles.reviewScheduleItem}>
              <CalendarDays size={15} color={colors.blue} strokeWidth={2.1} />
              <Text style={styles.reviewScheduleText}>{routeDateLabel}</Text>
            </View>
            <View style={styles.reviewScheduleDivider} />
            <View style={styles.reviewScheduleItem}>
              <Clock3 size={15} color={colors.blue} strokeWidth={2.1} />
              <Text style={styles.reviewScheduleText}>
                {routePlan.request?.preferredStartTime ?? "Time unavailable"}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.overviewCard}>
          <View style={styles.overviewTop}>
            <View>
              <View style={styles.overviewEyebrowRow}>
                <Sparkles size={13} color="#BFDBFE" strokeWidth={2.2} />
                <Text style={styles.distanceLabel}>ROUTE READY TO REVIEW</Text>
              </View>
              <Text style={styles.distanceValue}>
                {formatDistance(totalDistanceMetres)}
              </Text>
            </View>
            <View style={styles.driveTimePill}>
              <Clock3 size={14} color="#DBEAFE" strokeWidth={2.1} />
              <Text style={styles.driveTimePillText}>
                {formatDuration(drivingSeconds)} driving
              </Text>
            </View>
          </View>

          <KPIStrip
            stops={properties.length}
            driveDurationSeconds={drivingSeconds}
            viewingDurationSeconds={viewingSeconds}
          />
        </View>

        <View style={styles.mapCard}>
          <MiniMap
            stops={routePlan.stops}
            start={routePlan.start}
            overviewPolyline={routePlan.summary.overviewPolyline}
            viewport={routePlan.summary.viewport}
          />
          <View style={styles.mapFooter}>
            <View style={styles.mapFooterLabel}>
              <Route size={15} color={colors.blue} strokeWidth={2.2} />
              <Text style={styles.mapFooterText}>Optimized route preview</Text>
            </View>
            <Text style={styles.mapStopCount}>
              {properties.length} {properties.length === 1 ? "stop" : "stops"}
            </Text>
          </View>
        </View>

        <SortControls sortBy={sortBy} onSortChange={onSortChange} />

        {isDirty && (
          <View style={styles.dirtyBanner}>
            <View style={styles.dirtyBannerIcon}>
              <AlertTriangle size={17} color="#B45309" strokeWidth={2.3} />
            </View>
            <View style={styles.dirtyBannerCopy}>
              <Text style={styles.dirtyBannerTitle}>Route needs recalculation</Text>
              <Text style={styles.dirtyBannerText}>
                Your changes must be recalculated before approval.
              </Text>
            </View>
          </View>
        )}

        <View
          style={[
            styles.startSummaryRow,
            hasFirstLeg && styles.startSummaryRowWithLeg,
          ]}
        >
          <View style={styles.startSummaryIcon}>
            <LocateFixed size={18} color={colors.blue} strokeWidth={2.2} />
          </View>
          <View style={styles.startSummaryCopy}>
            <Text style={styles.startSummaryLabel}>ROUTE STARTS HERE</Text>
            <Text style={styles.startSummaryValue} numberOfLines={2}>
              {startLabel}
            </Text>
            {!!routePlan.start?.addressText
              && routePlan.start.addressText !== startLabel && (
                <Text style={styles.startSummaryAddress} numberOfLines={2}>
                  {routePlan.start.addressText}
                </Text>
              )}
          </View>
          <TouchableOpacity
            style={styles.changeBtn}
            onPress={onBack}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel="Change route starting point"
          >
            <Text style={styles.changeBtnText}>Change</Text>
          </TouchableOpacity>
        </View>

        {hasFirstLeg && (
          <View style={styles.firstLegCard}>
            <View style={styles.firstLegHeader}>
              <View style={styles.firstLegIcon}>
                <CarFront size={17} color={colors.blue} strokeWidth={2.25} />
              </View>
              <View style={styles.firstLegHeadingCopy}>
                <Text style={styles.firstLegEyebrow}>FIRST LEG · TO STOP 1</Text>
                <Text style={styles.firstLegDestination} numberOfLines={1}>
                  {firstRouteStop.address}
                </Text>
              </View>
            </View>

            <View style={styles.firstLegTimes}>
              <View style={styles.firstLegTimeBlock}>
                <Text style={styles.firstLegTimeLabel}>LEAVE START POINT</Text>
                <Text style={styles.firstLegTimeValue}>
                  {firstLegDepartureLabel}
                </Text>
              </View>
              <View style={styles.firstLegArrow}>
                <View style={styles.firstLegArrowLine} />
                <ArrowRight size={16} color={colors.blue} strokeWidth={2.25} />
              </View>
              <View style={[styles.firstLegTimeBlock, styles.firstLegArrival]}>
                <Text style={styles.firstLegTimeLabel}>ARRIVE STOP 1</Text>
                <Text style={styles.firstLegTimeValue}>
                  {firstLegArrivalLabel}
                </Text>
              </View>
            </View>

            <View style={styles.firstLegMetrics}>
              <Text style={styles.firstLegMetric}>
                {firstRouteStop.distanceLabelFromPrevious
                  || formatDistance(firstRouteStop.driveDistanceMetersFromPrevious)}
              </Text>
              <View style={styles.firstLegMetricDot} />
              <Text style={styles.firstLegMetric}>
                {formatDuration(firstLegDriveSeconds)} drive
              </Text>
              {routePlan.summary?.liveTrafficEnabled && (
                <>
                  <View style={styles.firstLegMetricDot} />
                  <Text style={styles.firstLegTraffic}>Live traffic</Text>
                </>
              )}
            </View>
          </View>
        )}

        <View style={styles.itineraryHeader}>
          <View>
            <Text style={styles.itineraryTitle}>Review itinerary</Text>
            <Text style={styles.itinerarySubtitle}>
              Tap a time or duration to make changes
            </Text>
            <Text style={styles.itineraryDate}>Date: {routeDateLabel}</Text>
          </View>
          <View style={styles.itineraryCount}>
            <Text style={styles.itineraryCountText}>{properties.length}</Text>
          </View>
        </View>

        {properties.map((property, index) => {
          const routeStop = orderedRouteStops.find(
            (stop) => stop.requestedPropertyId === property.requestedPropertyId,
          );
          const hasPreviousLeg =
            index > 0
            && routeStop?.driveDistanceMetersFromPrevious != null
            && routeStop?.driveDurationSecondsFromPrevious != null;

          return (
            <React.Fragment key={property.id}>
              {hasPreviousLeg && (
                <View style={styles.travelConnector}>
                  <View style={styles.travelConnectorLine} />
                  <View style={styles.travelConnectorPill}>
                    <CarFront size={13} color={colors.blue} strokeWidth={2.2} />
                    <Text style={styles.travelConnectorText}>
                      {routeStop.distanceLabelFromPrevious
                        || formatDistance(routeStop.driveDistanceMetersFromPrevious)}
                      {" · "}
                      {formatDuration(routeStop.driveDurationSecondsFromPrevious)} drive
                    </Text>
                  </View>
                  <View style={styles.travelConnectorLine} />
                </View>
              )}
              <RoutePropertyCard
                property={property}
                index={index}
                routeDateLabel={formatRouteDate(
                  routeStop?.scheduledStartAt
                  ?? routeStop?.etaAt
                  ?? property.scheduledStartAt
                  ?? routePlan.request?.preferredDate,
                  routeTimezone,
                )}
                onRemove={handleRemovePress}
                onUpdate={handleUpdateProperty}
              />
            </React.Fragment>
          );
        })}

      </ScrollView>

      <View style={styles.stickyFooter}>
        <View style={styles.footerSummary}>
          <View>
            <Text style={styles.footerSummaryLabel}>COMPLETE TOUR</Text>
            <Text style={styles.footerSummaryText}>{totalSummary}</Text>
          </View>
          {conflictCount > 0 && (
            <View style={styles.footerConflictPill}>
              <AlertTriangle size={12} color="#B45309" strokeWidth={2.4} />
              <Text style={styles.footerConflict}>
                {conflictCount} {conflictCount === 1 ? "conflict" : "conflicts"}
              </Text>
            </View>
          )}
        </View>

        {approveError || rejectError ? (
          <View style={styles.footerErrorCallout}>
            <AlertTriangle size={15} color="#B42318" strokeWidth={2.4} />
            <Text style={styles.footerErrorText}>{approveError || rejectError}</Text>
          </View>
        ) : null}

        <View style={styles.footerActions}>
          <TouchableOpacity
            style={[
              styles.rejectButton,
              styles.footerBtn,
              rejectDisabled && styles.footerBtnDisabled,
            ]}
            onPress={handleReject}
            activeOpacity={0.85}
            disabled={rejectDisabled}
          >
            {isRejectSubmitting ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <>
                <X size={17} color={colors.white} strokeWidth={2.8} />
                <Text style={styles.rejectButtonText}>Reject</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.recalculateButton,
              styles.footerBtn,
              isDirty && styles.recalculateBtnDirty,
              (isRecalculating || isStatusUpdating) && styles.footerBtnDisabled,
            ]}
            onPress={handleRecalculate}
            activeOpacity={0.8}
            disabled={isRecalculating || isStatusUpdating}
          >
            {isRecalculating ? (
              <ActivityIndicator
                size="small"
                color={isDirty ? colors.white : colors.blue}
              />
            ) : (
              <>
                <RefreshCw
                  size={16}
                  color={isDirty ? colors.white : colors.blue}
                  strokeWidth={2.3}
                />
                <Text
                  style={[
                    styles.recalculateButtonText,
                    isDirty && styles.recalculateBtnDirtyText,
                  ]}
                >
                  Re-calculate
                </Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.approveButton,
              styles.footerBtn,
              approveDisabled && styles.footerBtnDisabled,
            ]}
            onPress={handleApprove}
            activeOpacity={0.85}
            disabled={approveDisabled}
          >
            {isApproveSubmitting ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <>
                <Check size={17} color={colors.white} strokeWidth={2.8} />
                <Text style={styles.approveButtonText}>Approve</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Remove Property Modal ────────────────────────────────────────── */}
      <RemovePropertyModal
        visible={propertyToDelete !== null}
        property={propertyToDelete}
        onMoveToNew={handleMoveToNew}
        onDelete={handleConfirmDelete}
        onCancel={handleCancelDelete}
        isMoving={isMoving}
        isDeleting={isDeleting}
      />

      {/* ── Success Modal ─────────────────────────────────────────────────── */}
      <SuccessModal
        visible={showSuccessModal}
        clientName={successClientName}
        date={successDate}
        timeRange={successTimeRange}
        propertyCount={successPropertyCount}
        propertyTimes={successPropertyTimes}
        onViewDashboard={() => {
          setShowSuccessModal(false);
          onApproveSuccess();
        }}
      />
    </View>
  );
};

export default RouteScreen;

// ─── Screen Styles ────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scrollArea: {
    flex: 1,
    backgroundColor: "#F4F7FB",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  reviewContextCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E3EAF3",
    marginBottom: 14,
    overflow: "hidden",
    ...shadow.card,
  },
  reviewClientRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
  },
  reviewAvatar: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.blue,
    marginRight: 10,
  },
  reviewAvatarText: {
    fontSize: 17,
    color: colors.white,
    fontWeight: "800",
  },
  reviewClientCopy: {
    flex: 1,
    minWidth: 0,
  },
  reviewEyebrow: {
    fontSize: 8,
    lineHeight: 11,
    color: colors.textMuted,
    fontWeight: "800",
    letterSpacing: 0.7,
  },
  reviewClientName: {
    marginTop: 2,
    fontSize: 16,
    lineHeight: 21,
    color: colors.textPrimary,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  readinessPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 999,
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 9,
    paddingVertical: 6,
    marginLeft: 8,
  },
  readinessPillWarning: {
    backgroundColor: "#FEF3C7",
  },
  readinessPillConflict: {
    backgroundColor: colors.dangerBg,
  },
  readinessText: {
    fontSize: 9,
    lineHeight: 13,
    color: "#15803D",
    fontWeight: "800",
  },
  readinessTextWarning: {
    color: "#B45309",
  },
  readinessTextConflict: {
    color: colors.dangerText,
  },
  reviewScheduleRow: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FBFCFE",
    borderTopWidth: 1,
    borderTopColor: "#EDF1F6",
    paddingHorizontal: 14,
  },
  reviewScheduleItem: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  reviewScheduleDivider: {
    width: 1,
    height: 20,
    backgroundColor: "#E2E8F0",
    marginHorizontal: 12,
  },
  reviewScheduleText: {
    flexShrink: 1,
    fontSize: 11,
    lineHeight: 15,
    color: colors.textSecondary,
    fontWeight: "700",
  },
  overviewCard: {
    backgroundColor: "#16347F",
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    ...shadow.card,
  },
  overviewTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 17,
  },
  overviewEyebrowRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  distanceLabel: {
    fontSize: 9,
    lineHeight: 13,
    color: "#BFDBFE",
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  distanceValue: {
    marginTop: 4,
    fontSize: 30,
    lineHeight: 37,
    fontWeight: "800",
    color: colors.white,
    letterSpacing: -0.6,
  },
  driveTimePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 9,
    paddingVertical: 7,
  },
  driveTimePillText: {
    fontSize: 10,
    lineHeight: 14,
    color: "#EFF6FF",
    fontWeight: "600",
  },
  kpiStrip: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.15)",
    paddingTop: 14,
  },
  kpiItem: {
    flex: 1,
    alignItems: "center",
  },
  kpiItemBorder: {
    borderRightWidth: 1,
    borderRightColor: "rgba(255,255,255,0.15)",
  },
  kpiLabel: {
    marginTop: 2,
    fontSize: 9,
    lineHeight: 13,
    color: "#BFDBFE",
    textTransform: "uppercase",
    fontWeight: "700",
    letterSpacing: 0.45,
  },
  kpiValue: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: "800",
    color: colors.white,
  },
  mapCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E3EAF3",
    padding: 6,
    marginBottom: 14,
    overflow: "hidden",
    ...shadow.card,
  },
  mapFooter: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
  },
  mapFooterLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  mapFooterText: {
    fontSize: 12,
    color: colors.textPrimary,
    fontWeight: "700",
  },
  mapStopCount: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: "700",
  },
  sortCard: {
    backgroundColor: colors.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E3EAF3",
    padding: 14,
    marginBottom: 14,
  },
  sortCardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sortByLabel: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  sortBySubtext: {
    marginTop: 1,
    fontSize: 10,
    lineHeight: 14,
    color: colors.textSecondary,
  },
  trafficPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.successBg,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  trafficPillText: {
    fontSize: 10,
    color: "#15803D",
    fontWeight: "700",
  },
  sortOptions: {
    flexDirection: "row",
    gap: 8,
    padding: 3,
    borderRadius: 13,
    backgroundColor: "#F1F5F9",
  },
  sortBtn: {
    flex: 1,
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 10,
    backgroundColor: "transparent",
  },
  sortBtnActive: {
    backgroundColor: colors.blue,
  },
  sortBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textSecondary,
  },
  sortBtnTextActive: {
    color: colors.white,
  },
  dirtyBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFBEB",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#FDE68A",
    padding: 12,
    marginBottom: 14,
  },
  dirtyBannerIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FEF3C7",
    marginRight: 9,
  },
  dirtyBannerCopy: {
    flex: 1,
  },
  dirtyBannerTitle: {
    fontSize: 12,
    lineHeight: 16,
    color: "#92400E",
    fontWeight: "800",
  },
  dirtyBannerText: {
    marginTop: 1,
    fontSize: 10,
    lineHeight: 15,
    color: "#B45309",
  },
  startSummaryRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E3EAF3",
    padding: 13,
    marginBottom: 22,
  },
  startSummaryRowWithLeg: {
    marginBottom: 10,
  },
  startSummaryIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.blueLight,
    marginRight: 10,
  },
  startSummaryCopy: {
    flex: 1,
    minWidth: 0,
  },
  startSummaryLabel: {
    fontSize: 9,
    lineHeight: 12,
    color: colors.textMuted,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  startSummaryValue: {
    marginTop: 2,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  startSummaryAddress: {
    marginTop: 2,
    fontSize: 10,
    lineHeight: 15,
    color: colors.textSecondary,
  },
  changeBtn: {
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 7,
    backgroundColor: colors.blueLight,
    marginLeft: 10,
  },
  changeBtnText: {
    fontSize: 11,
    color: colors.blue,
    fontWeight: "700",
  },
  firstLegCard: {
    backgroundColor: colors.blueLight,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.blueBorder,
    padding: 14,
    marginBottom: 22,
  },
  firstLegHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  firstLegIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
    marginRight: 9,
  },
  firstLegHeadingCopy: {
    flex: 1,
    minWidth: 0,
  },
  firstLegEyebrow: {
    fontSize: 9,
    lineHeight: 12,
    color: colors.blue,
    fontWeight: "800",
    letterSpacing: 0.7,
  },
  firstLegDestination: {
    marginTop: 2,
    fontSize: 11,
    lineHeight: 16,
    color: colors.textSecondary,
    fontWeight: "600",
  },
  firstLegTimes: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 14,
  },
  firstLegTimeBlock: {
    flex: 1,
  },
  firstLegArrival: {
    alignItems: "flex-end",
  },
  firstLegTimeLabel: {
    fontSize: 8,
    lineHeight: 11,
    color: colors.textMuted,
    fontWeight: "800",
    letterSpacing: 0.45,
  },
  firstLegTimeValue: {
    marginTop: 2,
    fontSize: 18,
    lineHeight: 23,
    color: colors.textPrimary,
    fontWeight: "800",
  },
  firstLegArrow: {
    width: 60,
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 8,
  },
  firstLegArrowLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#93B4F4",
  },
  firstLegMetrics: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#D7E5FC",
    paddingTop: 10,
  },
  firstLegMetric: {
    fontSize: 10,
    lineHeight: 15,
    color: colors.blue,
    fontWeight: "700",
  },
  firstLegMetricDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.textMuted,
    marginHorizontal: 8,
  },
  firstLegTraffic: {
    fontSize: 10,
    lineHeight: 15,
    color: "#15803D",
    fontWeight: "700",
  },
  itineraryHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  itineraryTitle: {
    fontSize: 19,
    lineHeight: 25,
    fontWeight: "800",
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
  itinerarySubtitle: {
    marginTop: 1,
    fontSize: 11,
    lineHeight: 16,
    color: colors.textSecondary,
  },
  itineraryDate: {
    marginTop: 2,
    fontSize: 11,
    lineHeight: 16,
    color: colors.textSecondary,
    fontWeight: "600",
  },
  itineraryCount: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.blueLight,
  },
  itineraryCountText: {
    fontSize: 13,
    color: colors.blue,
    fontWeight: "800",
  },
  travelConnector: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    marginTop: -2,
    marginBottom: 10,
  },
  travelConnectorLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#CBDCFB",
  },
  travelConnectorPill: {
    maxWidth: "78%",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    backgroundColor: colors.blueLight,
    borderWidth: 1,
    borderColor: colors.blueBorder,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginHorizontal: 8,
  },
  travelConnectorText: {
    flexShrink: 1,
    fontSize: 10,
    lineHeight: 14,
    color: colors.blue,
    fontWeight: "700",
    textAlign: "center",
  },
  stickyFooter: {
    backgroundColor: colors.white,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 13,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    ...shadow.footer,
  },
  footerSummary: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 9,
  },
  footerSummaryLabel: {
    fontSize: 8,
    lineHeight: 11,
    color: colors.textMuted,
    fontWeight: "800",
    letterSpacing: 0.65,
  },
  footerSummaryText: {
    marginTop: 1,
    fontSize: 11,
    lineHeight: 16,
    color: colors.textSecondary,
    fontWeight: "600",
  },
  footerConflictPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 999,
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginLeft: 8,
  },
  footerConflict: {
    fontSize: 9,
    color: "#B45309",
    fontWeight: "800",
  },
  footerErrorCallout: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FECDCA",
    backgroundColor: "#FEF3F2",
    paddingHorizontal: 10,
    paddingVertical: 9,
    marginBottom: 10,
  },
  footerErrorText: {
    flex: 1,
    minWidth: 0,
    fontSize: 11,
    lineHeight: 16,
    color: "#B42318",
    fontWeight: "700",
  },
  footerActions: {
    flexDirection: "row",
    gap: 7,
  },
  footerBtn: {
    flex: 1,
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 13,
    paddingHorizontal: 8,
  },
  recalculateButton: {
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.blue,
  },
  recalculateButtonText: {
    fontSize: 11,
    color: colors.blue,
    fontWeight: "800",
  },
  approveButton: {
    backgroundColor: colors.blue,
  },
  approveButtonText: {
    fontSize: 11,
    color: colors.white,
    fontWeight: "800",
  },
  rejectButton: {
    backgroundColor: "#D32F2F",
  },
  rejectButtonText: {
    fontSize: 11,
    color: colors.white,
    fontWeight: "800",
  },
  footerBtnDisabled: {
    opacity: 0.45,
  },
  recalculateBtnDirty: {
    backgroundColor: colors.blue,
    borderColor: colors.blue,
  },
  recalculateBtnDirtyText: {
    color: colors.white,
  },
});
