/**
 * @file screens/PersonalCalendarScreen.tsx
 * @description Month calendar view showing scheduled/completed/in-progress tours.
 *              Tapping a date reveals that day's tours with time, client, and status.
 *              Fetches client tours for role === 'client' and agent tours otherwise.
 */

import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';

import {
  colors,
  typography,
  spacing,
  space,
  border,
  radius,
  shadows,
  globalStyles,
} from '@/theme';
import { fetchAgentTourList, fetchClientTourList } from '@/lib/tourApi'; // adjust path to match your project
import { API_GLOBAL_PATHS } from '@/lib/apiGlobalPaths'; // adjust path to match your project
import { useAuth } from "../contexts/AuthContext";
import { useNavigation } from '@react-navigation/native';
import { AgentFooter } from './agent/components/AgentFooter';
import { ClientFooter } from './client/components/ClientFooter';

// ─── Types ──────────────────────────────────────────────────────────────────

export type TourStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

export interface AgentTour {
  id: string;
  agentId: number;
  clientProfileId: number;
  clientDisplayName: string;
  groupId: number;
  scheduledDate: string;
  startTime: string;
  endTime: string | null;
  status: TourStatus | string;
  totalDistance: number;
  agentTravelDistanceKm: number;
  estimatedDurationMinutes: number | null;
  actualDurationMinutes: number | null;
  notes: string | null;
  timezone: null,
  createdAt: string;
  updatedAt: string;
}

interface ParsedNotes {
  intent?: string;
  comments?: string;
  timeline?: string;
  priorities?: string[];
}

// ─── Fetch + Hook (role-aware; follows existing fetch-fn + query-key + hook pattern) ───

export const useMyTours = (role: 'agent' | 'client' | 'brokerage' | 'admin' | undefined) => {
  const isClient = role === 'client';

  return useQuery({
    queryKey: isClient ? [API_GLOBAL_PATHS.clientTours] : [API_GLOBAL_PATHS.agentTours],
    queryFn: () => (isClient ? fetchClientTourList() : fetchAgentTourList()),
    enabled: !!role,
  });
};

// ─── Status → color mapping ────────────────────────────────────────────────

const STATUS_COLOR: Record<string, string> = {
  scheduled: colors.primary.default,
  in_progress: colors.warning.default,
  completed: colors.success.default,
  cancelled: colors.error.default,
};

