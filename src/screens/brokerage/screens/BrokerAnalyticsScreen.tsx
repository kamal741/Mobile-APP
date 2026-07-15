import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  BarChart3,
  CalendarClock,
  CheckCircle2,
  Check,
  ChevronDown,
  Clock,
  FileText,
  MapPin,
  Search,
  TrendingUp,
  UserCheck,
  Users,
  X,
} from 'lucide-react-native';

import { NavbarBroker } from '../components/NavbarBroker';
import { BrokerageFooter } from '../components/BrokerageFooter';
import {
  type BrokerAgent,
  type BrokerAgentStats,
  type BrokerStats,
  useBrokerAgents,
  useBrokerAgentStats,
  useBrokerStats,
} from '../../../lib/brokerApi';
import { colors, globalStyles, radius, shadows, spacing } from '@/theme';

const ALL_AGENTS = 'all';
const AGENT_SELECTOR_PAGE_SIZE = 1000;

function formatDistance(value: number | string | undefined): string {
  if (value === undefined) return '0 km';
  if (typeof value === 'string') return value;
  if (value >= 1000) {
    const km = value / 1000;
    return `${km % 1 === 0 ? km.toFixed(0) : km.toFixed(1)} km`;
  }
  return `${Math.round(value)} m`;
}

function formatHours(value: number | undefined): string {
  if (!value) return '0h';
  const hours = Math.floor(value);
  const minutes = Math.round((value - hours) * 60);
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

function formatMinutes(value: number | undefined): string {
  if (!value) return '0m';
  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

function statusLabel(status?: string): string {
  if (!status) return 'Active';
  return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
}

function StatCard({
  icon,
  label,
  value,
  tone = '#2563eb',
}: Readonly<{ icon: React.ReactNode; label: string; value: string | number; tone?: string }>) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: `${tone}12` }]}>{icon}</View>
      <View style={styles.statBody}>
        <Text style={styles.statLabel}>{label}</Text>
        <Text style={styles.statValue}>{value}</Text>
      </View>
    </View>
  );
}

