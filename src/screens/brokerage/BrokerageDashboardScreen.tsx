import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import { useBrokerStats, type BrokerStats } from '../../lib/brokerApi';
import { NavbarBroker } from './components/NavbarBroker';
import {
  Users,
  UserCheck,
  CheckCircle2,
  MapPin,
  Clock,
  FileStack,
  BarChart3,
  Palette,
  Building2,
  ChevronRight,
  AlertTriangle,
  TrendingUp,
  Percent,
} from 'lucide-react-native';

// ─── Theme imports ─────────────────────────────────────────────────────────────
import {
  colors,
  spacing,
  shadows,
  radius,
  globalStyles,
} from '@/theme';
import { BrokerageFooter, useBrokerageFooterHeight } from './components/BrokerageFooter';

// ─── Formatters ────────────────────────────────────────────────────────────────
function formatTravelTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function formatCompactTravelTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  if (h >= 100) return `${h}h`;
  return formatTravelTime(minutes);
}

function formatCompactDistance(km: number): string {
  if (km >= 10000) return `${Math.round(km / 1000)}k km`;
  if (km >= 1000) return `${(km / 1000).toFixed(1)}k km`;
  if (km >= 100) return `${Math.round(km)} km`;
  return `${Number(km.toFixed(1))} km`;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

// ─── Section Header ─────────────────────────────────────────────────────────────
function SectionHeader({
  title,
  action,
}: {
  title:  string;
  action?: React.ReactNode;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action}
    </View>
  );
}

// ─── KpiCard — tinted icon badge + large value, industry-style KPI tile ───────
function KpiCard({
  icon,
  label,
  value,
  tint,
  half,
}: {
  icon:  React.ReactNode;
  label: string;
  value: number | string;
  tint:  string;
  half?: boolean;
}) {
  return (
    <View style={[kpiStyles.card, half && kpiStyles.cardHalf]}>
      <View style={[kpiStyles.iconBadge, { backgroundColor: tint }]}>
        {icon}
      </View>
      <View style={kpiStyles.textBlock}>
        <Text style={kpiStyles.value}>{value}</Text>
        <Text style={kpiStyles.label}>{label}</Text>
      </View>
    </View>
  );
}

const kpiStyles = StyleSheet.create({
  card: {
    flex:            1,
    flexDirection:   'row',
    alignItems:      'center',
    gap:             spacing.md,
    backgroundColor: colors.background.surface,
    borderRadius:    radius.item,
    borderWidth:     1,
    borderColor:     colors.border.default,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.xl,
    ...shadows.xs,
  },
  cardHalf: {
    flexBasis:  '48%',
    flexGrow:   1,
    flexShrink: 0,
  },
  iconBadge: {
    width:          44,
    height:         44,
    borderRadius:   radius.iconBtn,
    justifyContent: 'center',
    alignItems:     'center',
  },
  textBlock: {
    flex: 1,
    minWidth: 0,
  },
  value: {
    fontSize:   24,
    fontWeight: '800',
    color:      colors.text.primary,
    lineHeight: 27,
  },
  label: {
    fontSize:   12,
    fontWeight: '600',
    color:      colors.text.secondary,
    marginTop: 1,
  },
});

// ─── HeroStatCard — featured, high-emphasis primary metric ────────────────────
function HeroStatCard({
  activeListings,
  completedListings,
  cancelledListings,
}: {
  activeListings: number;
  completedListings: number;
  cancelledListings: number;
}) {
  return (
    <View style={heroStyles.card}>
      <View style={heroStyles.mainRow}>
        <View style={heroStyles.iconBadge}>
          <Building2 size={26} color={colors.text.inverse} />
        </View>
        <View style={heroStyles.textBlock}>
          <Text style={heroStyles.kicker}>Showing Pulse</Text>
          <Text style={heroStyles.value}>{activeListings}</Text>
          <Text style={heroStyles.label}>Active Tours</Text>
        </View>
      </View>
      <View style={heroStyles.divider} />
      <View style={heroStyles.heroMetaRow}>
        <View style={heroStyles.heroMetaItem}>
          <Text style={heroStyles.heroMetaValue}>{completedListings}</Text>
          <Text style={heroStyles.heroMetaLabel}>Completed</Text>
        </View>
        <View style={heroStyles.heroMetaItem}>
          <Text style={heroStyles.heroMetaValue}>{cancelledListings}</Text>
          <Text style={heroStyles.heroMetaLabel}>Cancelled</Text>
        </View>
      </View>
    </View>
  );
}

const heroStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.primary.default,
    borderRadius:    radius.card,
    padding:         spacing['4xl'],
    ...shadows.card,
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xl,
  },
  iconBadge: {
    width:              56,
    height:             56,
    borderRadius:       radius.iconBtn,
    backgroundColor:    'rgba(255,255,255,0.16)',
    justifyContent:     'center',
    alignItems:         'center',
  },
  textBlock: {
    flex: 1,
  },
  value: {
    fontSize:   36,
    fontWeight: '800',
    color:      colors.text.inverse,
    lineHeight: 40,
  },
  kicker: {
    fontSize: 11,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.75)',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.xxs,
  },
  label: {
    fontSize:   14,
    fontWeight: '600',
    color:      colors.text.inverse,
    marginTop:  spacing.xxs,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.16)',
    marginVertical: spacing.xl,
  },
  heroMetaRow: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  heroMetaItem: {
    flex: 1,
  },
  heroMetaValue: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text.inverse,
  },
  heroMetaLabel: {
    fontSize:  12,
    color:     'rgba(255,255,255,0.75)',
    marginTop: 2,
  },
});

// ─── DistanceTimeCard — compact half-width travel metric tile ────────────────
function DistanceTimeCard({
  icon,
  label,
  value,
  tint,
}: {
  icon:  React.ReactNode;
  label: string;
  value: string;
  tint:  string;
}) {
  return (
    <View style={distStyles.card}>
      <View style={[distStyles.iconBadge, { backgroundColor: tint }]}>{icon}</View>
      <View>
        <Text style={distStyles.value}>{value}</Text>
        <Text style={distStyles.label}>{label}</Text>
      </View>
    </View>
  );
}

