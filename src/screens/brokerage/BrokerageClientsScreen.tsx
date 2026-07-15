import { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Linking,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import {
  AlertCircle,
  BriefcaseBusiness,
  Mail,
  Phone,
  RefreshCcw,
  Search,
  Users,
} from 'lucide-react-native';
import { api } from '../../lib/api';
import { API_GLOBAL_PATHS } from '../../lib/apiGlobalPaths';
import type { RootStackParamList } from '../../navigation/types';
import { globalStyles } from '@/theme';
import { NavbarBroker } from './components/NavbarBroker';
import { BrokerageFooter, useBrokerageFooterHeight } from './components/BrokerageFooter';

interface BrokerageClient {
  id: string;
  agentId: number;
  firstName: string;
  lastName: string;
  email: string;
  phoneE164?: string | null;
  clientType?: 'BUYER' | 'RENTER' | null;
  createdAt?: string | null;
  agentName?: string;
}

interface PageDto<T> {
  content: T[];
  totalPages?: number;
  last?: boolean;
}

interface BrokerAgentApiItem {
  id: number;
  displayName?: string | null;
}

interface AgentClientApiItem {
  id: number;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phoneE164?: string | null;
  clientType?: 'BUYER' | 'RENTER' | null;
  createdAt?: string | null;
}

async function fetchAllPages<T>(path: string): Promise<T[]> {
  const rows: T[] = [];
  let page = 0;
  let totalPages = 1;

  while (page < totalPages) {
    const response = await api.get<PageDto<T>>(`${path}?page=${page}&size=200`);
    const body = response.data;
    rows.push(...(body.content ?? []));
    totalPages = Math.max(1, body.totalPages ?? (body.last ? page + 1 : page + 2));
    page += 1;
  }

  return rows;
}

function getFullName(client: Pick<BrokerageClient, 'firstName' | 'lastName'>) {
  return `${client.firstName} ${client.lastName}`.trim() || 'Unnamed client';
}

function getInitials(client: Pick<BrokerageClient, 'firstName' | 'lastName' | 'email'>) {
  const name = getFullName(client);
  if (name !== 'Unnamed client') {
    const parts = name.split(/\s+/);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }
  return client.email.slice(0, 2).toUpperCase();
}

function formatDate(value?: string | null) {
  if (!value) return 'Not available';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 10);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function openExternalUrl(url: string, message: string) {
  Linking.openURL(url).catch(() => {
    if (Platform.OS === 'web') {
      globalThis.alert(message);
    } else {
      Alert.alert('Unable to open', message);
    }
  });
}

export function BrokerageClientsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const footerHeight = useBrokerageFooterHeight();
  const [searchQuery, setSearchQuery] = useState('');

  useFocusEffect(
    useCallback(() => {
      navigation.setOptions({ headerShown: false });
    }, [navigation])
  );

  const { data: clients, isLoading, refetch, isError, isRefetching } = useQuery<BrokerageClient[]>({
    queryKey: ['broker-clients'],
    queryFn: async () => {
      const agents = await fetchAllPages<BrokerAgentApiItem>(API_GLOBAL_PATHS.brokerAgents);
      if (agents.length === 0) return [];

      const clientsByAgent = await Promise.allSettled(
        agents.map(async (agent) => {
          const clientsForAgent = await fetchAllPages<AgentClientApiItem>(
            `${API_GLOBAL_PATHS.brokerAgents}/${agent.id}/clients`
          );
          return { agent, clients: clientsForAgent };
        })
      );

      const merged = clientsByAgent
        .filter((item): item is PromiseFulfilledResult<{ agent: BrokerAgentApiItem; clients: AgentClientApiItem[] }> =>
          item.status === 'fulfilled'
        )
        .flatMap((item) => item.value);

      return merged.flatMap(({ agent, clients: agentClients }) =>
        agentClients.map((client) => ({
          id: String(client.id),
          agentId: agent.id,
          firstName: client.firstName ?? '',
          lastName: client.lastName ?? '',
          email: client.email ?? 'Not available',
          phoneE164: client.phoneE164 ?? null,
          clientType: client.clientType ?? null,
          createdAt: client.createdAt ?? null,
          agentName: agent.displayName ?? 'Assigned agent',
        }))
      );
    },
  });

  const allClients = clients ?? [];
  const agentCount = useMemo(
    () => new Set(allClients.map((client) => client.agentId)).size,
    [allClients]
  );
  const buyerCount = allClients.filter((client) => client.clientType === 'BUYER').length;
  const renterCount = allClients.filter((client) => client.clientType === 'RENTER').length;

  const filteredClients = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return allClients;
    return allClients.filter((client) =>
      `${getFullName(client)} ${client.email} ${client.phoneE164 ?? ''} ${client.agentName ?? ''} ${client.clientType ?? ''}`
        .toLowerCase()
        .includes(q)
    );
  }, [allClients, searchQuery]);

  const renderClient = ({ item }: { item: BrokerageClient }) => (
    <ClientRow client={item} />
  );

  return (
    <View style={globalStyles.screenContainer}>
      <NavbarBroker title="Clients" />

      <FlatList
        data={filteredClients}
        keyExtractor={(item) => `${item.agentId}-${item.id}`}
        renderItem={renderClient}
        contentContainerStyle={[styles.list, { paddingBottom: footerHeight + 22 }]}
        refreshControl={<RefreshControl refreshing={isLoading || isRefetching} onRefresh={refetch} />}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View style={styles.headerContent}>
            <View style={styles.heroCard}>
              <View style={styles.heroTop}>
                <View style={styles.heroIcon}>
                  <Users size={23} color="#1e40af" />
                </View>
                <View style={styles.heroCopy}>
                  <Text style={styles.heroEyebrow}>Client Directory</Text>
                  <Text style={styles.heroTitle}>All brokerage clients</Text>
                  <Text style={styles.heroBody}>
                    Search across every agent relationship and quickly reach the right client.
                  </Text>
                </View>
              </View>

              <View style={styles.summaryRow}>
                <SummaryPill label="Clients" value={allClients.length} tone="#1e40af" />
                <SummaryPill label="Agents" value={agentCount} tone="#9333ea" />
                <SummaryPill label="Buyer" value={buyerCount} tone="#16a34a" />
                <SummaryPill label="Renter" value={renterCount} tone="#0ea5e9" />
              </View>
            </View>

            <View style={styles.searchCard}>
              <Search size={17} color="#94a3b8" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search clients, email, phone, or agent"
                placeholderTextColor="#94a3b8"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {isError && <AlertCircle size={17} color="#ef4444" />}
            </View>

            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionEyebrow}>Results</Text>
                <Text style={styles.sectionTitle}>
                  {filteredClients.length} {filteredClients.length === 1 ? 'client' : 'clients'}
                </Text>
              </View>
              <Pressable style={({ pressed }) => [styles.refreshButton, pressed && styles.pressed]} onPress={() => refetch()}>
                <RefreshCcw size={17} color="#1e40af" />
              </Pressable>
            </View>
          </View>
        }
        ItemSeparatorComponent={() => <View style={styles.rowGap} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              {isError ? <AlertCircle size={30} color="#ef4444" /> : <Users size={30} color="#94a3b8" />}
            </View>
            <Text style={styles.emptyText}>{isError ? 'Unable to load clients' : 'No clients found'}</Text>
            <Text style={styles.emptySubtext}>
              {isError
                ? 'Pull to refresh after the backend is ready.'
                : searchQuery.trim()
                  ? 'Try another name, email, phone, or agent.'
                  : 'Clients appear here when agents are linked.'}
            </Text>
          </View>
        }
      />

      <BrokerageFooter active="clients" />
    </View>
  );
}

