import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { queryClient } from '../../../../lib/queryClient';
import Navbar, { NavbarAgent } from '@/screens/agent/components/NavbarAgent';
import { api } from '@/lib/api';

import { useClients }            from '../hooks/useClients';
import { useClientItemStats }    from '../hooks/useClientItemStats';
import { useClientStats }        from '../hooks/useClientStats';
import { filterClients }         from '../utils/client.utils';
import type { ClientItemStats } from '../hooks/useClientItemStats';

import { ClientsHeader }          from '../components/ClientsHeader';
import { ClientStatsRow }         from '../components/ClientStatsRow';
import { ClientSearchFilterBar }  from '../components/ClientSearchFilterBar';
import { ClientListItem }         from '../components/ClientListItem';
import { ClientListEmpty }        from '../components/ClientListEmpty';
import { AddClientModal }         from '../components/AddClientModal';
import { QUERY_KEYS }             from '../constants/clients.constants';

import { Client, FilterType }    from '../types/client.types';
import { colors, spacing }       from '../styles/shared.styles';
import { AgentFooter } from '../../components/AgentFooter';

// ─── Per-row wrapper ──────────────────────────────────────────────────────────
// Keeps each row's network call isolated so one failure doesn't break the list.

interface ClientListItemWithStatsProps {
  item: Client;
  onPress: (client: Client, offersCount?: number) => void;
  onStatsLoaded?: (clientId: string, stats: ClientItemStats) => void;
}

function ClientListItemWithStats({ item, onPress, onStatsLoaded }: Readonly<ClientListItemWithStatsProps>) {
  const { data: stats, isLoading: statsLoading } = useClientItemStats(item.id);

  // Notify parent when stats load so it can update aggregate stats
  useEffect(() => {
    if (stats && onStatsLoaded) {
      onStatsLoaded(String(item.id), stats);
    }
  }, [stats, item.id, onStatsLoaded]);

  return (
    <ClientListItem
      item={item}
      onPress={(client) => onPress(client, stats?.offers.total ?? 0)}
      stats={stats}
      statsLoading={statsLoading}
    />
  );
}

function ListSeparator() {
  return <View style={styles.separator} />;
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export function ClientsScreen() {
  const navigation = useNavigation<any>();
  const { width } = useWindowDimensions();
  const IS_SMALL_SCREEN = width < 768;
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  // ─── UI state ────────────────────────────────────────────────────────────
  const [searchQuery,       setSearchQuery]       = useState('');
  const [filterType,        setFilterType]        = useState<FilterType>('all');
  const [showFilterPicker,  setShowFilterPicker]  = useState(false);
  const [showAddModal,      setShowAddModal]      = useState(false);

  // ─── Data ────────────────────────────────────────────────────────────────
  const {
    clients: listClients,
    isLoading,
    refetch,
    addClient,
    isAddingClient,
  } = useClients(filterType);

  // Track which clients we've loaded stats for (lazily loaded from list rows)
  const [statsCache, setStatsCache] = useState<Map<string, ClientItemStats>>(new Map());

  // Calculate total offers from loaded stats
  const totalOffersFromLoadedStats = useMemo(() => {
    let total = 0;
    statsCache.forEach((stat) => {
      total += stat.offers.total ?? 0;
    });
    return total;
  }, [statsCache]);

  // Get aggregate stats using the hook
  const stats = useClientStats(listClients, totalOffersFromLoadedStats);

  // ─── Derived list ────────────────────────────────────────────────────────
  const filteredClients = useMemo(
    () => filterClients(listClients, searchQuery, 'all'),
    [listClients, searchQuery],
  );


  // ─── Handlers ────────────────────────────────────────────────────────────
  const handleClientPress = (client: Client, offersCount?: number) => {
    navigation.navigate('ClientProfile', {
      clientId: client.id.toString(),
      client,
      offersCount: offersCount ?? 0,
    });
  };

  const handleStatsLoaded = useCallback((clientId: string, stats: ClientItemStats) => {
    setStatsCache((prev) => {
      const newCache = new Map(prev);
      newCache.set(clientId, stats);
      return newCache;
    });
  }, []);

  // Invalidate all client-related queries so both the list and stats row
  // refresh automatically after a new client is successfully added.
  const handleAddClientSuccess = () => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.agentClients });
    queryClient.invalidateQueries({ queryKey: ['agentClientStats'] });
  };

  return (
    <View style={styles.container}>
      {/* <NavbarAgent title="Clients" /> */}

      <ClientsHeader onAddClient={() => setShowAddModal(true)} />

      <ClientStatsRow stats={stats} isSmallScreen={useWindowDimensions().width < 768} />

      <ClientSearchFilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filterType={filterType}
        onFilterChange={setFilterType}
        showFilterPicker={showFilterPicker}
        onToggleFilterPicker={() => setShowFilterPicker((v) => !v)}
        onCloseFilterPicker={() => setShowFilterPicker(false)}
      />

      {/* Client list */}
      {isLoading ? (
        <View style={styles.listLoadingCard}>
          <ActivityIndicator size="large" color={colors.brand} />
          <Text style={styles.listLoadingText}>Loading clients...</Text>
        </View>
      ) : (
        <View style={styles.listCard}>
          <View style={styles.listCardHeader}>
            <Text style={styles.listCardTitle}>
              Client List ({filteredClients.length})
            </Text>
            <Text style={styles.listCardSort}>Sorted by Recent Activity</Text>
          </View>

          <FlatList
            data={filteredClients}
            renderItem={({ item }) => (
              <ClientListItemWithStats 
                item={item} 
                onPress={handleClientPress}
                onStatsLoaded={handleStatsLoaded}
              />
            )}
            keyExtractor={(item) => String(item.id)}
            refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
            ItemSeparatorComponent={ListSeparator}
            ListEmptyComponent={<ClientListEmpty />}
          />
        </View>
      )}

      <AddClientModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={(payload) => {
          addClient(payload, {
            onSuccess: () => setShowAddModal(false),
          });
        }}
        onSuccess={handleAddClientSuccess}
        isLoading={isAddingClient}
      />
      <AgentFooter active="clients" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPage },

  listCard: {
    flex: 1,
    marginHorizontal: spacing.lg,
    backgroundColor: colors.bgCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  listLoadingCard: {
    flex: 1,
    marginHorizontal: spacing.lg,
    backgroundColor: colors.bgCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  listLoadingText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
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
  separator:     { height: 1, backgroundColor: colors.borderLight },
});