const distStyles = StyleSheet.create({
  card: {
    flex:            1,
    flexDirection:   'row',
    alignItems:      'center',
    gap:             spacing.md,
    backgroundColor: colors.background.surface,
    borderRadius:    radius.item,
    borderWidth:     1,
    borderColor:     colors.border.default,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.xl,
    ...shadows.xs,
  },
  iconBadge: {
    width:          34,
    height:         34,
    borderRadius:   radius.btn,
    justifyContent: 'center',
    alignItems:     'center',
  },
  value: {
    fontSize:   15,
    fontWeight: '700',
    color:      colors.text.primary,
  },
  label: {
    fontSize: 11,
    color:    colors.text.muted,
  },
});

// ─── QuickActionRow — premium list-row style action (icon | label | chevron) ──
function QuickActionRow({
  icon,
  tint,
  label,
  sublabel,
  onPress,
  isLast,
}: {
  icon:      React.ReactNode;
  tint:      string;
  label:     string;
  sublabel:  string;
  onPress:   () => void;
  isLast?:   boolean;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={[actionStyles.row, !isLast && actionStyles.rowDivider]}
    >
      <View style={[actionStyles.iconBadge, { backgroundColor: tint }]}>{icon}</View>
      <View style={actionStyles.textBlock}>
        <Text style={actionStyles.label}>{label}</Text>
        <Text style={actionStyles.sublabel}>{sublabel}</Text>
      </View>
      <ChevronRight size={18} color={colors.text.muted} />
    </TouchableOpacity>
  );
}

const actionStyles = StyleSheet.create({
  row: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingVertical:   spacing.xl,
    gap:               spacing.lg,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  iconBadge: {
    width:          44,
    height:         44,
    borderRadius:   radius.iconBtn,
    justifyContent: 'center',
    alignItems:     'center',
  },
  textBlock: {
    flex: 1,
  },
  label: {
    fontSize:   14,
    fontWeight: '600',
    color:      colors.text.primary,
  },
  sublabel: {
    fontSize:  12,
    color:     colors.text.muted,
    marginTop: 1,
  },
});