const STATUS_LABEL: Record<string, string> = {
  scheduled: 'Scheduled',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

// ─── Date helpers (no external date lib) ───────────────────────────────────

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const toDateKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const isSameDay = (a: Date, b: Date) => toDateKey(a) === toDateKey(b);

const formatTime = (isoString: string | null) => {
  if (!isoString) return '—';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
};

const buildMonthGrid = (year: number, month: number): (Date | null)[] => {
  const firstOfMonth = new Date(year, month, 1);
  const startOffset = firstOfMonth.getDay(); // 0 = Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (Date | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) cells.push(new Date(year, month, day));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
};

// ─── Component ──────────────────────────────────────────────────────────────

export default function PersonalCalendarScreen() {
  const { user } = useAuth();
  const { data: tours = [], isLoading, isError, refetch } = useMyTours(user?.role);

  const navigation = useNavigation<any>();

  const today = useMemo(() => new Date(), []);
  const [visibleMonth, setVisibleMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState<Date>(today);

  // Group tours by date key (using scheduledDate as the calendar anchor)
  const toursByDate = useMemo(() => {
    const map: Record<string, AgentTour[]> = {};
    tours.forEach((tour: AgentTour) => {
      const d = new Date(tour.scheduledDate);
      if (isNaN(d.getTime())) return;
      const key = toDateKey(d);
      if (!map[key]) map[key] = [];
      map[key].push(tour);
    });
    // Sort each day's tours by start time
    Object.values(map).forEach((list) =>
      list.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
    );
    return map;
  }, [tours]);

  const monthGrid = useMemo(
    () => buildMonthGrid(visibleMonth.getFullYear(), visibleMonth.getMonth()),
    [visibleMonth]
  );

  const selectedDayTours = toursByDate[toDateKey(selectedDate)] ?? [];

  const goToPrevMonth = useCallback(() => {
    setVisibleMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  }, []);

  const goToNextMonth = useCallback(() => {
    setVisibleMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  }, []);

  const goToToday = useCallback(() => {
    setVisibleMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDate(today);
  }, [today]);

  const parseNotes = (notes: string | null): ParsedNotes | null => {
    if (!notes) return null;
    try {
      return JSON.parse(notes);
    } catch {
      return { comments: notes };
    }
  };

  return (
    <>
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={typography.screenTitle}>My Calendar</Text>
        <TouchableOpacity onPress={goToToday} style={styles.todayBtn}>
          <Text style={styles.todayBtnText}>Today</Text>
        </TouchableOpacity>
      </View>

      {/* Month navigation */}
      <View style={[styles.monthNavCard, shadows.card]}>
        <TouchableOpacity onPress={goToPrevMonth} hitSlop={8} style={styles.navArrow}>
          <Ionicons name="chevron-back" size={22} color={colors.text.primary} />
        </TouchableOpacity>

        <Text style={styles.monthLabel}>
          {MONTH_NAMES[visibleMonth.getMonth()]} {visibleMonth.getFullYear()}
        </Text>

        <TouchableOpacity onPress={goToNextMonth} hitSlop={8} style={styles.navArrow}>
          <Ionicons name="chevron-forward" size={22} color={colors.text.primary} />
        </TouchableOpacity>
      </View>

      {/* Weekday header */}
      <View style={styles.weekdayRow}>
        {WEEKDAY_LABELS.map((label, idx) => (
          <View key={`${label}-${idx}`} style={styles.weekdayCell}>
            <Text style={styles.weekdayText}>{label}</Text>
          </View>
        ))}
      </View>

      {/* Calendar grid */}
      {isLoading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={colors.primary.default} />
        </View>
      ) : isError ? (
        <View style={styles.loadingBox}>
          <Text style={styles.errorText}>Couldn't load tours.</Text>
          <TouchableOpacity onPress={() => refetch()} style={styles.retryBtn}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.gridWrap}>
          {monthGrid.map((cellDate, idx) => {
            if (!cellDate) return <View key={`empty-${idx}`} style={styles.dayCell} />;

            const key = toDateKey(cellDate);
            const dayTours = toursByDate[key] ?? [];
            const isSelected = isSameDay(cellDate, selectedDate);
            const isToday = isSameDay(cellDate, today);

            // Dominant status color: prefer in_progress > scheduled > completed > cancelled
            const priority: TourStatus[] = ['in_progress', 'scheduled', 'completed', 'cancelled'];
            const dominant = priority.find((s) => dayTours.some((t) => t.status === s));
            const dotColor = dominant ? STATUS_COLOR[dominant] : undefined;

            return (
              <TouchableOpacity
                key={key}
                style={[
                  styles.dayCell,
                  isSelected && styles.dayCellSelected,
                  isToday && !isSelected && styles.dayCellToday,
                ]}
                onPress={() => setSelectedDate(cellDate)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.dayNumber,
                    isSelected && styles.dayNumberSelected,
                    isToday && !isSelected && styles.dayNumberToday,
                  ]}
                >
                  {cellDate.getDate()}
                </Text>
                {dayTours.length > 0 && (
                  <View style={styles.dotsRow}>
                    {dayTours.slice(0, 3).map((t, i) => (
                      <View
                        key={t.id}
                        style={[
                          styles.dot,
                          { backgroundColor: STATUS_COLOR[t.status] ?? colors.text.muted },
                          i > 0 && { marginLeft: 2 },
                        ]}
                      />
                    ))}
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Legend */}
      <View style={styles.legendRow}>
        {(['scheduled', 'in_progress', 'completed', 'cancelled'] as TourStatus[]).map((s) => (
          <View key={s} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: STATUS_COLOR[s] }]} />
            <Text style={styles.legendText}>{STATUS_LABEL[s]}</Text>
          </View>
        ))}
      </View>

      {/* Selected day tour list */}
      <View style={styles.selectedDateHeader}>
        <Text style={typography.h3}>
          {selectedDate.toLocaleDateString(undefined, {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          })}
        </Text>
        <Text style={styles.tourCountText}>
          {selectedDayTours.length} {selectedDayTours.length === 1 ? 'tour' : 'tours'}
        </Text>
      </View>

      {selectedDayTours.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="calendar-outline" size={36} color={colors.text.muted} />
          <Text style={styles.emptyStateText}>No tours scheduled for this day.</Text>
        </View>
      ) : (
        <View style={{ gap: space.xl }}>
          {selectedDayTours.map((tour) => {
            const notes = parseNotes(tour.notes);
            const statusColor = STATUS_COLOR[tour.status] ?? colors.text.muted;

            return (
              <TouchableOpacity
                activeOpacity={0.7}
                key={tour.id} style={[styles.tourCard, shadows.card]}
                onPress={() => navigation.navigate("TourDetails", { tourId: tour.id })}
              >
              
                <View style={styles.tourCardTopRow}>
                  <View style={styles.timeBlock}>
                    <Ionicons name="time-outline" size={16} color={colors.text.secondary} />
                    <Text style={styles.timeText}>
                      {formatTime(tour.startTime)}
                      {tour.endTime ? ` – ${formatTime(tour.endTime)}` : ''}
                    </Text>
                  </View>

                  <View style={[styles.statusBadge, { backgroundColor: `${statusColor}1A` }]}>
                    <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                    <Text style={[styles.statusBadgeText, { color: statusColor }]}>
                      {STATUS_LABEL[tour.status] ?? tour.status}
                    </Text>
                  </View>
                </View>

                <Text style={styles.clientName}>{tour.clientDisplayName}</Text>

                <View style={styles.metaRow}>
                  <Ionicons name="navigate-outline" size={14} color={colors.text.muted} />
                  <Text style={styles.metaText}>
                    {tour.totalDistance ? `${tour.totalDistance.toFixed(1)} km route` : 'Distance N/A'}
                  </Text>
                  {tour.estimatedDurationMinutes ? (
                    <>
                      <View style={styles.metaDivider} />
                      <Ionicons name="hourglass-outline" size={14} color={colors.text.muted} />
                      <Text style={styles.metaText}>{tour.estimatedDurationMinutes} min est.</Text>
                    </>
                  ) : null}
                </View>

                {notes?.comments ? (
                  <View style={styles.noteBox}>
                    <Text style={styles.noteText} numberOfLines={2}>
                      {notes.comments}
                    </Text>
                  </View>
                ) : null}

                {notes?.priorities && notes.priorities.length > 0 && (
                  <View style={styles.chipRow}>
                    {notes.priorities.map((p) => (
                      <View key={p} style={styles.chip}>
                        <Text style={styles.chipText}>{p.replace(/_/g, ' ')}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </ScrollView>
    {user?.role === 'agent' ? <AgentFooter /> : <ClientFooter />}
    </>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background.screen,
  },
  scrollContent: {
    paddingHorizontal: spacing['3xl'],
    paddingTop: spacing['6xl'],
    paddingBottom: spacing['9xl'],
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing['3xl'],
  },
  todayBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.pill,
    backgroundColor: colors.primary.hover,
  },
  todayBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary.default,
  },
  monthNavCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background.surface,
    borderRadius: radius.card,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing['3xl'],
    marginBottom: spacing.xl,
  },
  navArrow: {
    padding: spacing.xs,
  },
  monthLabel: {
    ...typography.h2,
  },
  weekdayRow: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  weekdayCell: {
    flex: 1,
    alignItems: 'center',
  },
  weekdayText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text.muted,
  },
  gridWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: colors.background.surface,
    borderRadius: radius.card,
    paddingVertical: spacing.md,
    ...border.item,
  },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCellSelected: {
    backgroundColor: colors.primary.default,
    borderRadius: radius.pill,
  },
  dayCellToday: {
    borderWidth: border.width.thin,
    borderColor: colors.primary.default,
    borderRadius: radius.pill,
  },
  dayNumber: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.text.primary,
  },
  dayNumberSelected: {
    color: colors.text.inverse,
    fontWeight: '700',
  },
  dayNumberToday: {
    color: colors.primary.default,
    fontWeight: '700',
  },
  dotsRow: {
    flexDirection: 'row',
    marginTop: 2,
    height: 5,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  loadingBox: {
    paddingVertical: spacing['9xl'],
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background.surface,
    borderRadius: radius.card,
  },
  errorText: {
    fontSize: 13,
    color: colors.error.default,
    marginBottom: spacing.md,
  },
  retryBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing['3xl'],
    borderRadius: radius.btn,
    backgroundColor: colors.primary.default,
  },
  retryBtnText: {
    color: colors.text.inverse,
    fontWeight: '600',
    fontSize: 13,
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.xl,
    marginBottom: spacing['6xl'],
    gap: spacing.xl,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: spacing.xs,
  },
  legendText: {
    fontSize: 11,
    color: colors.text.secondary,
  },
  selectedDateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
  },
  tourCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.muted,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing['9xl'],
    backgroundColor: colors.background.surface,
    borderRadius: radius.card,
  },
  emptyStateText: {
    fontSize: 13,
    color: colors.text.muted,
    marginTop: spacing.md,
  },
  tourCard: {
    backgroundColor: colors.background.surface,
    borderRadius: radius.card,
    padding: spacing['4xl'],
    ...border.item,
  },
  tourCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  timeBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  timeText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.primary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    gap: 4,
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  clientName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    color: colors.text.muted,
    marginLeft: 2,
  },
  metaDivider: {
    width: 1,
    height: 10,
    backgroundColor: colors.border.default,
    marginHorizontal: spacing.sm,
  },
  noteBox: {
    marginTop: spacing.md,
    backgroundColor: colors.note.bg,
    borderColor: colors.note.border,
    borderWidth: border.width.thin,
    borderRadius: radius.item,
    padding: spacing.md,
  },
  noteText: {
    fontSize: 12,
    color: colors.note.text,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  chip: {
    backgroundColor: colors.background.badge,
    borderRadius: radius.pill,
    paddingVertical: 3,
    paddingHorizontal: spacing.md,
  },
  chipText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.text.badge,
    textTransform: 'capitalize',
  },
});