function SummaryPill({
  label,
  value,
  tone,
}: Readonly<{ label: string; value: number; tone: string }>) {
  return (
    <View style={styles.summaryPill}>
      <Text style={[styles.summaryValue, { color: tone }]}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

function ClientRow({ client }: Readonly<{ client: BrokerageClient }>) {
  const clientName = getFullName(client);
  const typeLabel = client.clientType ? client.clientType.toLowerCase() : 'client';

  const handleEmail = () => {
    if (client.email && client.email !== 'Not available') {
      openExternalUrl(`mailto:${client.email}`, 'Unable to open mail client.');
    }
  };

  const handleCall = () => {
    if (client.phoneE164) {
      openExternalUrl(`tel:${client.phoneE164}`, 'Unable to open dialer.');
    }
  };

  return (
    <View style={styles.clientCard}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{getInitials(client)}</Text>
      </View>

      <View style={styles.clientInfo}>
        <View style={styles.nameRow}>
          <Text style={styles.clientName} numberOfLines={1}>{clientName}</Text>
          <View style={styles.typeBadge}>
            <Text style={styles.typeBadgeText}>{typeLabel}</Text>
          </View>
        </View>

        <View style={styles.metaRow}>
          <Mail size={12} color="#94a3b8" />
          <Text style={styles.metaText} numberOfLines={1}>{client.email}</Text>
        </View>

        {client.phoneE164 && (
          <View style={styles.metaRow}>
            <Phone size={12} color="#94a3b8" />
            <Text style={styles.metaText} numberOfLines={1}>{client.phoneE164}</Text>
          </View>
        )}

        <View style={styles.ownerRow}>
          <BriefcaseBusiness size={12} color="#1e40af" />
          <Text style={styles.ownerText} numberOfLines={1}>{client.agentName ?? 'Assigned agent'}</Text>
          <Text style={styles.joinedText}>Joined {formatDate(client.createdAt)}</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <Pressable
          style={({ pressed }) => [styles.iconButton, (!client.email || client.email === 'Not available') && styles.iconButtonDisabled, pressed && styles.pressed]}
          onPress={handleEmail}
          disabled={!client.email || client.email === 'Not available'}
        >
          <Mail size={15} color={client.email && client.email !== 'Not available' ? '#1e40af' : '#94a3b8'} />
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.iconButton, !client.phoneE164 && styles.iconButtonDisabled, pressed && styles.pressed]}
          onPress={handleCall}
          disabled={!client.phoneE164}
        >
          <Phone size={15} color={client.phoneE164 ? '#1e40af' : '#94a3b8'} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  headerContent: {
    gap: 14,
    marginBottom: 14,
  },
  heroCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#dbe4ef',
    padding: 17,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 4,
  },
  heroTop: {
    flexDirection: 'row',
    gap: 13,
  },
  heroIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eff6ff',
  },
  heroCopy: {
    flex: 1,
    minWidth: 0,
  },
  heroEyebrow: {
    color: '#1e40af',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0,
  },
  heroTitle: {
    color: '#0f172a',
    fontSize: 26,
    fontWeight: '800',
    lineHeight: 31,
    marginTop: 4,
  },
  heroBody: {
    color: '#64748b',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
    fontWeight: '600',
  },
  summaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
  },
  summaryPill: {
    minWidth: '23%',
    flex: 1,
    borderRadius: 14,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 11,
    paddingVertical: 10,
  },
  summaryValue: {
    fontSize: 19,
    fontWeight: '800',
  },
  summaryLabel: {
    marginTop: 2,
    color: '#64748b',
    fontSize: 11,
    fontWeight: '800',
  },
  searchCard: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#ffffff',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#dbe4ef',
    paddingHorizontal: 14,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    color: '#0f172a',
    fontSize: 14,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  sectionEyebrow: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0,
  },
  sectionTitle: {
    color: '#0f172a',
    fontSize: 19,
    fontWeight: '800',
    marginTop: 2,
  },
  refreshButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  rowGap: {
    height: 10,
  },
  clientCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#ffffff',
    borderRadius: 17,
    borderWidth: 1,
    borderColor: '#dbe4ef',
    padding: 14,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1e40af',
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  clientInfo: {
    flex: 1,
    minWidth: 0,
    gap: 5,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  clientName: {
    flex: 1,
    minWidth: 0,
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '800',
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: '#f1f5f9',
  },
  typeBadgeText: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    flex: 1,
    minWidth: 0,
    color: '#64748b',
    fontSize: 12,
    fontWeight: '600',
  },
  ownerRow: {
    marginTop: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ownerText: {
    flex: 1,
    minWidth: 0,
    color: '#1e40af',
    fontSize: 12,
    fontWeight: '800',
  },
  joinedText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '700',
  },
  actions: {
    gap: 8,
  },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  iconButtonDisabled: {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
  },
  pressed: {
    opacity: 0.72,
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingVertical: 54,
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#dbe4ef',
  },
  emptyIcon: {
    width: 58,
    height: 58,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    marginBottom: 14,
  },
  emptyText: {
    color: '#0f172a',
    fontSize: 18,
    fontWeight: '800',
  },
  emptySubtext: {
    color: '#64748b',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
    textAlign: 'center',
  },
});