// ─── BrokerageDashboardScreen ──────────────────────────────────────────────────
export function BrokerageDashboardScreen() {
  const { user }   = useAuth();
  const navigation = useNavigation<any>();
  const { width }  = useWindowDimensions();
  const isNarrow   = width < 700;
  const footerHeight = useBrokerageFooterHeight();

  useFocusEffect(
    useCallback(() => {
      navigation.setOptions({ headerShown: false });
    }, [navigation])
  );

  const {
    data:       brokerStats,
    isLoading,
    refetch,
  } = useBrokerStats();

  const stats = brokerStats as (BrokerStats & { totalOffers?: number }) | null;

  const todayLabel = new Date().toLocaleDateString('en-US', {
  weekday: 'short',
  month:   'short',
  day:     'numeric',
});

  return (
    <View style={globalStyles.screenContainer}>
      <NavbarBroker title="Dashboard" />

      <ScrollView
        style={globalStyles.flex1}
        contentContainerStyle={[
          styles.content,
          isNarrow && styles.contentNarrow,
          { paddingBottom: footerHeight + spacing['2xl'] },
        ]}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
      >
        {/* ── Welcome Header ──
        <View style={styles.header}>
          <Text style={styles.greeting}>Welcome back,</Text>
          <Text style={styles.name}>{user?.firstName}</Text>
        </View> */}

        <View style={styles.header}>
          <View style={styles.headerTopRow}>
            <View style={styles.eyebrowPill}>
              <Building2 size={14} color={colors.primary.default} />
              <Text style={styles.eyebrow}>Brokerage Dashboard</Text>
            </View>
            <Text style={styles.dateText}>{todayLabel}</Text>
          </View>
          <Text style={styles.title}>{getGreeting()}, {user?.firstName ?? 'there'}</Text>
          <Text style={styles.subtitle}>A quick read on team coverage, portfolio activity, and operational momentum.</Text>
        </View>

        {/* ── Hero Stat — most important metric, front and center ── */}
        <HeroStatCard
          activeListings={stats?.activeListings ?? 0}
          completedListings={stats?.completedListings ?? 0}
          cancelledListings={stats?.cancelledListings ?? 0}
        />

        {/* ── Team Overview ── */}
        <View>
          <SectionHeader title="Team Overview" />
          <View style={styles.kpiRow}>
            <KpiCard
              icon={<Users size={20} color={colors.purple.default} />}
              label="Total Agents"
              value={stats?.totalAgents ?? 0}
              tint={colors.purple.surface}
              half={isNarrow}
            />
            <KpiCard
              icon={<UserCheck size={20} color={colors.primary.mid} />}
              label="Total Clients"
              value={stats?.totalClients ?? 0}
              tint={colors.primary.hover}
              half={isNarrow}
            />
          </View>
        </View>

        {/* ── Brokerage Health ── */}
        <View>
          <SectionHeader title={`${stats?.pipelineWindowDays ?? 30}-Day Health`} />
          <View style={styles.kpiRow}>
            <KpiCard
              icon={<TrendingUp size={20} color={colors.success.default} />}
              label="Completed"
              value={stats?.activity?.completedToursWindow ?? 0}
              tint={colors.success.surface}
              half={isNarrow}
            />
            <KpiCard
              icon={<Percent size={20} color={colors.primary.default} />}
              label="Completion"
              value={`${stats?.activity?.completionRate ?? 0}%`}
              tint={colors.primary.hover}
              half={isNarrow}
            />
            <KpiCard
              icon={<UserCheck size={20} color={colors.purple.default} />}
              label="Prefs Complete"
              value={`${stats?.clientEngagement?.avgPreferenceCompleteness ?? 0}%`}
              tint={colors.purple.surface}
              half={isNarrow}
            />
            <KpiCard
              icon={<AlertTriangle size={20} color={colors.error.default} />}
              label="Pending"
              value={stats?.showingRequests?.pending ?? 0}
              tint={colors.error.light}
              half={isNarrow}
            />
          </View>
        </View>

        {/* ── Pipeline Overview ── */}
        <View>
          <SectionHeader title="Pipeline Overview" />

          <View style={styles.kpiRow}>
            <KpiCard
              icon={<CheckCircle2 size={20} color={colors.success.default} />}
              label="Approved Requests"
              value={stats?.showingRequests?.approved ?? 0}
              tint={colors.success.surface}
              half={isNarrow}
            />
            <KpiCard
              icon={<FileStack size={20} color="#eab308" />}
              label="Total Offers"
              value={stats?.totalOffers ?? 0}
              tint="#fef9c3"
              half={isNarrow}
            />
            <KpiCard
              icon={<UserCheck size={20} color={colors.primary.default} />}
              label="New Clients"
              value={stats?.activity?.newClientsWindow ?? 0}
              tint={colors.primary.hover}
              half={isNarrow}
            />
          </View>

          <View style={styles.distanceRow}>
            <DistanceTimeCard
              icon={<MapPin size={18} color="#06b6d4" />}
              label="Total Distance"
              value={stats ? formatCompactDistance(stats.totalDistance) : '0 km'}
              tint="#e0f7fa"
            />
            <DistanceTimeCard
              icon={<Clock size={18} color="#6366f1" />}
              label="Total Travel Time"
              value={stats ? formatCompactTravelTime(stats.totalTravelTime) : '0h'}
              tint="#e5e7ff"
            />
          </View>
        </View>

        {/* ── Quick Actions ── */}
        <View>
          <SectionHeader title="Quick Actions" />
          <View style={styles.card}>
            <QuickActionRow
              icon={<BarChart3 size={20} color={colors.purple.default} />}
              tint={colors.purple.surface}
              label="Analytics"
              sublabel="Track performance across your brokerage"
              onPress={() => navigation.navigate('BrokerAnalytics')}
            />
            <QuickActionRow
              icon={<Palette size={20} color={colors.primary.default} />}
              tint={colors.primary.hover}
              label="Branding Settings"
              sublabel="Customize your brokerage's look and feel"
              onPress={() => navigation.navigate('BrokerBranding')}
              isLast
            />
          </View>
        </View>
      </ScrollView>
      <BrokerageFooter active="dashboard" />
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  content: {
    padding: spacing['3xl'],
    gap:     spacing['2xl'],
  },
  contentNarrow: {
    padding: spacing.xl,
  },

  // ── Welcome header ──────────────────────────────────────────────────────────
  // header: {
  //   marginBottom: spacing.xxs,
  // },
  greeting: {
    fontSize:   15,
    fontWeight: '400',
    color:      colors.text.secondary,
  },
  name: {
    fontSize:   26,
    fontWeight: '700',
    color:      colors.text.primary,
    marginTop:  spacing.xxs,
  },

  // ── Section header ──────────────────────────────────────────────────────────
  sectionHeader: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    marginBottom:   spacing.lg,
  },
  sectionTitle: {
    fontSize:   13,
    fontWeight: '700',
    color:      colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // ── KPI row / distance row ───────────────────────────────────────────────────
  kpiRow: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:           spacing.md + 2,
  },
  distanceRow: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:           spacing.md,
    marginTop:     spacing.lg,
  },

  // ── Card shell (used for Quick Actions) ──────────────────────────────────────
  card: {
    backgroundColor: colors.background.surface,
    borderRadius:    radius.card,
    borderWidth:     1,
    borderColor:     colors.border.default,
    paddingHorizontal: spacing.xl,
    ...shadows.sm,
  },

  // ── Header ─────────────────────────────────────────────────────────────────
  header: {
    backgroundColor: colors.background.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border.default,
    padding: spacing['4xl'],
    ...shadows.xs,
  },
  headerTopRow: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom:   spacing.md,
  },
  eyebrowPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary.hover,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
  },
  eyebrow: {
    fontSize:      11,
    fontWeight:    '800',
    color:         colors.primary.default,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  dateText: {
    fontSize:   12,
    fontWeight: '600',
    color:      colors.text.muted,
  },
  title: {
    fontSize:   24,
    lineHeight: 29,
    fontWeight: '800',
    color:      colors.text.primary,
  },
  subtitle: {
    fontSize:   13,
    fontWeight: '500',
    color:      colors.text.secondary,
    marginTop:  spacing.sm,
    lineHeight: 19,
  },
});



















// import {
//   View,
//   Text,
//   StyleSheet,
//   ScrollView,
//   RefreshControl,
//   TouchableOpacity,
//   useWindowDimensions,
// } from 'react-native';
// import { useCallback, useState } from 'react';
// import { useAuth } from '../../contexts/AuthContext';
// import { useNavigation } from '@react-navigation/native';
// import { useFocusEffect } from '@react-navigation/native';
// import { useBrokerStats, type BrokerStats } from '../../lib/brokerApi';
// import { NavbarBroker } from './components/NavbarBroker';
// import {
//   Users,
//   UserCheck,
//   CalendarClock,
//   CheckCircle2,
//   MapPin,
//   Clock,
//   FileStack,
//   BarChart3,
//   Palette,
// } from 'lucide-react-native';

// // ─── Theme imports ─────────────────────────────────────────────────────────────
// import {
//   colors,
//   spacing,
//   shadows,
//   radius,
//   globalStyles,
// } from '@/theme';
// import { BrokerageFooter } from './components/BrokerageFooter';

// // ─── Types ─────────────────────────────────────────────────────────────────────
// // ─── Formatters ────────────────────────────────────────────────────────────────
// function formatDistance(meters: number): string {
//   const km = meters / 1000;
//   return `${km % 1 === 0 ? km.toFixed(0) : km.toFixed(1)} km`;
// }

// function formatTravelTime(minutes: number): string {
//   const h = Math.floor(minutes / 60);
//   const m = minutes % 60;
//   if (h === 0) return `${m}m`;
//   if (m === 0) return `${h}h`;
//   return `${h}h ${m}m`;
// }

