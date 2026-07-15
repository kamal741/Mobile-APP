import React, { useMemo, useState } from 'react';
import {
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import {
  ChevronDown,
  ChevronUp,
  Mail,
  Phone,
  Search,
  ShieldCheck,
} from 'lucide-react-native';
import { api } from '../../lib/api';
import { API_GLOBAL_PATHS } from '../../lib/apiGlobalPaths';
import { BrokerAgentClient } from '../../lib/brokerApi';
import { AgentClientListItem } from './client/components/AgentClientListItem';
import { BrokerageFooter, useBrokerageFooterHeight } from './components/BrokerageFooter';
import { colors, spacing } from './styles/shared.styles';

const INITIAL_CLIENT_LIMIT = 5;

type AgentRouteParams = {
  agentId: string | number;
  agent?: {
    id?: string | number;
    firstName?: string | null;
    lastName?: string | null;
    displayName?: string | null;
    email?: string | null;
    phoneE164?: string | null;
    brokerageRole?: string | null;
    status?: string | null;
    activeClients?: number | null;
  };
};

interface PageDto<T> {
  content: T[];
  totalElements?: number;
}

function titleCase(value?: string | null) {
  const raw = (value ?? '').trim();
  if (!raw) return 'Active';
  return raw
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getDisplayName(agent?: AgentRouteParams['agent']) {
  const fromDisplayName = (agent?.displayName ?? '').trim();
  if (fromDisplayName) return fromDisplayName;
  const first = (agent?.firstName ?? '').trim();
  const last = (agent?.lastName ?? '').trim();
  return `${first} ${last}`.trim() || 'Agent';
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function openExternalUrl(url: string, errorMessage: string) {
  Linking.openURL(url).catch(() => {
    if (Platform.OS === 'web') {
      globalThis.alert(errorMessage);
    } else {
      Alert.alert('Unable to open', errorMessage);
    }
  });
}

export function AgentProfileScreen() {
  const route = useRoute<any>();
  const { agentId, agent } = (route.params ?? {}) as AgentRouteParams;
  const footerHeight = useBrokerageFooterHeight();
  const [searchQuery, setSearchQuery] = useState('');
  const [showAllClients, setShowAllClients] = useState(false);

  const displayName = getDisplayName(agent);
  const email = agent?.email?.trim() || '';
  const phone = agent?.phoneE164?.trim() || '';
  const status = titleCase(agent?.status ?? agent?.brokerageRole);
  const fallbackClients = agent?.activeClients ?? 0;

  const { data: clientsPage } = useQuery<PageDto<BrokerAgentClient>>({
    queryKey: ['broker-agent-clients', agentId],
    queryFn: async () => {
      const response = await api.get<PageDto<BrokerAgentClient>>(
        `${API_GLOBAL_PATHS.brokerAgents}/${agentId}/clients?page=0&size=50`
      );
      return response.data;
    },
    enabled: !!agentId,
  });

  const clients = clientsPage?.content ?? [];
  const liveClientCount = clientsPage?.totalElements ?? fallbackClients;

  const filteredClients = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return clients;
    return clients.filter((client) => {
      const fullName = `${client.firstName} ${client.lastName}`.trim().toLowerCase();
      return (
        fullName.includes(q) ||
        client.email.toLowerCase().includes(q) ||
        (client.phoneE164 ?? '').toLowerCase().includes(q)
      );
    });
  }, [clients, searchQuery]);

  const visibleClients = showAllClients ? filteredClients : filteredClients.slice(0, INITIAL_CLIENT_LIMIT);
  const hiddenClientCount = Math.max(filteredClients.length - visibleClients.length, 0);
  const canToggleClients = filteredClients.length > INITIAL_CLIENT_LIMIT;

  const handleEmail = () => {
    if (email) openExternalUrl(`mailto:${email}`, 'Unable to open mail client.');
  };

  const handleCall = () => {
    if (phone) openExternalUrl(`tel:${phone}`, 'Unable to open dialer.');
  };

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingBottom: footerHeight + 24 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{getInitials(displayName)}</Text>
            </View>
            <View style={styles.heroInfo}>
              <View style={styles.statusBadge}>
                <ShieldCheck size={13} color="#1e40af" />
                <Text style={styles.statusText}>{status}</Text>
              </View>
              <Text style={styles.name} numberOfLines={2}>{displayName}</Text>
              <Text style={styles.subtleText}>Brokerage agent profile</Text>
            </View>
          </View>

          <View style={styles.contactGrid}>
            <ContactChip
              icon={<Mail size={16} color="#1e40af" />}
              label="Email"
              value={email || 'Not available'}
              disabled={!email}
              onPress={handleEmail}
            />
            <ContactChip
              icon={<Phone size={16} color="#16a34a" />}
              label="Mobile"
              value={phone || 'Not available'}
              disabled={!phone}
              onPress={handleCall}
            />
          </View>
        </View>

        <View style={styles.clientsCard}>
          <View style={styles.clientsHeader}>
            <View>
              <Text style={styles.sectionEyebrow}>Assigned Clients</Text>
              <Text style={styles.sectionTitle}>{liveClientCount} clients under this agent</Text>
            </View>
          </View>

          <View style={styles.searchWrap}>
            <Search size={16} color={colors.textDisabled} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name, email or phone"
              placeholderTextColor={colors.textDisabled}
              value={searchQuery}
              onChangeText={(value) => {
                setSearchQuery(value);
                setShowAllClients(false);
              }}
            />
          </View>

          {filteredClients.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No clients found</Text>
              <Text style={styles.emptyText}>Try another name, email, or phone number.</Text>
            </View>
          ) : (
            <View style={styles.clientList}>
              {visibleClients.map((client, index) => (
                <React.Fragment key={client.id}>
                  <AgentClientListItem
                    client={client}
                    onPress={(c) => console.log('Client pressed:', c.id)}
                  />
                  {index < visibleClients.length - 1 && <View style={styles.divider} />}
                </React.Fragment>
              ))}
            </View>
          )}

          {canToggleClients && (
            <Pressable
              style={({ pressed }) => [styles.viewMoreButton, pressed && styles.pressed]}
              onPress={() => setShowAllClients((value) => !value)}
            >
              <Text style={styles.viewMoreText}>
                {showAllClients ? 'Show less' : `View more${hiddenClientCount ? ` (${hiddenClientCount})` : ''}`}
              </Text>
              {showAllClients ? (
                <ChevronUp size={18} color="#1e40af" />
              ) : (
                <ChevronDown size={18} color="#1e40af" />
              )}
            </Pressable>
          )}
        </View>
      </ScrollView>
      <BrokerageFooter active="agents" />
    </>
  );
}

