import { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { MessageSquarePlus, MessagesSquare } from 'lucide-react-native';
import { colors, border, fontSize, fontWeight, spacing } from '@/theme';
import { useAuth } from '../contexts/AuthContext';
import { useAgentClientNameMap } from '../hooks/useAgentClientNameMap';
import {
  useChatConversations,
  useChatRole,
  useCreateGroupConversation,
  useOpenClientDirectConversation,
  useOpenDirectConversation,
} from '../hooks/useChat';
import { api } from '../lib/api';
import { conversationTitle } from '../lib/chat/display';
import type { ChatConversation } from '../lib/chat/types';
import { API_GLOBAL_PATHS } from '../lib/apiGlobalPaths';
import { ClientFooter, useClientFooterHeight } from './client/components/ClientFooter';
import { AgentFooter } from './agent/components/AgentFooter';
import { AgentPinnedRow } from './chat/components/AgentPinnedRow';
import { ConversationRow } from './chat/components/ConversationRow';
import { CreateGroupChatSheet } from './chat/components/CreateGroupChatSheet';
import { NewChatChooserSheet } from './chat/components/NewChatChooserSheet';
import { NewChatSheet } from './chat/components/NewChatSheet';

interface AgentClientListItem {
  id: number;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
}

interface AgentClientsPage {
  content: AgentClientListItem[];
}

export function ChatListScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const role = useChatRole();
  const isAgent = role === 'agent';
  const [showNewChatChooser, setShowNewChatChooser] = useState(false);
  const [showDirectChat, setShowDirectChat] = useState(false);
  const [showGroupChat, setShowGroupChat] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  const [groupClientSearch, setGroupClientSearch] = useState('');

  const {
    data: conversations = [],
    isLoading,
    isRefetching,
    refetch,
    error,
  } = useChatConversations();

  const { data: clientNameMap = {} } = useAgentClientNameMap(isAgent);
  const openDirectConversation = useOpenDirectConversation();
  const openClientDirectConversation = useOpenClientDirectConversation();
  const createGroupConversation = useCreateGroupConversation();

  const { data: clientsPage, isLoading: clientsLoading } = useQuery({
    queryKey: [API_GLOBAL_PATHS.agentClients, 'chat-new'],
    enabled: isAgent && showDirectChat,
    queryFn: async () => {
      const response = await api.get<AgentClientsPage>(
        `${API_GLOBAL_PATHS.agentClients}?page=0&size=200`,
      );
      return response.data.content ?? [];
    },
  });

  const { data: groupClientsPage, isLoading: groupClientsLoading } = useQuery({
    queryKey: [API_GLOBAL_PATHS.agentClients, 'chat-group'],
    enabled: isAgent && showGroupChat,
    queryFn: async () => {
      const response = await api.get<AgentClientsPage>(
        `${API_GLOBAL_PATHS.agentClients}?page=0&size=200`,
      );
      return response.data.content ?? [];
    },
  });

  const clientOptions = useMemo(
    () =>
      (clientsPage ?? []).map((client) => ({
        id: String(client.id),
        firstName: client.firstName ?? '',
        lastName: client.lastName ?? '',
        email: client.email ?? '—',
      })),
    [clientsPage],
  );

  const groupClientOptions = useMemo(
    () =>
      (groupClientsPage ?? []).map((client) => ({
        id: String(client.id),
        firstName: client.firstName ?? '',
        lastName: client.lastName ?? '',
        email: client.email ?? '—',
      })),
    [groupClientsPage],
  );

  const clientAgentDetails =
    user?.role === 'client'
      ? (user as {
          agentDetails?: {
            id?: number | null;
            displayName?: string | null;
            profileImageUrl?: string | null;
          } | null;
        }).agentDetails
      : undefined;

  const agentDisplayName = user?.role === 'client' ? clientAgentDetails?.displayName ?? 'Your Agent' : undefined;

  const handleOpenConversation = (conversation: ChatConversation) => {
    const title = conversationTitle(conversation, role!, {
      clientNameMap,
      agentDisplayName,
    });
    navigation.navigate('ChatRoom', {
      conversationId: conversation.id,
      otherUserName: title,
    });
  };

  const insets = useSafeAreaInsets();
  const footerHeight = Math.max(useClientFooterHeight() - Math.max(insets.bottom, 0), 0);

  // For clients: the agent conversation is always the single DIRECT (non-group)
  // conversation in the list, since a client only ever talks to one agent.
  const agentConversation = useMemo(
    () =>
      !isAgent
        ? conversations.find((conversation) => conversation.conversationType !== 'GROUP')
        : undefined,
    [conversations, isAgent],
  );

  const handlePressAgentRow = async () => {
    // If the agent conversation is already in the list, just navigate — no
    // need to re-create it.
    if (agentConversation) {
      handleOpenConversation(agentConversation);
      return;
    }

    const agentId = clientAgentDetails?.id;
    if (!agentId) {
      Alert.alert(
        'Conversation not ready',
        'Your agent chat will appear here once a conversation has been started.',
      );
      return;
    }

    try {
      const conversation = await openClientDirectConversation.mutateAsync(agentId);
      handleOpenConversation(conversation);
    } catch {
      Alert.alert('Unable to open chat', 'Please try again in a moment.');
    }
  };

  // Clients see the agent conversation pinned above the list, so exclude it
  // from the FlatList to avoid showing it twice. Agents see the full list.
  const listConversations = useMemo(
    () =>
      !isAgent && agentConversation
        ? conversations.filter((conversation) => conversation.id !== agentConversation.id)
        : conversations,
    [conversations, isAgent, agentConversation],
  );

  const handleStartConversation = async (clientProfileId: number) => {
    try {
      const conversation = await openDirectConversation.mutateAsync(clientProfileId);
      setShowDirectChat(false);
      setShowNewChatChooser(false);
      setClientSearch('');
      handleOpenConversation(conversation);
    } catch {
      Alert.alert('Unable to start chat', 'Please try again in a moment.');
    }
  };

  const handleCreateGroup = async (payload: { title: string; memberClientProfileIds: number[] }) => {
    try {
      const conversation = await createGroupConversation.mutateAsync({
        title: payload.title,
        memberClientProfileIds: payload.memberClientProfileIds,
      });
      setShowGroupChat(false);
      setShowNewChatChooser(false);
      setGroupClientSearch('');
      handleOpenConversation(conversation);
    } catch {
      Alert.alert('Unable to create group', 'Please check the group name and clients, then try again.');
    }
  };

  const openNewChatFlow = () => setShowNewChatChooser(true);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary.default} />
      </View>
    );
  }

  return (
    <>
      <View style={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Messages</Text>
            <Text style={styles.headerSubtitle}>
              Real-time chat with {isAgent ? 'your clients' : 'your agent'}
            </Text>
          </View>
          {isAgent ? (
            <TouchableOpacity
              style={styles.newChatButton}
              onPress={openNewChatFlow}
              activeOpacity={0.85}
            >
              <MessageSquarePlus size={20} color={colors.text.inverse} />
            </TouchableOpacity>
          ) : null}
        </View>

        {!isAgent ? (
          <AgentPinnedRow
            agentName={agentDisplayName ?? 'Your Agent'}
            agentImageUrl={clientAgentDetails?.profileImageUrl}
            isLoading={!agentConversation && openClientDirectConversation.isPending}
            onPress={handlePressAgentRow}
          />
        ) : null}

        {error ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>Could not load conversations</Text>
            <Text style={styles.emptySubtitle}>Pull down to retry.</Text>
          </View>
        ) : listConversations.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconWrap}>
              <MessagesSquare size={34} color={colors.primary.default} />
            </View>
            <Text style={styles.emptyTitle}>No conversations yet</Text>
            <Text style={styles.emptySubtitle}>
              {isAgent
                ? 'Start a 1:1 chat or create a group with your clients.'
                : 'Your agent can reach you here when they send a message.'}
            </Text>
            {isAgent ? (
              <TouchableOpacity
                style={styles.emptyAction}
                onPress={openNewChatFlow}
              >
                <Text style={styles.emptyActionText}>Start new chat</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : (
          <FlatList
            data={listConversations}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <ConversationRow
                conversation={item}
                role={role!}
                clientNameMap={clientNameMap}
                agentDisplayName={agentDisplayName}
                onPress={() => handleOpenConversation(item)}
              />
            )}
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl
                refreshing={isRefetching}
                onRefresh={refetch}
                tintColor={colors.primary.default}
              />
            }
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        )}
      </View>

      <NewChatChooserSheet
        visible={showNewChatChooser}
        avoidFooterHeight={footerHeight}
        onClose={() => setShowNewChatChooser(false)}
        onChooseDirect={() => {
          setShowNewChatChooser(false);
          setShowDirectChat(true);
        }}
        onChooseGroup={() => {
          setShowNewChatChooser(false);
          setShowGroupChat(true);
        }}
      />

      <NewChatSheet
        visible={showDirectChat}
        clients={clientOptions}
        loading={clientsLoading}
        submitting={openDirectConversation.isPending}
        search={clientSearch}
        onSearchChange={setClientSearch}
        onSelectClient={handleStartConversation}
        onClose={() => {
          setShowDirectChat(false);
          setClientSearch('');
        }}
        avoidFooterHeight={footerHeight}
      />

      <CreateGroupChatSheet
        visible={showGroupChat}
        clients={groupClientOptions}
        loading={groupClientsLoading}
        submitting={createGroupConversation.isPending}
        search={groupClientSearch}
        onSearchChange={setGroupClientSearch}
        onCreate={handleCreateGroup}
        onClose={() => {
          setShowGroupChat(false);
          setGroupClientSearch('');
        }}
        avoidFooterHeight={footerHeight}
      />

      {isAgent ? <AgentFooter active="chat" /> : <ClientFooter active="chat" />}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.screen,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing['3xl'],
    paddingTop: spacing['3xl'],
    paddingBottom: spacing.xl,
    backgroundColor: colors.background.surface,
    borderBottomWidth: border.width.thin,
    borderBottomColor: colors.border.default,
  },
  headerTitle: {
    fontSize: fontSize['3xl'],
    fontWeight: fontWeight.bold,
    color: colors.text.primary,
  },
  headerSubtitle: {
    marginTop: 4,
    fontSize: fontSize.sm,
    color: colors.text.secondary,
  },
  newChatButton: {
    width: 44,
    height: 44,
    borderRadius: border.radius.full,
    backgroundColor: colors.primary.default,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    paddingBottom: spacing['3xl'],
  },
  separator: {
    height: 1,
    backgroundColor: colors.border.light,
    marginLeft: 80,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing['4xl'],
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: border.radius.full,
    backgroundColor: colors.primary.hover,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing['3xl'],
  },
  emptyTitle: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  emptySubtitle: {
    fontSize: fontSize.md,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  emptyAction: {
    marginTop: spacing['3xl'],
    paddingHorizontal: spacing['3xl'],
    paddingVertical: spacing.xl,
    borderRadius: border.radius.pill,
    backgroundColor: colors.primary.default,
  },
  emptyActionText: {
    color: colors.text.inverse,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semiBold,
  },
});