// // ─── BrokerStatCard — mirrors ClientStatCard exactly ──────────────────────────
// // Same layout: colored icon col on left | label + value stacked on right
// function BrokerStatCard({
//   icon,
//   label,
//   value,
//   isSmallScreen,
// }: {
//   icon:          React.ReactNode;
//   label:         string;
//   value:         number | string;
//   isSmallScreen?: boolean;
// }) {
//   return (
//     <View style={[statStyles.card, isSmallScreen && statStyles.cardHalf]}>
//       {/* Left — icon column */}
//       <View style={statStyles.left}>
//         <View style={statStyles.iconWrap}>{icon}</View>
//       </View>

//       {/* Right — label / value */}
//       <View style={statStyles.right}>
//         <View style={statStyles.titleBox}>
//           <Text style={statStyles.label}>{label}</Text>
//         </View>
//         <View style={statStyles.valueBox}>
//           <Text style={statStyles.value}>{value}</Text>
//         </View>
//       </View>
//     </View>
//   );
// }

// // Styles copied verbatim from ClientStatCard — zero deviation
// const statStyles = StyleSheet.create({
//   card: {
//     flex:            1,
//     flexDirection:   'row',
//     alignItems:      'stretch',
//     backgroundColor: colors.background.surface,
//     borderRadius:    radius.item,        // matches ClientStatCard radius.lg (10)
//     borderWidth:     1,
//     borderColor:     colors.border.default,
//     overflow:        'hidden',
//   },
//   cardHalf: {
//     flexBasis: '48%',
//     flexGrow:  1,
//     flexShrink: 0,
//   },
//   left: {
//     justifyContent: 'center',
//     alignItems:     'center',
//     padding:        spacing.lg + 2,     // spacing.sm + 2 = 6+2 = 8 ≈ spacing.md
//   },
//   iconWrap: {
//     width:          36,
//     height:         36,
//     justifyContent: 'center',
//     alignItems:     'center',
//   },
//   right: {
//     flex:          1,
//     flexDirection: 'column',
//   },
//   titleBox: {
//     flex:         1,
//     justifyContent: 'center',
//     paddingRight: spacing.lg + 2,
//     paddingTop:   15,
//   },
//   valueBox: {
//     flex:           1,
//     justifyContent: 'center',
//     paddingRight:   spacing.lg + 2,
//     paddingBottom:  15,
//   },
//   label: {
//     fontSize:   10,
//     color:      colors.text.muted,
//     fontWeight: '500',
//   },
//   value: {
//     fontSize:   20,
//     fontWeight: '700',
//     color:      colors.text.primary,
//   },
// });

// // ─── BrokerStatsRow — mirrors ClientStatsRow exactly ──────────────────────────
// function BrokerStatsRow({
//   stats,
//   isExpanded,
//   isSmallScreen,
// }: {
//   stats:        BrokerStats | null;
//   isExpanded:   boolean;
//   isSmallScreen: boolean;
// }) {
//   const primaryCards = [
//     {
//       key:   'totalAgents',
//       label: 'Total Agents',
//       value: stats?.totalAgents ?? 0,
//       icon:  <Users size={25} color={colors.purple.default} />,
//     },
//     {
//       key:   'activeClients',
//       label: 'Active Clients',
//       value: stats?.totalClients ?? 0,
//       icon:  <UserCheck size={25} color={colors.primary.mid} />,
//     },
//     {
//       key:   'activeListings',
//       label: 'Active Listings',
//       value: stats?.activeListings ?? 0,
//       icon:  <CalendarClock size={25} color="#f97316" />,
//     },
//     {
//       key:   'completedListings',
//       label: 'Completed Listings',
//       value: stats?.completedListings ?? 0,
//       icon:  <CheckCircle2 size={25} color={colors.success.default} />,
//     },
//     {
//       key:   'totalOffers',
//       label: 'Total Offers',
//       // NOTE: `totalOffers` isn't on the BrokerStats type yet — cast until
//       // brokerApi.ts / BrokerStats is updated to include it from the backend.
//       value: (stats as (BrokerStats & { totalOffers?: number }) | null)?.totalOffers ?? 0,
//       icon:  <FileStack size={25} color="#eab308" />,
//     },
//   ];

//   // Distance and travel time are each rendered as their own full-width,
//   // single-card row (see distanceCard / timeCard rows below).
//   const distanceCard = {
//     key:   'totalDistance',
//     label: 'Total Distance',
//     value: stats ? stats.totalDistance : '0 km',
//     icon:  <MapPin size={25} color="#06b6d4" />,
//   };

//   const timeCard = {
//     key:   'totalHours',
//     label: 'Total Travel Time',
//     value: stats ? formatTravelTime(stats.totalTravelTime) : '0h',
//     icon:  <Clock size={25} color="#6366f1" />,
//   };

//   return (
//     <View style={rowStyles.container}>
//       {/* Outer row matches ClientStatsRow's styles.row exactly (no padding —
//           card already has internal padding from the card shell above) */}
//       <View style={[rowStyles.row, isSmallScreen && rowStyles.rowWrap]}>
//         {primaryCards.map((card) => (
//           <BrokerStatCard
//             key={card.key}
//             icon={card.icon}
//             label={card.label}
//             value={card.value}
//             isSmallScreen={isSmallScreen}
//           />
//         ))}
//       </View>

//       {/* Total Distance — its own single-card row */}
//       {isExpanded && (
//         <View style={rowStyles.row}>
//           <BrokerStatCard
//             key={distanceCard.key}
//             icon={distanceCard.icon}
//             label={distanceCard.label}
//             value={distanceCard.value}
//           />
//         </View>
//       )}

//       {/* Total Travel Time — its own single-card row */}
//       {isExpanded && (
//         <View style={rowStyles.row}>
//           <BrokerStatCard
//             key={timeCard.key}
//             icon={timeCard.icon}
//             label={timeCard.label}
//             value={timeCard.value}
//           />
//         </View>
//       )}
//     </View>
//   );
// }

