import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  CarFront,
  Check,
  Clock3,
  Flag,
  Navigation,
  Radio,
  Sparkles,
} from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import type {
  RoutePlanResponse,
  RoutePlanStop,
} from '@/lib/agentRoutePlanningAPI';
import { useClientRoutePlan } from '@/lib/agentRoutePlanningAPI';
import { useTourRoute } from '@/lib/tourApi';
import { ClientFooter } from '@/screens/client/components/ClientFooter';
import { AgentFooter } from '../../components/AgentFooter';
import MiniMap from '../components/common/MiniMap';
import {
  colors,
  spacing,
  radius,
  border,
  shadows,
  globalStyles,
  fontSize,
  fontWeight,
} from '@/theme';
import { IconButton, NormalButton, getVariantColor } from '@/components/common/ST_Buttons';

interface RouteDetailsScreenProps {
  tourId: string;
}

function formatDistance(metres: number | undefined | null): string {
  if (!metres) return '—';
  return `${(metres / 1000).toFixed(1)} km`;
}

function formatDuration(seconds: number | undefined | null): string {
  if (!seconds) return '—';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

function safeTimezone(timezone: string | undefined | null): string | undefined {
  if (!timezone) return undefined;
  try {
    Intl.DateTimeFormat('en-US', { timeZone: timezone }).format(new Date());
    return timezone;
  } catch {
    return undefined;
  }
}

function formatScheduledTime(iso: string | undefined | null, timezone?: string | null): string {
  if (!iso) return '—';
  const timeZone = safeTimezone(timezone);
  try {
    const date = new Date(iso);
    const day = date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      ...(timeZone ? { timeZone } : {}),
    });
    const time = date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      ...(timeZone ? { timeZone } : {}),
    });
    return `${day} · ${time}`;
  } catch {
    return iso;
  }
}

function formatTime(iso: string | undefined | null, timezone?: string | null): string {
  if (!iso) return '—';
  const timeZone = safeTimezone(timezone);
  try {
    return new Date(iso).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      ...(timeZone ? { timeZone } : {}),
    });
  } catch {
    return iso;
  }
}

function calculateDepartureTime(
  arrivalIso: string | undefined | null,
  driveSeconds: number | undefined | null,
  timezone?: string | null,
): string {
  if (!arrivalIso || driveSeconds == null) return '—';
  const arrivalTime = new Date(arrivalIso).getTime();
  if (Number.isNaN(arrivalTime)) return '—';
  return formatTime(new Date(arrivalTime - driveSeconds * 1000).toISOString(), timezone);
}

function formatDate(iso: string | undefined | null, timezone?: string | null): string {
  if (!iso) return '—';
  const timeZone = safeTimezone(timezone);
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      ...(timeZone ? { timeZone } : {}),
    });
  } catch {
    return iso;
  }
}

function formatMapPoint(
  latitude: number | undefined | null,
  longitude: number | undefined | null,
  fallbackAddress: string | undefined | null,
): string | null {
  if (
    latitude != null
    && longitude != null
    && Number.isFinite(latitude)
    && Number.isFinite(longitude)
  ) {
    return `${latitude},${longitude}`;
  }

  return fallbackAddress?.trim() || null;
}

const MetaItem: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
}> = ({ icon, label, value }) => (
  <View style={styles.metaItem}>
    <View style={styles.metaIcon}>{icon}</View>
    <View style={styles.metaCopy}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue} numberOfLines={1}>{value}</Text>
    </View>
  </View>
);

