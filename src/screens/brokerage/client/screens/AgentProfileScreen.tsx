import React, { useCallback, useState, useMemo } from 'react';
import {
  View,
  FlatList,
  Text,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { Search } from 'lucide-react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';

import NavbarBroker from '../../components/NavbarBroker';
import { AgentProfileHeader }   from '../components/AgentProfileHeader';
import { AgentClientStatsRow }  from '../components/AgentClientStatsRow';
import { AgentClientListItem }  from '../components/AgentClientListItem';
import { AgentClientListEmpty } from '../components/AgentClientListEmpty';

import {
  useAgentClients,
  BrokerAgent,
  BrokerAgentClient,
} from '../../../../lib/brokerApi';

import { colors, spacing } from '../../styles/shared.styles';

// ─── Route params ─────────────────────────────────────────────────────────────
// Always pass the full `agent` object — avoids an extra network round-trip.
// The `agentId`-only fallback is kept for deep-link / future use.

type RouteParams = {
  AgentProfile: {
    agent:    BrokerAgent;   // full object from BrokerProfileScreen / Dashboard
    agentId?: number;        // optional fallback (deep links)
  };
};

// ─── Filter tabs ──────────────────────────────────────────────────────────────

type ClientFilter = 'ALL' | 'BUYER' | 'RENTER' | 'UNASSIGNED';

const FILTER_TABS: { key: ClientFilter; label: string }[] = [
  { key: 'ALL',        label: 'All'        },
  { key: 'BUYER',      label: 'Buyers'     },
  { key: 'RENTER',     label: 'Renters'    },
  { key: 'UNASSIGNED', label: 'Unassigned' },
];

// ─── Screen ───────────────────────────────────────────────────────────────────

export function AgentProfileScreen() {
  const navigation = useNavigation<any>();
  const route      = useRoute<RouteProp<RouteParams, 'AgentProfile'>>();

  // agent is always present — passed by BrokerProfileScreen or BrokerageDashboard
  const agent: BrokerAgent = route.params.agent;

  useFocusEffect(
    useCallback(() => {
      navigation.setOptions({ headerShown: false });
    }, [navigation]),
  );

  // ─── Clients API ─────────────────────────────────────────────────────────
  // GET /api/broker/v1/broker/agents/:agentId/clients?page=0&size=50
  const {
    data:         clientsPage,
    isLoading:    clientsLoading,
    isRefetching: clientsRefetching,
    refetch:      refetchClients,
  } = useAgentClients(agent.id, 0, 50);

  // ─── UI state ─────────────────────────────────────────────────────────────
  const [searchQuery,  setSearchQuery]  = useState('');
  const [activeFilter, setActiveFilter] = useState<ClientFilter>('ALL');

  // ─── Derived ──────────────────────────────────────────────────────────────
  const allClients = clientsPage?.content ?? [];

  const filteredClients = useMemo(() => {
    let list = allClients;

    // Type filter
    if (activeFilter === 'BUYER')      list = list.filter((c) => c.clientType === 'BUYER');
    if (activeFilter === 'RENTER')     list = list.filter((c) => c.clientType === 'RENTER');
    if (activeFilter === 'UNASSIGNED') list = list.filter((c) => c.clientType === null);

    // Text search: name, email, phone
    const q = searchQuery.toLowerCase().trim();
    if (q) {
      list = list.filter(
        (c) =>
          `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          (c.phoneE164 ?? '').includes(q),
      );
    }
    return list;
  }, [allClients, activeFilter, searchQuery]);

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handleClientPress = (_client: BrokerAgentClient) => {
    // TODO: navigation.navigate('ClientProfile', { clientId: _client.id });
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <NavbarBroker title="Agent Profile" />

      {clientsLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.brand} />
        </View>
      ) : (
        <FlatList
          data={filteredClients}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <AgentClientListItem client={item} onPress={handleClientPress} />
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            <AgentClientListEmpty
              isFiltered={!!(searchQuery || activeFilter !== 'ALL')}
            />
          }
          contentContainerStyle={styles.flatContent}
          refreshControl={
            <RefreshControl
              refreshing={clientsRefetching}
              onRefresh={refetchClients}
              tintColor={colors.brand}
            />
          }
          ListHeaderComponent={
            <>
              {/* ── Agent info card — uses all fields from BrokerAgent ── */}
              <AgentProfileHeader
                agent={agent}
                onBack={() => navigation.goBack()}
              />

              {/* ── Client type breakdown stats ── */}
              <AgentClientStatsRow
                clients={allClients}
                total={clientsPage?.totalElements ?? allClients.length}
              />

              {/* ── Client list card ── */}
              <View style={styles.listCard}>
                {/* Card header */}
                <View style={styles.listCardHeader}>
                  <Text style={styles.listCardTitle}>
                    Clients ({clientsPage?.totalElements ?? allClients.length})
                  </Text>
                  <Text style={styles.listCardSort}>
                    {searchQuery || activeFilter !== 'ALL'
                      ? `${filteredClients.length} shown`
                      : 'All clients'}
                  </Text>
                </View>

                {/* Search bar */}
                <View style={styles.searchWrap}>
                  <Search
                    size={15}
                    color={colors.textDisabled}
                    style={{ marginRight: spacing.sm }}
                  />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search by name, email or phone..."
                    placeholderTextColor={colors.textDisabled}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                  />
                </View>

                {/* Filter tabs */}
                <View style={styles.filterRow}>
                  {FILTER_TABS.map((tab) => {
                    const active = activeFilter === tab.key;
                    return (
                      <TouchableOpacity
                        key={tab.key}
                        style={[styles.filterTab, active && styles.filterTabActive]}
                        onPress={() => setActiveFilter(tab.key)}
                        activeOpacity={0.75}
                      >
                        <Text style={[styles.filterTabText, active && styles.filterTabTextActive]}>
                          {tab.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </>
          }
        />
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: colors.bgPage },
  flatContent: { paddingBottom: 32 },

  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  listCard: {
    marginHorizontal: spacing.lg,
    backgroundColor: colors.bgCard,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  listCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  listCardTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  listCardSort:  { fontSize: 12, color: colors.textDisabled, fontStyle: 'italic' },

  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    backgroundColor: colors.bgPage,
    margin: spacing.md,
    marginBottom: 0,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: colors.textSecondary,
  },

  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    marginTop: spacing.md,
  },
  filterTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgPage,
  },
  filterTabActive:     { backgroundColor: colors.brand, borderColor: colors.brand },
  filterTabText:       { fontSize: 11, fontWeight: '600', color: colors.textMuted },
  filterTabTextActive: { color: colors.textInverted },

  separator: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginHorizontal: spacing.lg,
  },
});