// // Matches ClientStatsRow styles exactly (minus the bgPage background and outer
// // padding — those are provided by the card shell in this context)
// const rowStyles = StyleSheet.create({
//   container: {
//     gap: spacing.md + 2,   // vertical spacing between stacked rows
//   },
//   row: {
//     flexDirection: 'row',
//     gap:           spacing.md + 2,   // spacing.sm + 2 = 10  ≈ ClientStatsRow gap
//   },
//   rowWrap: {
//     flexWrap: 'wrap',
//   },
// });


// // ─── Quick Actions Card ────────────────────────────────────────────────────────
// function QuickActionsCard({
//   onAnalytics,
//   onBrandingSettings,
// }: {
//   onAnalytics:        () => void;
//   onBrandingSettings: () => void;
// }) {
//   return (
//     <View style={styles.card}>
//       <View style={styles.cardHeader}>
//         <Text style={styles.cardTitle}>Quick Actions</Text>
//       </View>
//       <View style={styles.divider} />
//       <View style={styles.actionsRow}>
//         <TouchableOpacity
//           activeOpacity={0.82}
//           style={[styles.actionBtn, { backgroundColor: colors.purple.default }]}
//           onPress={onAnalytics}
//         >
//           <BarChart3 size={22} color={colors.text.inverse} />
//           <Text style={styles.actionText}>Analytics</Text>
//         </TouchableOpacity>
//         <TouchableOpacity
//           activeOpacity={0.82}
//           style={[styles.actionBtn, { backgroundColor: colors.primary.default }]}
//           onPress={onBrandingSettings}
//         >
//           <Palette size={22} color={colors.text.inverse} />
//           <Text style={styles.actionText}>Branding Settings</Text>
//         </TouchableOpacity>
//       </View>
//     </View>
//   );
// }

// // ─── BrokerageDashboardScreen ──────────────────────────────────────────────────



// export function BrokerageDashboardScreen() {
//   const { user }     = useAuth();
//   const navigation   = useNavigation<any>();
//   const { width }    = useWindowDimensions();
//   const isNarrow     = width < 700;
//   const [isExpanded, setIsExpanded] = useState(false);

//   useFocusEffect(
//     useCallback(() => {
//       navigation.setOptions({ headerShown: false });
//     }, [navigation])
//   );

//   const {
//     data:       brokerStats,
//     isLoading,
//     refetch,
//   } = useBrokerStats();

//   return (
//     <View style={globalStyles.screenContainer}>
//       <NavbarBroker title="Dashboard" />

//       <ScrollView
//         style={globalStyles.flex1}
//         contentContainerStyle={[styles.content, isNarrow && styles.contentNarrow]}
//         refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
//       >
//         {/* ── Welcome Header ── */}
//         {/* <View style={styles.header}>
//           <Text style={styles.greeting}>Welcome back,</Text>
//           <Text style={styles.name}>{user?.firstName}</Text>
//           <View style={styles.roleBadge}>
//             <Text style={styles.roleText}>Brokerage Portal</Text>
//           </View>
//         </View> */}

//         {/* ── Team Overview ── */}
//         <View style={styles.card}>
//           <View style={styles.cardHeader}>
//             <Text style={styles.cardTitle}>Team Overview</Text>
//             <TouchableOpacity
//               activeOpacity={0.8}
//               style={[styles.expandBtn, isExpanded && styles.expandBtnActive]}
//               onPress={() => setIsExpanded(!isExpanded)}
//             >
//               <Text style={[styles.expandBtnText, isExpanded && styles.expandBtnTextActive]}>
//                 {isExpanded ? 'Collapse' : 'Expand'}
//               </Text>
//             </TouchableOpacity>
//           </View>

//           <View style={styles.divider} />

//           {/* ← BrokerStatsRow renders cards identical to ClientStatCard */}
//           <BrokerStatsRow
//             stats={brokerStats ?? null}
//             isExpanded={isExpanded} 
//             isSmallScreen={isNarrow}
//           />
//         </View>

//         {/* ── Quick Actions ── */}
//         <QuickActionsCard
//           onAnalytics={() => navigation.navigate('Analytics')}
//           onBrandingSettings={() => navigation.navigate('BrandingSettings')}
//         />
//       </ScrollView>
//       <BrokerageFooter active="dashboard" />
//     </View>
//   );
// }

// // ─── Styles ────────────────────────────────────────────────────────────────────
// const styles = StyleSheet.create({
//   content: {
//     padding: spacing['3xl'],
//     gap:     spacing['2xl'],
//   },
//   contentNarrow: {
//     padding: spacing.xl,
//   },

//   // ── Welcome header ──────────────────────────────────────────────────────────
//   header: {
//     marginBottom: spacing.xs,
//   },
//   greeting: {
//     fontSize:   15,
//     fontWeight: '400',
//     color:      colors.text.secondary,
//   },
//   name: {
//     fontSize:   26,
//     fontWeight: '700',
//     color:      colors.text.primary,
//     marginTop:  spacing.xxs,
//   },
//   roleBadge: {
//     backgroundColor:   colors.purple.default,
//     paddingHorizontal: spacing.lg,
//     paddingVertical:   3,
//     borderRadius:      radius.pill,
//     alignSelf:         'flex-start',
//     marginTop:         spacing.md,
//   },
//   roleText: {
//     fontSize:   12,
//     fontWeight: '600',
//     color:      colors.text.inverse,
//   },

//   // ── Card shell ──────────────────────────────────────────────────────────────
//   card: {
//     backgroundColor: colors.background.surface,
//     borderRadius:    radius.card,
//     borderWidth:     1,
//     borderColor:     colors.border.default,
//     padding:         spacing['4xl'],
//     ...shadows.sm,
//   },
//   cardHeader: {
//     flexDirection:  'row',
//     alignItems:     'center',
//     justifyContent: 'space-between',
//   },
//   cardTitle: {
//     fontSize:   16,
//     fontWeight: '700',
//     color:      colors.text.primary,
//   },
//   cardPill: {
//     backgroundColor:   colors.background.subtle,
//     paddingHorizontal: spacing.md,
//     paddingVertical:   2,
//     borderRadius:      radius.pill,
//   },
//   cardPillText: {
//     fontSize:   11,
//     fontWeight: '500',
//     color:      colors.text.secondary,
//   },
//   divider: {
//     height:          1,
//     backgroundColor: colors.border.light,
//     marginVertical:  spacing.xl,
//   },