const Stat: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={styles.stat}>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const StopCard: React.FC<{
  stop: RoutePlanStop;
  index: number;
  isLast: boolean;
  timezone?: string | null;
}> = ({ stop, index, isLast, timezone }) => {
  const hasDrive =
    stop.driveDistanceMetersFromPrevious != null &&
    stop.driveDurationSecondsFromPrevious != null;

  return (
    <View style={styles.timelineItem}>
      <View style={styles.timelineRail}>
        <View style={styles.stopOrderBadge}>
          <Text style={styles.stopOrderText}>{stop.order}</Text>
        </View>
        {!isLast && <View style={styles.timelineLine} />}
      </View>

      <View style={styles.timelineContent}>
        {index > 0 && hasDrive && (
          <View style={styles.driveRow}>
            <CarFront size={14} color={colors.primary.default} strokeWidth={2.25} />
            <Text style={styles.driveText}>
              {stop.distanceLabelFromPrevious
                ?? formatDistance(stop.driveDistanceMetersFromPrevious)}
              {' · '}
              {formatDuration(stop.driveDurationSecondsFromPrevious)} drive
            </Text>
          </View>
        )}

        <View style={styles.stopCard}>
          <Text style={styles.stopEyebrow}>STOP {stop.order}</Text>
          <Text style={styles.stopAddress}>{stop.address}</Text>

          <View style={styles.schedulePanel}>
            <View style={styles.scheduleTime}>
              <Text style={styles.scheduleLabel}>ARRIVE</Text>
              <Text style={styles.scheduleValue}>{formatTime(stop.etaAt, timezone)}</Text>
            </View>
            <View style={styles.scheduleDivider} />
            <View style={styles.scheduleTime}>
              <Text style={styles.scheduleLabel}>VIEWING</Text>
              <Text style={styles.scheduleValue}>
                {formatTime(stop.scheduledStartAt, timezone)} – {formatTime(stop.scheduledEndAt, timezone)}
              </Text>
            </View>
            <View style={styles.durationPill}>
              <Clock3 size={12} color={colors.text.secondary} strokeWidth={2.25} />
              <Text style={styles.durationText}>{stop.viewingDurationMinutes} min</Text>
            </View>
          </View>

          <Text style={styles.stopDate}>{formatScheduledTime(stop.etaAt, timezone)}</Text>

          {!!stop.badges?.length && (
            <View style={styles.badgeRow}>
              {stop.badges.map((badge) => (
                <View key={badge} style={styles.badge}>
                  <Text style={styles.badgeText}>{badge}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

const WarningsPanel: React.FC<{
  warnings: RoutePlanResponse['warnings'];
}> = ({ warnings }) => {
  if (!warnings?.length) return null;

  return (
    <View style={styles.warningsPanel}>
      <View style={styles.warningHeading}>
        <AlertTriangle size={18} color={colors.warning.default} strokeWidth={2.25} />
        <Text style={styles.warningsPanelTitle}>Route advisories</Text>
      </View>
      {warnings.map((warning, index) => (
        <View
          key={`${warning.type}-${index}`}
          style={[styles.warningItem, index > 0 && styles.warningItemBorder]}
        >
          <Text style={styles.warningMessage}>{warning.message}</Text>
          {!!warning.suggestedAction && (
            <Text style={styles.warningSuggestion}>{warning.suggestedAction}</Text>
          )}
        </View>
      ))}
    </View>
  );
};

const RouteDetailsScreen: React.FC<RouteDetailsScreenProps> = ({ tourId }) => {
  const { user } = useAuth();
  const isClient = user?.role === 'client';
  const agentQuery = useTourRoute(isClient ? '' : tourId);
  const clientQuery = useClientRoutePlan(isClient ? tourId : '');
  const { data: routePlan, isLoading, isError, refetch } = isClient ? clientQuery : agentQuery;

  const sortedStops = useMemo(
    () => [...(routePlan?.stops ?? [])].sort(
      (first, second) => (first.order ?? 0) - (second.order ?? 0),
    ),
    [routePlan?.stops],
  );

  if (isLoading) {
    return (
      <View style={styles.centeredState}>
        <View style={styles.loadingIcon}>
          <Navigation size={24} color={colors.primary.default} strokeWidth={2.25} />
        </View>
        <ActivityIndicator size="small" color={colors.primary.default} />
        <Text style={styles.centeredStateTitle}>Building your route</Text>
        <Text style={styles.centeredStateText}>Loading stops and travel times…</Text>
      </View>
    );
  }

  if (isError || !routePlan) {
    return (
      <View style={styles.centeredState}>
        <View style={styles.errorIcon}>
          <AlertTriangle size={24} color={colors.error.default} strokeWidth={2.25} />
        </View>
        <Text style={styles.centeredStateTitle}>Route unavailable</Text>
        <Text style={styles.centeredStateText}>
          We couldn’t load these route details. Please try again later.
        </Text>
        {typeof refetch === 'function' && (
          <NormalButton
            label="Try again"
            variant="danger"
            size="md"
            fullWidth={false}
            style={styles.retryButton}
            onPress={() => refetch()}
          />
        )}
      </View>
    );
  }

  const summary = routePlan.summary;
  const routeTimezone = routePlan.start?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  const personName = (
    !isClient
      ? routePlan.request?.clientName
      : user?.agentDetails?.displayName
  ) ?? 'Tour client';
  const status = routePlan.request?.status ?? 'unknown';
  const isApproved = status.toLowerCase() === 'approved';
  const isPending = status.toLowerCase() === 'pending';
  const totalSummary = summary?.totalDurationSeconds
    ? `${formatDistance(summary.totalDistanceMeters)} · ${formatDuration(summary.totalDurationSeconds)} total`
    : 'Route summary unavailable';
  const firstStop = sortedStops[0];
  const hasFirstLeg =
    firstStop?.driveDistanceMetersFromPrevious != null
    && firstStop?.driveDurationSecondsFromPrevious != null;
  const firstLegDeparture = hasFirstLeg
    ? calculateDepartureTime(
      firstStop.etaAt,
      firstStop.driveDurationSecondsFromPrevious,
      routeTimezone,
    )
    : '—';

  const openDirections = async () => {
    const destinationStop = sortedStops.at(-1);
    if (!destinationStop) {
      Alert.alert('Directions unavailable', 'This route does not have any stops yet.');
      return;
    }

    const origin = formatMapPoint(
      routePlan.start?.latitude,
      routePlan.start?.longitude,
      routePlan.start?.addressText ?? routePlan.start?.label,
    );
    const destination = formatMapPoint(
      destinationStop.latitude,
      destinationStop.longitude,
      destinationStop.address,
    );
    const waypoints = sortedStops
      .slice(0, -1)
      .map((stop) => formatMapPoint(stop.latitude, stop.longitude, stop.address))
      .filter((point): point is string => point != null);

    if (!destination) {
      Alert.alert('Directions unavailable', 'The destination location is missing.');
      return;
    }

    const params = [
      'api=1',
      origin && `origin=${encodeURIComponent(origin)}`,
      `destination=${encodeURIComponent(destination)}`,
      waypoints.length > 0
        ? `waypoints=${encodeURIComponent(waypoints.join('|'))}`
        : null,
      'travelmode=driving',
      'dir_action=navigate',
    ].filter(Boolean).join('&');

    try {
      await Linking.openURL(`https://www.google.com/maps/dir/?${params}`);
    } catch {
      Alert.alert(
        'Could not open maps',
        'Please check that a maps app or browser is available.',
      );
    }
  };

  return (
    <View style={globalStyles.screenContainer}>
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.requestCard}>
          <View style={styles.requestHero}>
            <View style={styles.requestAvatar}>
              <Text style={styles.requestAvatarInitial}>
                {personName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.requestHeroText}>
              <Text style={styles.requestClientName}>{personName}</Text>
              <Text style={styles.requestHeroSub}>
                {isClient ? 'Your tour agent' : 'Tour client'}
              </Text>
            </View>
            <View
              style={[
                styles.statusPill,
                isApproved && styles.statusPillApproved,
                isPending && styles.statusPillPending,
              ]}
            >
              {isApproved && <Check size={12} color={colors.success.default} strokeWidth={3} />}
              <Text
                style={[
                  styles.statusPillText,
                  isApproved && styles.statusTextApproved,
                  isPending && styles.statusTextPending,
                ]}
              >
                {status}
              </Text>
            </View>
          </View>

          <View style={styles.requestMetaRow}>
            <MetaItem
              icon={<CalendarDays size={18} color={colors.primary.default} strokeWidth={2.1} />}
              label="Tour date"
              value={formatDate(routePlan.request?.preferredDate, routeTimezone)}
            />
            <View style={styles.metaDivider} />
            <MetaItem
              icon={<Clock3 size={18} color={colors.primary.default} strokeWidth={2.1} />}
              label="Starts at"
              value={routePlan.request?.preferredStartTime ?? '—'}
            />
          </View>
        </View>

        <View style={styles.overviewCard}>
          <View style={styles.overviewTop}>
            <View>
              <Text style={styles.overviewEyebrow}>ROUTE OVERVIEW</Text>
              <Text style={styles.distanceValue}>
                {formatDistance(summary?.totalDistanceMeters)}
              </Text>
            </View>
            <View style={styles.overviewDuration}>
              <Clock3 size={16} color={colors.primary.light} strokeWidth={2} />
              <Text style={styles.overviewDurationText}>
                {formatDuration(summary?.totalDriveDurationSeconds)} driving
              </Text>
            </View>
          </View>
          <View style={styles.statsRow}>
            <Stat label="Stops" value={String(sortedStops.length)} />
            <View style={styles.statDivider} />
            <Stat
              label="Drive time"
              value={formatDuration(summary?.totalDriveDurationSeconds)}
            />
            <View style={styles.statDivider} />
            <Stat
              label="Viewings"
              value={formatDuration(summary?.totalViewingDurationSeconds)}
            />
          </View>
        </View>

        <View style={styles.mapCard}>
          <MiniMap
            stops={routePlan.stops}
            start={routePlan.start}
            overviewPolyline={summary?.overviewPolyline}
            viewport={summary?.viewport}
          />
          <View style={styles.mapFooter}>
            <View style={styles.mapStatusRow}>
              <View style={styles.mapFooterItem}>
                <Sparkles size={15} color={colors.primary.default} strokeWidth={2.2} />
                <Text style={styles.mapFooterText}>
                  {summary?.isOptimized ? 'Optimized route' : 'Scheduled route'}
                </Text>
              </View>
              {summary?.liveTrafficEnabled && (
                <View style={styles.trafficStatus}>
                  <Radio size={13} color={colors.success.default} strokeWidth={2.2} />
                  <Text style={styles.trafficText}>Live traffic</Text>
                </View>
              )}
            </View>
            <IconButton
              icon={<Navigation size={14} color={getVariantColor('primary')} strokeWidth={2.3} />}
              label="Open directions"
              variant="primary"
              size="md"
              fullWidth
              onPress={openDirections}
            />
          </View>
        </View>

        <View style={[styles.startCard, !hasFirstLeg && styles.startCardNoLeg]}>
          <View style={styles.startIcon}>
            <Navigation size={18} color={colors.primary.default} fill={colors.primary.default} strokeWidth={2} />
          </View>
          <View style={styles.startCopy}>
            <Text style={styles.startLabel}>STARTING POINT</Text>
            <Text style={styles.startValue} numberOfLines={2}>
              {routePlan.start?.label ?? routePlan.start?.addressText ?? '—'}
            </Text>
          </View>
        </View>

        {hasFirstLeg && (
          <View style={styles.firstLegCard}>
            <View style={styles.firstLegHeader}>
              <View style={styles.firstLegCarIcon}>
                <CarFront size={17} color={colors.primary.default} strokeWidth={2.25} />
              </View>
              <View style={styles.firstLegHeadingCopy}>
                <Text style={styles.firstLegEyebrow}>FIRST LEG · TO STOP 1</Text>
                <Text style={styles.firstLegDestination} numberOfLines={1}>
                  {firstStop.address}
                </Text>
              </View>
            </View>

            <View style={styles.firstLegTimes}>
              <View style={styles.firstLegTimeBlock}>
                <Text style={styles.firstLegTimeLabel}>LEAVE START POINT</Text>
                <Text style={styles.firstLegTimeValue}>{firstLegDeparture}</Text>
              </View>
              <View style={styles.firstLegArrow}>
                <View style={styles.firstLegArrowLine} />
                <ArrowRight size={16} color={colors.primary.default} strokeWidth={2.25} />
              </View>
              <View style={[styles.firstLegTimeBlock, styles.firstLegArrival]}>
                <Text style={styles.firstLegTimeLabel}>ARRIVE STOP 1</Text>
                <Text style={styles.firstLegTimeValue}>
                  {formatTime(firstStop.etaAt, routeTimezone)}
                </Text>
              </View>
            </View>

            <View style={styles.firstLegMetrics}>
              <Text style={styles.firstLegMetric}>
                {firstStop.distanceLabelFromPrevious
                  ?? formatDistance(firstStop.driveDistanceMetersFromPrevious)}
              </Text>
              <View style={styles.metricDot} />
              <Text style={styles.firstLegMetric}>
                {formatDuration(firstStop.driveDurationSecondsFromPrevious)} drive
              </Text>
              {summary?.liveTrafficEnabled && (
                <>
                  <View style={styles.metricDot} />
                  <Text style={styles.firstLegTraffic}>Live traffic</Text>
                </>
              )}
            </View>
          </View>
        )}

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Your itinerary</Text>
            <Text style={styles.sectionSubtitle}>
              {sortedStops.length} {sortedStops.length === 1 ? 'property' : 'properties'} in route order
            </Text>
          </View>
          <View style={styles.sectionIcon}>
            <Flag size={17} color={colors.primary.default} strokeWidth={2.2} />
          </View>
        </View>

        <View style={styles.timeline}>
          {sortedStops.map((stop, index) => (
            <StopCard
              key={stop.id}
              stop={stop}
              index={index}
              isLast={index === sortedStops.length - 1}
              timezone={routeTimezone}
            />
          ))}
        </View>

        <WarningsPanel warnings={routePlan.warnings} />
      </ScrollView>

      <View style={styles.stickyFooter}>
        <View>
          <Text style={styles.footerLabel}>COMPLETE TOUR</Text>
          <Text style={styles.footerSummaryText}>{totalSummary}</Text>
        </View>
        {(summary?.conflictCount ?? 0) > 0 && (
          <View style={styles.conflictPill}>
            <AlertTriangle size={12} color={colors.warning.default} strokeWidth={2.5} />
            <Text style={styles.footerConflict}>
              {summary.conflictCount} {summary.conflictCount === 1 ? 'conflict' : 'conflicts'}
            </Text>
          </View>
        )}
      </View>

      {isClient ? <ClientFooter active="mytours" /> : <AgentFooter active="tours" />}
    </View>
  );
};

export default RouteDetailsScreen;

const styles = StyleSheet.create({
  scrollArea: {
    flex: 1,
    backgroundColor: colors.background.screen,
  },
  scrollContent: {
    paddingHorizontal: spacing['3xl'],
    paddingTop: spacing['3xl'],
    paddingBottom: spacing['6xl'] + spacing.xs,
  },
  centeredState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.feXxxl,
    backgroundColor: colors.background.screen,
  },
  loadingIcon: {
    width: 52,
    height: 52,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary.light,
    marginBottom: spacing['3xl'],
  },
  errorIcon: {
    width: 52,
    height: 52,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.error.light,
    marginBottom: spacing['3xl'],
  },
  centeredStateTitle: {
    marginTop: spacing.xl,
    fontSize: fontSize.xl,
    lineHeight: 24,
    fontWeight: fontWeight.bold,
    color: colors.text.primary,
  },
  centeredStateText: {
    marginTop: spacing.sm,
    fontSize: fontSize.md,
    lineHeight: 20,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: spacing['3xl'],
  },
  requestCard: {
    backgroundColor: colors.background.surface,
    borderRadius: radius.modal,
    borderWidth: border.width.thin,
    borderColor: colors.border.default,
    marginBottom: spacing['2xl'],
    overflow: 'hidden',
    ...shadows.card,
  },
  requestHero: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing['3xl'],
  },
  requestAvatar: {
    width: 48,
    height: 48,
    borderRadius: radius.iconBtn,
    backgroundColor: colors.primary.default,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.xl,
  },
  requestAvatarInitial: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.extraBold,
    color: colors.text.inverse,
  },
  requestHeroText: {
    flex: 1,
    minWidth: 0,
  },
  requestClientName: {
    fontSize: fontSize.xl,
    lineHeight: 23,
    fontWeight: fontWeight.bold,
    color: colors.text.primary,
  },
  requestHeroSub: {
    marginTop: 1,
    fontSize: fontSize.base,
    color: colors.text.secondary,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radius.full,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.background.badge,
  },
  statusPillApproved: {
    backgroundColor: colors.success.light,
  },
  statusPillPending: {
    backgroundColor: colors.warning.light,
  },
  statusPillText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.extraBold,
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusTextApproved: {
    color: colors.success.default,
  },
  statusTextPending: {
    color: colors.warning.default,
  },
  requestMetaRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderTopWidth: border.width.thin,
    borderTopColor: colors.border.light,
    backgroundColor: colors.background.muted,
    paddingVertical: spacing.xl + 1,
    paddingHorizontal: spacing['3xl'],
  },
  metaItem: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.item,
    backgroundColor: colors.primary.light,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.lg,
  },
  metaCopy: {
    flex: 1,
    minWidth: 0,
  },
  metaDivider: {
    width: border.width.thin,
    backgroundColor: colors.border.default,
    marginHorizontal: spacing.xl,
  },
  metaLabel: {
    fontSize: fontSize.tiny,
    lineHeight: 13,
    color: colors.text.muted,
    fontWeight: fontWeight.bold,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  metaValue: {
    marginTop: 2,
    fontSize: fontSize.base,
    lineHeight: 18,
    color: colors.text.primary,
    fontWeight: fontWeight.bold,
  },
  overviewCard: {
    backgroundColor: colors.primary.default,
    borderRadius: radius.modal,
    padding: spacing['4xl'],
    marginBottom: spacing['2xl'],
    overflow: 'hidden',
    ...shadows.card,
  },
  overviewTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing['4xl'],
  },
  overviewEyebrow: {
    fontSize: fontSize.tiny,
    lineHeight: 14,
    color: colors.primary.light,
    fontWeight: fontWeight.extraBold,
    letterSpacing: 1,
  },
  distanceValue: {
    marginTop: 3,
    fontSize: fontSize['4xl'],
    lineHeight: 37,
    fontWeight: fontWeight.extraBold,
    color: colors.text.inverse,
    letterSpacing: -0.7,
  },
  overviewDuration: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md + 1,
  },
  overviewDurationText: {
    fontSize: fontSize.xs,
    color: colors.text.inverse,
    fontWeight: fontWeight.semiBold,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: border.width.thin,
    borderTopColor: 'rgba(255,255,255,0.14)',
    paddingTop: spacing['2xl'],
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: border.width.thin,
    height: 32,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  statValue: {
    fontSize: fontSize.xl,
    lineHeight: 22,
    fontWeight: fontWeight.bold,
    color: colors.text.inverse,
  },
  statLabel: {
    marginTop: 2,
    fontSize: fontSize.tiny,
    lineHeight: 14,
    color: colors.primary.light,
    fontWeight: fontWeight.semiBold,
    textTransform: 'uppercase',
    letterSpacing: 0.45,
  },
  mapCard: {
    backgroundColor: colors.background.surface,
    borderRadius: radius.modal,
    padding: spacing.md,
    marginBottom: spacing['2xl'],
    borderWidth: border.width.thin,
    borderColor: colors.border.default,
    overflow: 'hidden',
    ...shadows.card,
  },
  mapFooter: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.lg,
  },
  mapStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mapFooterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 1,
  },
  mapFooterText: {
    fontSize: fontSize.sm,
    color: colors.text.primary,
    fontWeight: fontWeight.bold,
  },
  trafficStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs + 1,
    borderRadius: radius.full,
    backgroundColor: colors.success.light,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  trafficText: {
    fontSize: fontSize.tiny,
    color: colors.success.default,
    fontWeight: fontWeight.bold,
  },
  startCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.surface,
    borderRadius: radius.card,
    borderWidth: border.width.thin,
    borderColor: colors.border.default,
    padding: spacing.xl,
    marginBottom: spacing.lg,
  },
  startCardNoLeg: {
    marginBottom: spacing['6xl'],
  },
  startIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.item,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary.light,
    marginRight: spacing.lg + 1,
  },
  startCopy: {
    flex: 1,
    minWidth: 0,
  },
  startLabel: {
    fontSize: fontSize.tiny,
    lineHeight: 13,
    color: colors.text.muted,
    fontWeight: fontWeight.extraBold,
    letterSpacing: 0.7,
  },
  startValue: {
    marginTop: 2,
    fontSize: fontSize.md,
    lineHeight: 20,
    fontWeight: fontWeight.bold,
    color: colors.text.primary,
  },
  firstLegCard: {
    backgroundColor: colors.primary.hover,
    borderRadius: radius.card,
    borderWidth: border.width.thin,
    borderColor: colors.primary.light,
    padding: spacing.xl,
    marginBottom: spacing['6xl'],
  },
  firstLegHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  firstLegCarIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.item,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background.surface,
    marginRight: spacing.lg,
  },
  firstLegHeadingCopy: {
    flex: 1,
    minWidth: 0,
  },
  firstLegEyebrow: {
    fontSize: fontSize.tiny,
    lineHeight: 12,
    color: colors.primary.default,
    fontWeight: fontWeight.extraBold,
    letterSpacing: 0.7,
  },
  firstLegDestination: {
    marginTop: 2,
    fontSize: fontSize.sm,
    lineHeight: 17,
    color: colors.text.secondary,
    fontWeight: fontWeight.semiBold,
  },
  firstLegTimes: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing['2xl'],
  },
  firstLegTimeBlock: {
    flex: 1,
  },
  firstLegArrival: {
    alignItems: 'flex-end',
  },
  firstLegTimeLabel: {
    fontSize: fontSize.tiny - 2,
    lineHeight: 11,
    color: colors.text.muted,
    fontWeight: fontWeight.extraBold,
    letterSpacing: 0.45,
  },
  firstLegTimeValue: {
    marginTop: 2,
    fontSize: fontSize['2xl'],
    lineHeight: 23,
    color: colors.text.primary,
    fontWeight: fontWeight.extraBold,
  },
  firstLegArrow: {
    width: 60,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.md,
  },
  firstLegArrowLine: {
    flex: 1,
    height: border.width.thin,
    backgroundColor: colors.primary.light,
  },
  firstLegMetrics: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: spacing.xl,
    borderTopWidth: border.width.thin,
    borderTopColor: colors.primary.light,
    paddingTop: spacing.lg,
  },
  firstLegMetric: {
    fontSize: fontSize.xs,
    lineHeight: 16,
    color: colors.primary.default,
    fontWeight: fontWeight.bold,
  },
  metricDot: {
    width: 3,
    height: 3,
    borderRadius: radius.full,
    backgroundColor: colors.text.muted,
    marginHorizontal: spacing.md,
  },
  firstLegTraffic: {
    fontSize: fontSize.xs,
    lineHeight: 16,
    color: colors.success.default,
    fontWeight: fontWeight.bold,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: fontSize['2xl'],
    lineHeight: 26,
    fontWeight: fontWeight.extraBold,
    color: colors.text.primary,
    letterSpacing: -0.25,
  },
  sectionSubtitle: {
    marginTop: 2,
    fontSize: fontSize.sm,
    lineHeight: 17,
    color: colors.text.secondary,
  },
  sectionIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.item,
    backgroundColor: colors.primary.light,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeline: {
    marginBottom: spacing.sm,
  },
  timelineItem: {
    flexDirection: 'row',
  },
  timelineRail: {
    width: 36,
    alignItems: 'center',
    marginRight: spacing.lg - 1,
  },
  stopOrderBadge: {
    width: 34,
    height: 34,
    borderRadius: radius.full,
    backgroundColor: colors.primary.default,
    borderWidth: border.width.thick + 1,
    borderColor: colors.primary.light,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  stopOrderText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.extraBold,
    color: colors.text.inverse,
  },
  timelineLine: {
    flex: 1,
    width: 2,
    minHeight: 40,
    backgroundColor: colors.border.mid,
  },
  timelineContent: {
    flex: 1,
    minWidth: 0,
    paddingBottom: spacing['3xl'],
  },
  driveRow: {
    height: 34,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: -2,
  },
  driveText: {
    fontSize: fontSize.xs,
    lineHeight: 16,
    color: colors.primary.default,
    fontWeight: fontWeight.bold,
  },
  stopCard: {
    backgroundColor: colors.background.surface,
    borderRadius: radius.iconBtn,
    borderWidth: border.width.thin,
    borderColor: colors.border.default,
    padding: spacing['2xl'],
    ...shadows.sm,
  },
  stopEyebrow: {
    fontSize: fontSize.tiny - 1,
    lineHeight: 12,
    color: colors.primary.default,
    fontWeight: fontWeight.extraBold,
    letterSpacing: 0.75,
  },
  stopAddress: {
    marginTop: 3,
    fontSize: fontSize.xl,
    lineHeight: 22,
    fontWeight: fontWeight.bold,
    color: colors.text.primary,
  },
  schedulePanel: {
    marginTop: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.item,
    backgroundColor: colors.background.screen,
    padding: spacing.lg,
  },
  scheduleTime: {
    flexShrink: 1,
  },
  scheduleDivider: {
    width: border.width.thin,
    height: 29,
    backgroundColor: colors.border.default,
    marginHorizontal: spacing.lg,
  },
  scheduleLabel: {
    fontSize: fontSize.tiny - 2,
    lineHeight: 11,
    color: colors.text.muted,
    fontWeight: fontWeight.extraBold,
    letterSpacing: 0.5,
  },
  scheduleValue: {
    marginTop: 2,
    fontSize: fontSize.sm,
    lineHeight: 16,
    color: colors.text.primary,
    fontWeight: fontWeight.bold,
  },
  durationPill: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    borderRadius: radius.full,
    backgroundColor: colors.background.surface,
    paddingHorizontal: spacing.sm + 1,
    paddingVertical: spacing.xxs + 3,
  },
  durationText: {
    fontSize: fontSize.tiny,
    color: colors.text.secondary,
    fontWeight: fontWeight.bold,
  },
  stopDate: {
    marginTop: spacing.lg - 1,
    fontSize: fontSize.xs,
    lineHeight: 16,
    color: colors.text.secondary,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  badge: {
    backgroundColor: colors.warning.light,
    borderRadius: radius.full,
    borderWidth: border.width.thin,
    borderColor: colors.warning.default,
    paddingHorizontal: spacing.md + 1,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: fontSize.tiny - 1,
    color: colors.text.primary,
    fontWeight: fontWeight.extraBold,
    letterSpacing: 0.35,
  },
  warningsPanel: {
    backgroundColor: colors.warning.light,
    borderRadius: radius.iconBtn,
    borderWidth: border.width.thin,
    borderColor: colors.warning.default,
    padding: spacing['2xl'],
    marginTop: spacing.xs,
  },
  warningHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  warningsPanelTitle: {
    fontSize: fontSize.md,
    lineHeight: 19,
    fontWeight: fontWeight.extraBold,
    color: colors.text.primary,
  },
  warningItem: {
    paddingVertical: spacing.md,
  },
  warningItemBorder: {
    borderTopWidth: border.width.thin,
    borderTopColor: colors.warning.default,
  },
  warningMessage: {
    fontSize: fontSize.sm,
    lineHeight: 18,
    color: colors.text.primary,
    fontWeight: fontWeight.semiBold,
  },
  warningSuggestion: {
    marginTop: 3,
    fontSize: fontSize.xs,
    lineHeight: 16,
    color: colors.text.secondary,
  },
  stickyFooter: {
    minHeight: 62,
    backgroundColor: colors.background.surface,
    paddingHorizontal: spacing['3xl'],
    paddingVertical: spacing.lg,
    borderTopWidth: border.width.thin,
    borderTopColor: colors.border.light,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...shadows.modal,
  },
  footerLabel: {
    fontSize: fontSize.tiny - 1,
    lineHeight: 12,
    color: colors.text.muted,
    fontWeight: fontWeight.extraBold,
    letterSpacing: 0.7,
  },
  footerSummaryText: {
    marginTop: 2,
    fontSize: fontSize.base,
    lineHeight: 18,
    color: colors.text.primary,
    fontWeight: fontWeight.bold,
  },
  conflictPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs + 1,
    borderRadius: radius.full,
    backgroundColor: colors.warning.light,
    paddingHorizontal: spacing.lg - 1,
    paddingVertical: spacing.md,
    marginLeft: spacing.lg,
  },
  footerConflict: {
    fontSize: fontSize.tiny,
    color: colors.warning.default,
    fontWeight: fontWeight.extraBold,
  },
});