function ContactChip({
  icon,
  label,
  value,
  disabled,
  onPress,
}: Readonly<{
  icon: React.ReactNode;
  label: string;
  value: string;
  disabled: boolean;
  onPress: () => void;
}>) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.contactChip,
        disabled && styles.disabledChip,
        pressed && !disabled && styles.pressed,
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <View style={styles.contactIcon}>{icon}</View>
      <View style={styles.contactTextWrap}>
        <Text style={styles.contactLabel}>{label}</Text>
        <Text style={styles.contactValue} numberOfLines={1}>{value}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    padding: 16,
    gap: 14,
  },
  heroCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#dbe4ef',
    padding: 18,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 4,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1e40af',
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '800',
  },
  heroInfo: {
    flex: 1,
    minWidth: 0,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: '#eff6ff',
    marginBottom: 8,
  },
  statusText: {
    color: '#1e40af',
    fontSize: 12,
    fontWeight: '800',
  },
  name: {
    color: '#0f172a',
    fontSize: 25,
    fontWeight: '800',
    lineHeight: 30,
  },
  subtleText: {
    marginTop: 4,
    color: '#64748b',
    fontSize: 14,
    fontWeight: '600',
  },
  contactGrid: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  contactChip: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  disabledChip: {
    opacity: 0.55,
  },
  pressed: {
    opacity: 0.72,
  },
  contactIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  contactTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  contactLabel: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  contactValue: {
    marginTop: 2,
    color: '#1e293b',
    fontSize: 13,
    fontWeight: '700',
  },
  sectionEyebrow: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  sectionTitle: {
    color: '#0f172a',
    fontSize: 17,
    fontWeight: '800',
    marginTop: 4,
  },
  clientsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#dbe4ef',
    overflow: 'hidden',
  },
  clientsHeader: {
    padding: 16,
    paddingBottom: 12,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 13,
    minHeight: 46,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 13,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    fontSize: 14,
    color: '#1e293b',
  },
  clientList: {
    paddingBottom: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginHorizontal: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingVertical: 28,
  },
  emptyTitle: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '800',
  },
  emptyText: {
    marginTop: 4,
    color: '#94a3b8',
    fontSize: 13,
    textAlign: 'center',
  },
  viewMoreButton: {
    margin: 16,
    marginTop: 10,
    minHeight: 46,
    borderRadius: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  viewMoreText: {
    color: '#1e40af',
    fontSize: 14,
    fontWeight: '800',
  },
});