//   // ── Expand toggle ────────────────────────────────────────────────────────────
//   expandBtn: {
//     paddingHorizontal: spacing.xl,
//     paddingVertical:   spacing.sm,
//     borderRadius:      radius.btn,
//     borderWidth:       1,
//     borderColor:       colors.border.default,
//     backgroundColor:   colors.background.surface,
//   },
//   expandBtnActive: {
//     backgroundColor: colors.purple.default,
//     borderColor:     colors.purple.default,
//   },
//   expandBtnText: {
//     fontSize:   13,
//     fontWeight: '500',
//     color:      colors.text.secondary,
//   },
//   expandBtnTextActive: {
//     color: colors.text.inverse,
//   },

//   // ── Offer pipeline ────────────────────────────────────────────────────────────
//   offerRow: {
//     flexDirection: 'row',
//     gap:           spacing.md,
//   },
//   offerBox: {
//     flex:           1,
//     borderRadius:   radius.item,
//     padding:        spacing.xl,
//     alignItems:     'center',
//   },
//   offerCount: {
//     fontSize:   20,
//     fontWeight: '800',
//     lineHeight: 26,
//   },
//   offerLabel: {
//     fontSize:  11,
//     color:     colors.text.secondary,
//     marginTop: spacing.xxs + 1,
//   },

//   // ── Quick actions ─────────────────────────────────────────────────────────────
//   actionsRow: {
//     flexDirection: 'row',
//     gap:           spacing.xl,
//   },
//   actionBtn: {
//     flex:           1,
//     flexDirection:  'row',
//     alignItems:     'center',
//     justifyContent: 'center',
//     gap:            spacing.md,
//     borderRadius:   radius.item,
//     padding:        spacing['2xl'],
//     ...shadows.xs,
//   },
//   actionText: {
//     fontSize:   14,
//     fontWeight: '600',
//     color:      colors.text.inverse,
//   },
// });

























// import {
//   View,
//   Text,
//   StyleSheet,
//   ScrollView,
//   RefreshControl,
//   TouchableOpacity,
//   useWindowDimensions,
// } from 'react-native';
// import { useCallback, useState } from 'react';
// import { useAuth } from '../../contexts/AuthContext';
// import { useNavigation } from '@react-navigation/native';
// import { useFocusEffect } from '@react-navigation/native';
// import { useBrokerStats, type BrokerStats } from '../../lib/brokerApi';
// import { NavbarBroker } from './components/NavbarBroker';
// import {
//   Users,
//   UserCheck,
//   CalendarClock,
//   CheckCircle2,
//   MapPin,
//   Clock,
// } from 'lucide-react-native';

// // ─── Theme imports ─────────────────────────────────────────────────────────────
// import {
//   colors,
//   spacing,
//   shadows,
//   radius,
//   globalStyles,
// } from '@/theme';
// import { BrokerageFooter } from './components/BrokerageFooter';

// // ─── Types ─────────────────────────────────────────────────────────────────────
// // ─── Formatters ────────────────────────────────────────────────────────────────
// function formatDistance(meters: number): string {
//   const km = meters / 1000;
//   return `${km % 1 === 0 ? km.toFixed(0) : km.toFixed(1)} km`;
// }

// function formatTravelTime(minutes: number): string {
//   const h = Math.floor(minutes / 60);
//   const m = minutes % 60;
//   if (h === 0) return `${m}m`;
//   if (m === 0) return `${h}h`;
//   return `${h}h ${m}m`;
// }

// // ─── BrokerStatCard — mirrors ClientStatCard exactly ──────────────────────────
// // Same layout: colored icon col on left | label + value stacked on right
// function BrokerStatCard({
//   icon,
//   label,
//   value,
//   isSmallScreen,
// }: {
//   icon:          React.ReactNode;
//   label:         string;
//   value:         number | string;
//   isSmallScreen?: boolean;
// }) {
//   return (
//     <View style={[statStyles.card, isSmallScreen && statStyles.cardHalf]}>
//       {/* Left — icon column */}
//       <View style={statStyles.left}>
//         <View style={statStyles.iconWrap}>{icon}</View>
//       </View>

//       {/* Right — label / value */}
//       <View style={statStyles.right}>
//         <View style={statStyles.titleBox}>
//           <Text style={statStyles.label}>{label}</Text>
//         </View>
//         <View style={statStyles.valueBox}>
//           <Text style={statStyles.value}>{value}</Text>
//         </View>
//       </View>
//     </View>
//   );
// }

// // Styles copied verbatim from ClientStatCard — zero deviation
// const statStyles = StyleSheet.create({
//   card: {
//     flex:            1,
//     flexDirection:   'row',
//     alignItems:      'stretch',
//     backgroundColor: colors.background.surface,
//     borderRadius:    radius.item,        // matches ClientStatCard radius.lg (10)
//     borderWidth:     1,
//     borderColor:     colors.border.default,
//     overflow:        'hidden',
//   },
//   cardHalf: {
//     flexBasis: '48%',
//     flexGrow:  1,
//     flexShrink: 0,
//   },
//   left: {
//     justifyContent: 'center',
//     alignItems:     'center',
//     padding:        spacing.lg + 2,     // spacing.sm + 2 = 6+2 = 8 ≈ spacing.md
//   },
//   iconWrap: {
//     width:          36,
//     height:         36,
//     justifyContent: 'center',
//     alignItems:     'center',
//   },
//   right: {
//     flex:          1,
//     flexDirection: 'column',
//   },
//   titleBox: {
//     flex:         1,
//     justifyContent: 'center',
//     paddingRight: spacing.lg + 2,
//     paddingTop:   15,
//   },
//   valueBox: {
//     flex:           1,
//     justifyContent: 'center',
//     paddingRight:   spacing.lg + 2,
//     paddingBottom:  15,
//   },
//   label: {
//     fontSize:   10,
//     color:      colors.text.muted,
//     fontWeight: '500',
//   },
//   value: {
//     fontSize:   20,
//     fontWeight: '700',
//     color:      colors.text.primary,
//   },
// });