function AgentOption({
  selected,
  title,
  subtitle,
  onPress,
}: Readonly<{
  selected: boolean;
  title: string;
  subtitle?: string;
  onPress: () => void;
}>) {
  return (
    <TouchableOpacity
      style={[styles.agentOption, selected && styles.agentOptionSelected]}
      activeOpacity={0.8}
      onPress={onPress}
    >
      <View style={styles.agentOptionText}>
        <Text style={[styles.agentOptionTitle, selected && styles.agentOptionTitleSelected]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.agentOptionSub} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {selected ? (
        <View style={styles.agentOptionCheck}>
          <Check size={15} color="#ffffff" strokeWidth={3} />
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

function BrokerageStats({ stats }: Readonly<{ stats?: BrokerStats | null }>) {
  return (
    <View style={styles.statsGrid}>
      <StatCard tone="#7c3aed" icon={<Users size={22} color="#7c3aed" />} label="Total Agents" value={stats?.totalAgents ?? 0} />
      <StatCard tone="#2563eb" icon={<UserCheck size={22} color="#2563eb" />} label="Total Clients" value={stats?.totalClients ?? 0} />
      <StatCard tone="#f97316" icon={<CalendarClock size={22} color="#f97316" />} label="Active Listings" value={stats?.activeListings ?? 0} />
      <StatCard tone="#16a34a" icon={<CheckCircle2 size={22} color="#16a34a" />} label="Completed Listings" value={stats?.completedListings ?? 0} />
      <StatCard tone="#0891b2" icon={<MapPin size={22} color="#0891b2" />} label="Total Distance" value={formatDistance(stats?.totalDistance)} />
      <StatCard tone="#6366f1" icon={<Clock size={22} color="#6366f1" />} label="Travel Time" value={formatMinutes(stats?.totalTravelTime)} />
    </View>
  );
}

function AgentStats({ stats }: Readonly<{ stats?: BrokerAgentStats | null }>) {
  const pipeline = stats?.offersPipeline ?? { pending: 0, accepted: 0, rejected: 0, total: 0 };
  const windowPipeline = stats?.offersPipelineWindow ?? pipeline;

  return (
    <>
      <View style={styles.statsGrid}>
        <StatCard tone="#f97316" icon={<CalendarClock size={22} color="#f97316" />} label="Today Tours" value={stats?.todayTours ?? 0} />
        <StatCard tone="#2563eb" icon={<UserCheck size={22} color="#2563eb" />} label="Active Clients" value={stats?.activeClients ?? 0} />
        <StatCard tone="#dc2626" icon={<FileText size={22} color="#dc2626" />} label="Pending Requests" value={stats?.pendingRequests ?? 0} />
        <StatCard tone="#0891b2" icon={<MapPin size={22} color="#0891b2" />} label="Weekly Distance" value={formatDistance(stats?.weeklyDistance)} />
        <StatCard tone="#6366f1" icon={<Clock size={22} color="#6366f1" />} label="Time Invested" value={formatHours(stats?.timeInvestedHours)} />
        <StatCard tone="#16a34a" icon={<TrendingUp size={22} color="#16a34a" />} label="Preference Fit" value={`${Math.round(stats?.avgScopeFitScore ?? 0)}%`} />
      </View>

      <View style={styles.pipelineCard}>
        <View style={styles.pipelineHeader}>
          <Text style={styles.sectionTitle}>Offer Pipeline</Text>
          <Text style={styles.sectionPill}>{pipeline.total} total</Text>
        </View>
        <View style={styles.pipelineRow}>
          <PipelineBox label="Pending" value={pipeline.pending} color="#f97316" />
          <PipelineBox label="Accepted" value={pipeline.accepted} color="#16a34a" />
          <PipelineBox label="Rejected" value={pipeline.rejected} color="#dc2626" />
        </View>
      </View>

      <View style={styles.pipelineCard}>
        <View style={styles.pipelineHeader}>
          <Text style={styles.sectionTitle}>{stats?.pipelineWindowDays ?? 30} Day Activity</Text>
          <Text style={styles.sectionPill}>{stats?.offersMadeWindow ?? 0} offers</Text>
        </View>
        <View style={styles.statsGridCompact}>
          <StatCard tone="#7c3aed" icon={<CalendarClock size={22} color="#7c3aed" />} label="Showings" value={stats?.showingsWindow ?? 0} />
          <StatCard tone="#f97316" icon={<FileText size={22} color="#f97316" />} label="Pending Offers" value={windowPipeline.pending} />
          <StatCard tone="#16a34a" icon={<CheckCircle2 size={22} color="#16a34a" />} label="Accepted Offers" value={windowPipeline.accepted} />
          <StatCard tone="#dc2626" icon={<TrendingUp size={22} color="#dc2626" />} label="Rejected Offers" value={windowPipeline.rejected} />
        </View>
      </View>
    </>
  );
}

function PipelineBox({
  label,
  value,
  color,
}: Readonly<{ label: string; value: number; color: string }>) {
  return (
    <View style={styles.pipelineBox}>
      <Text style={[styles.pipelineValue, { color }]}>{value}</Text>
      <Text style={styles.pipelineLabel}>{label}</Text>
    </View>
  );
}

export function BrokerAnalyticsScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [selectedAgentId, setSelectedAgentId] = useState<string>(ALL_AGENTS);
  const [agentDropdownVisible, setAgentDropdownVisible] = useState(false);
  const [agentSearch, setAgentSearch] = useState('');
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const { data: agentsPage, isLoading: agentsLoading, refetch: refetchAgents } = useBrokerAgents(0, AGENT_SELECTOR_PAGE_SIZE);
  const { data: brokerStats, isLoading: brokerStatsLoading, refetch: refetchBrokerStats } = useBrokerStats();
  const agents = agentsPage?.content ?? [];
  const selectedAgent = useMemo(
    () => agents.find((agent) => String(agent.id) === selectedAgentId),
    [agents, selectedAgentId],
  );
  const filteredAgents = useMemo(() => {
    const query = agentSearch.trim().toLowerCase();
    if (!query) return agents;
    return agents.filter((agent) => {
      const searchable = `${agent.displayName} ${agent.email} ${agent.phoneE164 ?? ''} ${agent.status ?? ''}`.toLowerCase();
      return searchable.includes(query);
    });
  }, [agentSearch, agents]);
  const {
    data: agentStats,
    isLoading: agentStatsLoading,
    refetch: refetchAgentStats,
  } = useBrokerAgentStats(
    selectedAgentId === ALL_AGENTS ? undefined : selectedAgentId,
    { pipelineWindowDays: 30, timezone },
  );

  useFocusEffect(
    useCallback(() => {
      navigation.setOptions({ headerShown: false });
    }, [navigation]),
  );

  useEffect(() => {
    const firstAgent = agents[0];
    if (selectedAgentId !== ALL_AGENTS && !selectedAgent && firstAgent) {
      setSelectedAgentId(String(firstAgent.id));
    }
  }, [agents, selectedAgent, selectedAgentId]);

  const refreshing =
    agentsLoading ||
    (selectedAgentId === ALL_AGENTS ? brokerStatsLoading : agentStatsLoading);

  const handleRefresh = () => {
    void refetchAgents();
    if (selectedAgentId === ALL_AGENTS) {
      void refetchBrokerStats();
    } else {
      void refetchAgentStats();
    }
  };

  const handleSelectAgent = (agentId: string) => {
    setSelectedAgentId(agentId);
    setAgentDropdownVisible(false);
    setAgentSearch('');
  };

  const selectedAgentLabel =
    selectedAgentId === ALL_AGENTS ? 'All Agents' : selectedAgent?.displayName ?? 'Select Agent';
  const selectedAgentSubtitle =
    selectedAgentId === ALL_AGENTS
      ? `${agentsPage?.totalElements ?? 0} total agents`
      : selectedAgent?.email ?? statusLabel(selectedAgent?.status);
  const hasMoreAgents = (agentsPage?.totalElements ?? 0) > agents.length;
  const heroStats =
    selectedAgentId === ALL_AGENTS
      ? [
          { label: 'Agents', value: brokerStats?.totalAgents ?? 0 },
          { label: 'Clients', value: brokerStats?.totalClients ?? 0 },
          { label: 'Distance', value: formatDistance(brokerStats?.totalDistance) },
        ]
      : [
          { label: 'Tours Today', value: agentStats?.todayTours ?? 0 },
          { label: 'Clients', value: agentStats?.activeClients ?? 0 },
          { label: 'Fit', value: `${Math.round(agentStats?.avgScopeFitScore ?? 0)}%` },
        ];

  return (
    <View style={globalStyles.screenContainer}>
      <NavbarBroker title="Analytics" showBack />
      <ScrollView
        style={globalStyles.flex1}
        contentContainerStyle={[styles.content, { paddingBottom: 96 + insets.bottom }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View style={styles.headerIcon}>
              <BarChart3 size={24} color="#ffffff" />
            </View>
            <View style={styles.headerCopy}>
              <Text style={styles.heroEyebrow}>Brokerage command center</Text>
              <Text style={styles.headerTitle}>Analytics</Text>
              <Text style={styles.headerSub}>
                Track team activity, agent performance, tours, clients, and offer flow.
              </Text>
            </View>
          </View>
          <View style={styles.heroStatsRow}>
            {heroStats.map((item) => (
              <View key={item.label} style={styles.heroStatItem}>
                <Text style={styles.heroStatValue} numberOfLines={1}>
                  {item.value}
                </Text>
                <Text style={styles.heroStatLabel} numberOfLines={1}>
                  {item.label}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.selectorCard}>
          <View style={styles.selectorHeader}>
            <View>
              <Text style={styles.selectorLabel}>Viewing</Text>
              <Text style={styles.selectorHint}>Choose team rollup or one agent</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.dropdownButton}
            activeOpacity={0.85}
            onPress={() => setAgentDropdownVisible(true)}
            accessibilityRole="button"
            accessibilityLabel="Select agent"
          >
            <View style={styles.dropdownText}>
              <Text style={styles.dropdownValue} numberOfLines={1}>
                {selectedAgentLabel}
              </Text>
              <Text style={styles.dropdownSub} numberOfLines={1}>
                {selectedAgentSubtitle}
              </Text>
            </View>
            <View style={styles.dropdownIcon}>
              <ChevronDown size={20} color="#334155" />
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>
                {selectedAgentId === ALL_AGENTS ? 'Team Overview' : selectedAgent?.displayName ?? 'Agent Overview'}
              </Text>
              <Text style={styles.sectionSubtitle}>
                {selectedAgentId === ALL_AGENTS ? 'Current brokerage totals' : 'Individual performance snapshot'}
              </Text>
            </View>
            <Text style={styles.sectionPill}>
              {selectedAgentId === ALL_AGENTS ? 'Brokerage' : '30 days'}
            </Text>
          </View>
          {refreshing ? (
            <View style={styles.loadingState}>
              <ActivityIndicator color="#7c3aed" />
              <Text style={styles.loadingText}>Loading analytics...</Text>
            </View>
          ) : selectedAgentId === ALL_AGENTS ? (
            <BrokerageStats stats={brokerStats} />
          ) : (
            <AgentStats stats={agentStats} />
          )}
        </View>
      </ScrollView>
      <BrokerageFooter />

      <Modal
        transparent
        visible={agentDropdownVisible}
        animationType="fade"
        onRequestClose={() => setAgentDropdownVisible(false)}
      >
        <View style={styles.modalRoot}>
          <Pressable style={styles.modalBackdrop} onPress={() => setAgentDropdownVisible(false)} />
          <View style={[styles.dropdownSheet, { paddingBottom: Math.max(spacing.xl, insets.bottom + spacing.lg) }]}>
            <View style={styles.sheetHeader}>
              <View style={styles.sheetHandle} />
              <TouchableOpacity
                style={styles.sheetClose}
                activeOpacity={0.8}
                onPress={() => setAgentDropdownVisible(false)}
                accessibilityRole="button"
                accessibilityLabel="Close agent selector"
              >
                <X size={18} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.sheetTitle}>Select Agent</Text>
            <View style={styles.searchBox}>
              <Search size={18} color={colors.text.muted} />
              <TextInput
                style={styles.searchInput}
                value={agentSearch}
                onChangeText={setAgentSearch}
                placeholder="Search by name, email, or phone"
                placeholderTextColor={colors.text.muted}
              />
            </View>
            <FlatList
              data={filteredAgents}
              style={styles.agentList}
              keyExtractor={(agent) => String(agent.id)}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              initialNumToRender={16}
              maxToRenderPerBatch={24}
              updateCellsBatchingPeriod={40}
              windowSize={9}
              removeClippedSubviews
              ListHeaderComponent={
                <AgentOption
                  selected={selectedAgentId === ALL_AGENTS}
                  title="All Agents"
                  subtitle={`${agentsPage?.totalElements ?? 0} total agents`}
                  onPress={() => handleSelectAgent(ALL_AGENTS)}
                />
              }
              renderItem={({ item: agent }: { item: BrokerAgent }) => (
                <AgentOption
                  selected={selectedAgentId === String(agent.id)}
                  title={agent.displayName}
                  subtitle={`${agent.email} | ${statusLabel(agent.status)}`}
                  onPress={() => handleSelectAgent(String(agent.id))}
                />
              )}
              ListEmptyComponent={<Text style={styles.emptyAgents}>No agents found</Text>}
              ListFooterComponent={
                hasMoreAgents ? (
                  <Text style={styles.agentLimitNote}>
                    Showing first {agents.length} agents. Use search to narrow the list.
                  </Text>
                ) : null
              }
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    paddingBottom: 96,
    gap: spacing.lg,
  },
  heroCard: {
    backgroundColor: '#1e40af',
    borderRadius: 18,
    padding: spacing.xl,
    ...shadows.sm,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.lg,
  },
  headerCopy: { flex: 1 },
  heroEyebrow: {
    color: 'rgba(255, 255, 255, 0.76)',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    marginBottom: 3,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
  },
  headerSub: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.82)',
    lineHeight: 18,
    marginTop: 3,
  },
  heroStatsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  heroStatItem: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
  },
  heroStatValue: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '900',
  },
  heroStatLabel: {
    color: 'rgba(255, 255, 255, 0.74)',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 3,
  },
  selectorCard: {
    backgroundColor: colors.background.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border.default,
    padding: spacing.lg,
    ...shadows.xs,
  },
  selectorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  selectorLabel: {
    color: colors.text.muted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  selectorHint: {
    color: colors.text.secondary,
    fontSize: 12,
    marginTop: 2,
  },
  dropdownButton: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#dbeafe',
    backgroundColor: '#f8fbff',
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
  },
  dropdownText: {
    flex: 1,
    minWidth: 0,
  },
  dropdownValue: {
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: '800',
  },
  dropdownSub: {
    color: colors.text.muted,
    fontSize: 12,
    marginTop: 3,
  },
  dropdownIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.md,
  },
  sectionCard: {
    backgroundColor: colors.background.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border.default,
    padding: spacing.lg,
    ...shadows.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  sectionTitle: {
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: '800',
  },
  sectionSubtitle: {
    color: colors.text.secondary,
    fontSize: 12,
    marginTop: 3,
  },
  sectionPill: {
    color: '#1d4ed8',
    fontSize: 11,
    fontWeight: '800',
    backgroundColor: '#eff6ff',
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  statsGridCompact: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  statCard: {
    flexBasis: '47%',
    flexGrow: 1,
    minHeight: 96,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border.light,
    backgroundColor: '#ffffff',
    padding: spacing.md,
    ...shadows.xs,
  },
  statIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  statBody: { flex: 1 },
  statLabel: {
    color: colors.text.muted,
    fontSize: 11,
    fontWeight: '700',
  },
  statValue: {
    color: colors.text.primary,
    fontSize: 21,
    fontWeight: '900',
    marginTop: 4,
  },
  pipelineCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border.light,
    backgroundColor: '#f8fbff',
    padding: spacing.lg,
    marginTop: spacing.lg,
  },
  pipelineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  pipelineRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  pipelineBox: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: colors.border.light,
    padding: spacing.md,
    alignItems: 'center',
  },
  pipelineValue: {
    fontSize: 22,
    fontWeight: '800',
  },
  pipelineLabel: {
    color: colors.text.muted,
    fontSize: 11,
    marginTop: 2,
  },
  loader: {
    marginVertical: 32,
  },
  loadingState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    gap: spacing.md,
  },
  loadingText: {
    color: colors.text.secondary,
    fontSize: 13,
    fontWeight: '600',
  },
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.32)',
  },
  dropdownSheet: {
    backgroundColor: colors.background.surface,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: spacing.xl,
    maxHeight: '78%',
  },
  sheetHeader: {
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  sheetHandle: {
    width: 42,
    height: 4,
    borderRadius: 999,
    backgroundColor: colors.border.default,
    alignSelf: 'center',
  },
  sheetClose: {
    position: 'absolute',
    right: 0,
    top: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.background.subtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetTitle: {
    color: colors.text.primary,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: spacing.md,
  },
  searchBox: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: '#f8fbff',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  searchInput: {
    flex: 1,
    minHeight: 44,
    color: colors.text.primary,
    fontSize: 14,
    marginLeft: spacing.sm,
  },
  agentList: {
    maxHeight: 430,
  },
  agentOption: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border.light,
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  agentOptionSelected: {
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
  },
  agentOptionText: {
    flex: 1,
    minWidth: 0,
  },
  agentOptionTitle: {
    color: colors.text.primary,
    fontSize: 14,
    fontWeight: '800',
  },
  agentOptionTitleSelected: {
    color: '#1d4ed8',
  },
  agentOptionSub: {
    color: colors.text.secondary,
    fontSize: 12,
    marginTop: 3,
  },
  agentOptionCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.md,
  },
  emptyAgents: {
    color: colors.text.muted,
    textAlign: 'center',
    paddingVertical: spacing.xl,
    fontSize: 13,
  },
  agentLimitNote: {
    color: colors.text.muted,
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 17,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
});