// // ─── BrokerStatsRow — mirrors ClientStatsRow exactly ──────────────────────────
// function BrokerStatsRow({
//   stats,
//   isExpanded,
//   isSmallScreen,
// }: {
//   stats:        BrokerStats | null;
//   isExpanded:   boolean;
//   isSmallScreen: boolean;
// }) {
//   const primaryCards = [
//     {
//       key:   'totalAgents',
//       label: 'Total Agents',
//       value: stats?.totalAgents ?? 0,
//       icon:  <Users size={25} color={colors.purple.default} />,
//     },
//     {
//       key:   'activeClients',
//       label: 'Active Clients',
//       value: stats?.totalClients ?? 0,
//       icon:  <UserCheck size={25} color={colors.primary.mid} />,
//     },
//     {
//       key:   'activeListings',
//       label: 'Active Listings',
//       value: stats?.activeListings ?? 0,
//       icon:  <CalendarClock size={25} color="#f97316" />,
//     },
//     {
//       key:   'completedListings',
//       label: 'Completed Listings',
//       value: stats?.completedListings ?? 0,
//       icon:  <CheckCircle2 size={25} color={colors.success.default} />,
//     },
//   ];

//   const secondaryCards = [
//     {
//       key:   'totalDistance',
//       label: 'Total Distance',
//       value: stats ? stats.totalDistance : '0 km',
//       icon:  <MapPin size={25} color="#06b6d4" />,
//     },
//     {
//       key:   'totalHours',
//       label: 'Total Travel Time',
//       value: stats ? formatTravelTime(stats.totalTravelTime) : '0h',
//       icon:  <Clock size={25} color="#6366f1" />,
//     },
//   ];

//   const displayedCards = isExpanded
//     ? [...primaryCards, ...secondaryCards]
//     : primaryCards;

//   return (
//     // Outer row matches ClientStatsRow's styles.row exactly (no padding — card
//     // already has internal padding from the card shell above)
//     <View style={[rowStyles.row, isSmallScreen && rowStyles.rowWrap]}>
//       {displayedCards.map((card) => (
//         <BrokerStatCard
//           key={card.key}
//           icon={card.icon}
//           label={card.label}
//           value={card.value}
//           isSmallScreen={isSmallScreen}
//         />
//       ))}
//     </View>
//   );
// }

// // Matches ClientStatsRow styles exactly (minus the bgPage background and outer
// // padding — those are provided by the card shell in this context)
// const rowStyles = StyleSheet.create({
//   row: {
//     flexDirection: 'row',
//     gap:           spacing.md + 2,   // spacing.sm + 2 = 10  ≈ ClientStatsRow gap
//   },
//   rowWrap: {
//     flexWrap: 'wrap',
//   },
// });

// // ─── Offer Pipeline Card ───────────────────────────────────────────────────────
// function OfferPipelineCard({
//   draft, submitted, accepted, rejected,
// }: {
//   draft: number; submitted: number; accepted: number; rejected: number;
// }) {
//   const buckets = [
//     { label: 'Draft',     value: draft,     bg: colors.background.subtle, fg: colors.text.dark },
//     { label: 'Submitted', value: submitted,  bg: colors.warning.light,     fg: colors.warning.default },
//     { label: 'Accepted',  value: accepted,   bg: colors.success.light,     fg: colors.success.default },
//     { label: 'Rejected',  value: rejected,   bg: colors.error.light,       fg: colors.error.default },
//   ];

//   return (
//     <View style={styles.card}>
//       <View style={styles.cardHeader}>
//         <Text style={styles.cardTitle}>Offer Pipeline</Text>
//         <View style={styles.cardPill}>
//           <Text style={styles.cardPillText}>{draft + submitted + accepted + rejected} total</Text>
//         </View>
//       </View>
//       <View style={styles.divider} />
//       <View style={styles.offerRow}>
//         {buckets.map((b) => (
//           <View key={b.label} style={[styles.offerBox, { backgroundColor: b.bg }]}>
//             <Text style={[styles.offerCount, { color: b.fg }]}>{b.value}</Text>
//             <Text style={styles.offerLabel}>{b.label}</Text>
//           </View>
//         ))}
//       </View>
//     </View>
//   );
// }

// // ─── Quick Actions Card ────────────────────────────────────────────────────────
// function QuickActionsCard({
//   onViewAgents,
//   onViewClients,
// }: {
//   onViewAgents:  () => void;
//   onViewClients: () => void;
// }) {
//   return (
//     <View style={styles.card}>
//       <View style={styles.cardHeader}>
//         <Text style={styles.cardTitle}>Quick Actions</Text>
//       </View>
//       <View style={styles.divider} />
//       <View style={styles.actionsRow}>
//         <TouchableOpacity
//           activeOpacity={0.82}
//           style={[styles.actionBtn, { backgroundColor: colors.purple.default }]}
//           onPress={onViewAgents}
//         >
//           <Users size={22} color={colors.text.inverse} />
//           <Text style={styles.actionText}>View Agents</Text>
//         </TouchableOpacity>
//         <TouchableOpacity
//           activeOpacity={0.82}
//           style={[styles.actionBtn, { backgroundColor: colors.primary.default }]}
//           onPress={onViewClients}
//         >
//           <UserCheck size={22} color={colors.text.inverse} />
//           <Text style={styles.actionText}>View Clients</Text>
//         </TouchableOpacity>
//       </View>
//     </View>
//   );
// }

// // ─── BrokerageDashboardScreen ──────────────────────────────────────────────────



// export function BrokerageDashboardScreen() {
//   const { user }     = useAuth();
//   const navigation   = useNavigation<any>();
//   const { width }    = useWindowDimensions();
//   const isNarrow     = width < 700;
//   const [isExpanded, setIsExpanded] = useState(false);

//   useFocusEffect(
//     useCallback(() => {
//       navigation.setOptions({ headerShown: false });
//     }, [navigation])
//   );

//   const {
//     data:       brokerStats,
//     isLoading,
//     refetch,
//   } = useBrokerStats();

//   return (
//     <View style={globalStyles.screenContainer}>
//       <NavbarBroker title="Dashboard" />

//       <ScrollView
//         style={globalStyles.flex1}
//         contentContainerStyle={[styles.content, isNarrow && styles.contentNarrow]}
//         refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
//       >
//         {/* ── Welcome Header ── */}
//         {/* <View style={styles.header}>
//           <Text style={styles.greeting}>Welcome back,</Text>
//           <Text style={styles.name}>{user?.firstName}</Text>
//           <View style={styles.roleBadge}>
//             <Text style={styles.roleText}>Brokerage Portal</Text>
//           </View>
//         </View> */}

//         {/* ── Team Overview ── */}
//         <View style={styles.card}>
//           <View style={styles.cardHeader}>
//             <Text style={styles.cardTitle}>Team Overview</Text>
//             <TouchableOpacity
//               activeOpacity={0.8}
//               style={[styles.expandBtn, isExpanded && styles.expandBtnActive]}
//               onPress={() => setIsExpanded(!isExpanded)}
//             >
//               <Text style={[styles.expandBtnText, isExpanded && styles.expandBtnTextActive]}>
//                 {isExpanded ? 'Collapse' : 'Expand'}
//               </Text>
//             </TouchableOpacity>
//           </View>

//           <View style={styles.divider} />

//           {/* ← BrokerStatsRow renders cards identical to ClientStatCard */}
//           <BrokerStatsRow
//             stats={brokerStats ?? null}
//             isExpanded={isExpanded} 
//             isSmallScreen={isNarrow}
//           />
//         </View>

//         {/* ── Offer Pipeline ── */}
//         <OfferPipelineCard draft={0} submitted={0} accepted={0} rejected={0} />

//         {/* ── Quick Actions ── */}
//         <QuickActionsCard
//           onViewAgents={() => navigation.navigate('Agents')}
//           onViewClients={() => navigation.navigate('Clients')}
//         />
//       </ScrollView>
//       <BrokerageFooter active="dashboard" />
//     </View>
//   );
// }

// // ─── Styles ────────────────────────────────────────────────────────────────────
// const styles = StyleSheet.create({
//   content: {
//     padding: spacing['3xl'],
//     gap:     spacing['2xl'],
//   },
//   contentNarrow: {
//     padding: spacing.xl,
//   },

//   // ── Welcome header ──────────────────────────────────────────────────────────
//   header: {
//     marginBottom: spacing.xs,
//   },
//   greeting: {
//     fontSize:   15,
//     fontWeight: '400',
//     color:      colors.text.secondary,
//   },
//   name: {
//     fontSize:   26,
//     fontWeight: '700',
//     color:      colors.text.primary,
//     marginTop:  spacing.xxs,
//   },
//   roleBadge: {
//     backgroundColor:   colors.purple.default,
//     paddingHorizontal: spacing.lg,
//     paddingVertical:   3,
//     borderRadius:      radius.pill,
//     alignSelf:         'flex-start',
//     marginTop:         spacing.md,
//   },
//   roleText: {
//     fontSize:   12,
//     fontWeight: '600',
//     color:      colors.text.inverse,
//   },

//   // ── Card shell ──────────────────────────────────────────────────────────────
//   card: {
//     backgroundColor: colors.background.surface,
//     borderRadius:    radius.card,
//     borderWidth:     1,
//     borderColor:     colors.border.default,
//     padding:         spacing['4xl'],
//     ...shadows.sm,
//   },
//   cardHeader: {
//     flexDirection:  'row',
//     alignItems:     'center',
//     justifyContent: 'space-between',
//   },
//   cardTitle: {
//     fontSize:   16,
//     fontWeight: '700',
//     color:      colors.text.primary,
//   },
//   cardPill: {
//     backgroundColor:   colors.background.subtle,
//     paddingHorizontal: spacing.md,
//     paddingVertical:   2,
//     borderRadius:      radius.pill,
//   },
//   cardPillText: {
//     fontSize:   11,
//     fontWeight: '500',
//     color:      colors.text.secondary,
//   },
//   divider: {
//     height:          1,
//     backgroundColor: colors.border.light,
//     marginVertical:  spacing.xl,
//   },

//   // ── Expand toggle ────────────────────────────────────────────────────────────
//   expandBtn: {
//     paddingHorizontal: spacing.xl,
//     paddingVertical:   spacing.sm,
//     borderRadius:      radius.btn,
//     borderWidth:       1,
//     borderColor:       colors.border.default,
//     backgroundColor:   colors.background.surface,
//   },
//   expandBtnActive: {
//     backgroundColor: colors.purple.default,
//     borderColor:     colors.purple.default,
//   },
//   expandBtnText: {
//     fontSize:   13,
//     fontWeight: '500',
//     color:      colors.text.secondary,
//   },
//   expandBtnTextActive: {
//     color: colors.text.inverse,
//   },

//   // ── Offer pipeline ────────────────────────────────────────────────────────────
//   offerRow: {
//     flexDirection: 'row',
//     gap:           spacing.md,
//   },
//   offerBox: {
//     flex:           1,
//     borderRadius:   radius.item,
//     padding:        spacing.xl,
//     alignItems:     'center',
//   },
//   offerCount: {
//     fontSize:   20,
//     fontWeight: '800',
//     lineHeight: 26,
//   },
//   offerLabel: {
//     fontSize:  11,
//     color:     colors.text.secondary,
//     marginTop: spacing.xxs + 1,
//   },

//   // ── Quick actions ─────────────────────────────────────────────────────────────
//   actionsRow: {
//     flexDirection: 'row',
//     gap:           spacing.xl,
//   },
//   actionBtn: {
//     flex:           1,
//     flexDirection:  'row',
//     alignItems:     'center',
//     justifyContent: 'center',
//     gap:            spacing.md,
//     borderRadius:   radius.item,
//     padding:        spacing['2xl'],
//     ...shadows.xs,
//   },
//   actionText: {
//     fontSize:   14,
//     fontWeight: '600',
//     color:      colors.text.inverse,
//   },
// });
