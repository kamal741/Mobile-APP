import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useFocusEffect, useRoute, useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useHeaderHeight } from '@react-navigation/elements';
import { useQuery } from '@tanstack/react-query';
import { colors, fontSize, fontWeight, spacing } from '@/theme';
import { useAuth } from '../contexts/AuthContext';
import { useAgentClientNameMap } from '../hooks/useAgentClientNameMap';
import {
  useAddGroupMembers,
  useChatConversation,
  useChatMessages,
  useChatRole,
  useDeleteChatMessage,
  useMarkConversationRead,
  useRemoveGroupMember,
  useSendChatMessage,
} from '../hooks/useChat';
import { api } from '../lib/api';
import {
  buildReplyMessageText,
  isOwnMessage,
  plainMessageText,
  type ChatReplyContext,
} from '../lib/chat/display';
import {
  buildParticipantNameMap,
  currentUserDisplayName,
  listGroupMembers,
  mentionHandle,
  messageSenderKey,
  messageSenderName,
} from '../lib/chat/participants';
import type { ChatMessage, ChatRole } from '../lib/chat/types';
import type { GroupMemberDisplay } from '../lib/chat/participants';
import { API_GLOBAL_PATHS } from '../lib/apiGlobalPaths';
import { AddGroupMemberSheet } from './chat/components/AddGroupMemberSheet';
import {
  ChatComposer,
  type ChatMentionCandidate,
} from './chat/components/ChatComposer';
import { DeleteMessageModal } from './chat/components/DeleteMessageModal';
import { GroupInfoBar } from './chat/components/GroupInfoBar';
import { GroupMembersSheet } from './chat/components/GroupMembersSheet';
import { MessageBubble } from './chat/components/MessageBubble';
import { NormalButton } from '@/components/common/ST_Buttons';
import { NavbarSecondary } from '@/components/NavbarSecondary';

interface AgentClientListItem {
  id: number;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
}

interface AgentClientsPage {
  content: AgentClientListItem[];
}

function stripPropertyIdLine(value: string): string {
  return value
    .replace(/\n?\s*Property ID:\s*#?\d+\s*/i, '')
    .replace(/\n{2,}$/g, '')
    .trim();
}

export function ChatRoomScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { conversationId, otherUserName, sharedProperty } = route.params ?? {};
  const { user } = useAuth();
  const role = useChatRole();
  const [text, setText] = useState('');
  const [showMembers, setShowMembers] = useState(false);
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [replyTo, setReplyTo] = useState<ChatReplyContext | null>(null);
  const [actionMessage, setActionMessage] = useState<ChatMessage | null>(null);
  const [deleteConfirmMessageId, setDeleteConfirmMessageId] = useState<string | null>(
    null,
  );
  const [propertyCard, setPropertyCard] = useState<typeof sharedProperty | null>(
    sharedProperty ?? null,
  );
  const [removeMemberError, setRemoveMemberError] = useState<string | null>(null);
  const [androidKeyboardInset, setAndroidKeyboardInset] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const lastMarkedMessageIdRef = useRef<string | null>(null);
  const isInputFocusedRef = useRef(false);
  const messagesRef = useRef<ChatMessage[]>([]);

  const { data: conversation } = useChatConversation(conversationId);
  const { data: messages = [], isLoading } = useChatMessages(conversationId);
  const { data: clientNameMap = {} } = useAgentClientNameMap(role === 'agent');
  const sendMessage = useSendChatMessage(conversationId);
  const deleteMessage = useDeleteChatMessage(conversationId);
  const markRead = useMarkConversationRead(conversationId);
  const addGroupMembers = useAddGroupMembers(conversationId);
  const removeGroupMember = useRemoveGroupMember(conversationId);
  const headerHeight = useHeaderHeight();

  const isAgent = role === 'agent';
  const isGroup = conversation?.conversationType === 'GROUP';
  const canManageGroup = isAgent && isGroup;

  const { data: addClientsPage, isLoading: addClientsLoading } = useQuery({
    queryKey: [API_GLOBAL_PATHS.agentClients, 'chat-group-add', conversationId],
    enabled: canManageGroup && showAddMembers,
    queryFn: async () => {
      const response = await api.get<AgentClientsPage>(
        `${API_GLOBAL_PATHS.agentClients}?page=0&size=200`,
      );
      return response.data.content ?? [];
    },
  });

  const addClientOptions = useMemo(
    () =>
      (addClientsPage ?? []).map((client) => ({
        id: String(client.id),
        firstName: client.firstName ?? '',
        lastName: client.lastName ?? '',
        email: client.email ?? '—',
      })),
    [addClientsPage],
  );

  const managingMembers = addGroupMembers.isPending || removeGroupMember.isPending;
  const groupTitle = conversation?.title?.trim() || otherUserName || 'Group chat';

  const agentDisplayName =
    user?.role === 'client'
      ? ((user as { agentDetails?: { displayName?: string } }).agentDetails?.displayName ??
        'Your Agent')
      : undefined;

  const currentUserName = user ? currentUserDisplayName(user) : undefined;

  const participantNames = useMemo(() => {
    if (!conversation || !role || !user?.id) return {};
    return buildParticipantNameMap(conversation, role, {
      currentUserId: user.id,
      currentUserName,
      clientNameMap,
      agentDisplayName,
    });
  }, [agentDisplayName, clientNameMap, conversation, currentUserName, role, user?.id]);

  const groupMembers = useMemo(() => {
    if (!conversation || !user?.id || !role) return [];
    const chatRole = role as ChatRole;
    return listGroupMembers(conversation, participantNames, user.id, chatRole);
  }, [conversation, participantNames, role, user?.id]);

  const mentionCandidates = useMemo<ChatMentionCandidate[]>(
    () => {
      const members = groupMembers.filter((member) => !member.isSelf);
      const handleCounts = members.reduce<Record<string, number>>((counts, member) => {
        const handle = mentionHandle(member.name, member.id).toLowerCase();
        counts[handle] = (counts[handle] ?? 0) + 1;
        return counts;
      }, {});
      return members.map((member) => {
        const baseHandle = mentionHandle(member.name, member.id);
        return {
          key: member.key,
          id: member.id,
          name: member.name,
          handle:
            handleCounts[baseHandle.toLowerCase()] > 1
              ? `${baseHandle}${member.id}`
              : baseHandle,
          kind: member.kind,
        };
      });
    },
    [groupMembers],
  );

  const existingClientIds = useMemo(
    () =>
      groupMembers
        .filter((member) => member.kind === 'client')
        .map((member) => member.id),
    [groupMembers],
  );

  // Keep stable refs so useCallback / useFocusEffect don't depend on the
  // mutation object itself (which React Query recreates on every render).
  const markReadMutateRef = useRef(markRead.mutate);
  const markReadPendingRef = useRef(markRead.isPending);
  useEffect(() => { markReadMutateRef.current = markRead.mutate; });
  useEffect(() => { markReadPendingRef.current = markRead.isPending; });
  useEffect(() => { messagesRef.current = messages; }, [messages]);

  const scrollToLatest = useCallback((animated = true) => {
    if (messagesRef.current.length === 0) return;

    const scroll = () => flatListRef.current?.scrollToEnd({ animated });

    scroll();
    requestAnimationFrame(scroll);
    setTimeout(scroll, 50);
    setTimeout(scroll, 150);
  }, []);

  useEffect(() => {
    lastMarkedMessageIdRef.current = null;
  }, [conversationId]);

  // Pre-fill composer with property details when navigated from share sheet
  useEffect(() => {
    if (!sharedProperty) return;
    const fmt = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    });
    const lines = [
      `🏡 Property Share`,
      ``,
      `📍 ${sharedProperty.address}${sharedProperty.city ? `, ${sharedProperty.city}` : ''}${sharedProperty.province ? `, ${sharedProperty.province}` : ''}`,
      `💰 ${fmt.format(sharedProperty.price)}`,
      `🛏 ${sharedProperty.bedrooms} bed  🛁 ${sharedProperty.bathrooms} bath`,
      sharedProperty.propertyType ? `🏠 ${sharedProperty.propertyType}` : '',
      ``,
      `Property ID: #${sharedProperty.id}`,
    ].filter((l) => l !== undefined);
    setText(lines.join('\n'));
    setPropertyCard(sharedProperty);
  }, []); // run once on mount

  useLayoutEffect(() => {
    navigation.setOptions({
      header: () => (
        <NavbarSecondary
          title={isGroup ? groupTitle : otherUserName || 'Chat'}
          showSearch={false}
          showNotifications={false}
        />
      ),
    });
  }, [navigation, isGroup, groupTitle, otherUserName]);

  const markConversationAsRead = useCallback(
    (latestMessageId?: string) => {
      if (!conversationId || markReadPendingRef.current) return;
      if (latestMessageId && lastMarkedMessageIdRef.current === latestMessageId) return;
      if (latestMessageId) {
        lastMarkedMessageIdRef.current = latestMessageId;
      }
      markReadMutateRef.current(undefined, {
        onError: () => {
          if (latestMessageId && lastMarkedMessageIdRef.current === latestMessageId) {
            lastMarkedMessageIdRef.current = null;
          }
        },
      });
    },
    [conversationId],
  );

  // Fire once on screen focus — reads current messages via ref, not as a dep.
  useFocusEffect(
    useCallback(() => {
      const latest = messagesRef.current.at(-1);
      markConversationAsRead(latest?.id);
      return undefined;
    }, [markConversationAsRead]),
  );

  useEffect(() => {
    if (messages.length === 0) return;
    const timer = setTimeout(() => scrollToLatest(true), 80);
    return () => clearTimeout(timer);
  }, [messages.length, scrollToLatest]);

  const restoreBottomSafePadding = useCallback(() => {
    setAndroidKeyboardInset(0);
  }, []);

  useEffect(() => {
    const showEvent =
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent =
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSubscription = Keyboard.addListener(showEvent, (event) => {
      if (Platform.OS === 'android') {
        setAndroidKeyboardInset(event.endCoordinates?.height ?? 0);
      }
      scrollToLatest(true);
    });
    const hideSubscription = Keyboard.addListener(hideEvent, restoreBottomSafePadding);

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [restoreBottomSafePadding, scrollToLatest]);

  const handleComposerFocusChange = useCallback(
    (focused: boolean) => {
      isInputFocusedRef.current = focused;
      if (focused) {
        scrollToLatest(true);
        return;
      }

      restoreBottomSafePadding();
    },
    [restoreBottomSafePadding, scrollToLatest],
  );

  // Mark as read when a new incoming message arrives.
  useEffect(() => {
    if (!role || !user?.id || messages.length === 0) return;
    const latest = messages.at(-1);
    if (!latest) return;
    if (!isOwnMessage(latest, role, user.id) && lastMarkedMessageIdRef.current !== latest.id) {
      markConversationAsRead(latest.id);
    }
  }, [markConversationAsRead, messages, role, user?.id]);

  const handleReplyToMessage = useCallback(
    (message: ChatMessage) => {
      if (!role || !user?.id) return;
      const mine = isOwnMessage(message, role, user.id);
      const senderName =
        mine
          ? 'You'
          : messageSenderName(message, participantNames, false) ||
            otherUserName ||
            (isGroup ? 'Participant' : 'Message');
      const preview = stripPropertyIdLine(plainMessageText(message)) || 'Message';

      setReplyTo({
        messageId: message.id,
        senderName,
        preview,
      });
    },
    [isGroup, otherUserName, participantNames, role, user?.id],
  );

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || sendMessage.isPending) return;
    const outgoingText = buildReplyMessageText(trimmed, replyTo);
    setText('');
    setReplyTo(null);
    setPropertyCard(null);
    const handlesInMessage = new Set(
      outgoingText.match(/@[a-zA-Z0-9_]+/g)?.map((handle) => handle.slice(1)) ?? [],
    );
    const activeMentions = mentionCandidates.filter((candidate) =>
      handlesInMessage.has(candidate.handle),
    );
    sendMessage.mutate({
      text: outgoingText,
      mentionedAgentIds: activeMentions
        .filter((candidate) => candidate.kind === 'agent')
        .map((candidate) => candidate.id),
      mentionedClientProfileIds: activeMentions
        .filter((candidate) => candidate.kind === 'client')
        .map((candidate) => candidate.id),
    }, {
      onSuccess: () => {
        // Ensure the conversation is marked read for the sender immediately
        // so they don't see their own sent message as unread when navigating back.
        try {
          markReadMutateRef.current?.();
        } catch {
          // swallow any errors here; mark-read will retry elsewhere
        }
      },
    });
  };

  const handleDeleteMessage = useCallback(
    (message: ChatMessage) => {
      if (replyTo?.messageId === message.id) {
        setReplyTo(null);
      }
      deleteMessage.mutate(message.id, {
        onSuccess: () => {
          setActionMessage(null);
          setDeleteConfirmMessageId(null);
        },
        onError: () => {
          setDeleteConfirmMessageId(null);
          Alert.alert(
            'Unable to delete message',
            'The message could not be deleted. Please try again.',
          );
        },
      });
    },
    [deleteMessage, replyTo?.messageId],
  );

  const handleAddMembers = async (clientProfileIds: number[]) => {
    try {
      await addGroupMembers.mutateAsync(clientProfileIds);
      setShowAddMembers(false);
      setShowMembers(true);
    } catch {
      Alert.alert('Unable to add members', 'Please try again in a moment.');
    }
  };

  const handleRemoveMember = (member: GroupMemberDisplay) => {
    setRemoveMemberError(null);
    removeGroupMember.mutate(
      member.kind === 'client'
        ? { clientProfileId: member.id }
        : { agentId: member.id },
      {
        onSuccess: () => {
          setRemoveMemberError(null);
        },
        onError: () => {
          setRemoveMemberError('Unable to remove member. Please try again.');
        },
      },
    );
  };

  const resolveSenderLabel = (index: number) => {
    if (!isGroup || !role || !user?.id) return null;
    const message = messages[index];
    const mine = isOwnMessage(message, role, user.id);
    const name = messageSenderName(message, participantNames, mine);
    if (!name) return null;

    const currentKey = messageSenderKey(message);
    const previousKey = index > 0 ? messageSenderKey(messages[index - 1]) : null;
    if (currentKey && currentKey === previousKey) return null;

    return name;
  };

  const composerBottomPadding = (() => {
    if (Platform.OS !== 'android') return 0;
    if (androidKeyboardInset > 0) return androidKeyboardInset;
    return 0;
  })();

  const composerDockContent = (
    <>
      {propertyCard ? (
        <View style={styles.propertyPreviewBar}>
          <View style={styles.propertyPreviewContent}>
            <View style={styles.propertyPreviewAccent} />
            <View style={styles.propertyPreviewText}>
              <Text style={styles.propertyPreviewPrice}>
                {new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: 'USD',
                  maximumFractionDigits: 0,
                }).format(propertyCard.price)}
              </Text>
              <Text style={styles.propertyPreviewAddress} numberOfLines={1}>
                {propertyCard.address}
                {propertyCard.city ? `, ${propertyCard.city}` : ''}
              </Text>
              <Text style={styles.propertyPreviewMeta}>
                {propertyCard.bedrooms} bed · {propertyCard.bathrooms} bath
                {propertyCard.propertyType ? ` · ${propertyCard.propertyType}` : ''}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={() => {
              setPropertyCard(null);
              setText('');
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={styles.propertyPreviewDismiss}
          >
            <Text style={styles.propertyPreviewDismissText}>✕</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <ChatComposer
        value={text}
        onChange={setText}
        onSend={handleSend}
        sending={sendMessage.isPending}
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(null)}
        mentionCandidates={mentionCandidates}
        onFocusChange={handleComposerFocusChange}
      />
    </>
  );

  if (isLoading || !role || !user?.id) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary.default} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {isGroup ? (
          <GroupInfoBar
            memberCount={groupMembers.length || conversation?.members.length || 0}
            onPress={() => setShowMembers(true)}
          />
        ) : null}

        {messages.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>Start the conversation</Text>
              <Text style={styles.emptySubtitle}>
                Messages appear instantly for everyone in this chat.
              </Text>
            </View>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            style={styles.messageListFlex}
            data={messages}
            keyExtractor={(item) => item.id}
            keyboardDismissMode={
              Platform.OS === 'ios' ? 'interactive' : 'on-drag'
            }
            keyboardShouldPersistTaps="handled"
            automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
            renderItem={({ item, index }) => {
              const msgText = plainMessageText(item);
              const propertyIdMatch = msgText.match(/Property ID:\s*#?(\d+)/i);
              const linkedPropertyId = propertyIdMatch
                ? Number(propertyIdMatch[1])
                : null;
              // Strip the "Property ID: #123" line (and any blank line left behind)
              // so it never renders inside the bubble text.
              const displayText =
                linkedPropertyId !== null
                  ? stripPropertyIdLine(msgText)
                  : msgText;
              const displayItem =
                linkedPropertyId !== null
                  ? {
                      ...item,
                      ciphertext: displayText,
                    }
                  : item;
              return (
                <MessageBubble
                  message={displayItem}
                  role={role}
                  userId={user.id}
                  showDateHeader={
                    index === 0 ||
                    new Date(item.createdAt).toDateString() !==
                      new Date(messages[index - 1].createdAt).toDateString()
                  }
                  senderName={resolveSenderLabel(index)}
                  isRead={false}
                  selected={
                    replyTo?.messageId === item.id ||
                    actionMessage?.id === item.id
                  }
                  onOpenActions={() =>
                    setActionMessage((current) => {
                      setDeleteConfirmMessageId(null);
                      return current?.id === item.id ? null : item;
                    })
                  }
                  actionsVisible={actionMessage?.id === item.id}
                  canDelete={isOwnMessage(item, role, user.id)}
                  onReply={() => {
                    setActionMessage(null);
                    handleReplyToMessage(item);
                  }}
                  onDelete={() => setDeleteConfirmMessageId(item.id)}
                  onDismissActions={() => {
                    setActionMessage(null);
                    setDeleteConfirmMessageId(null);
                  }}
                  footer={
                    linkedPropertyId !== null ? (
                      <NormalButton
                        label="View Property"
                        variant="primary"
                        size="sm"
                        fullWidth={false}
                        onPress={() =>
                          navigation.navigate('PropertyDetails', {
                            propertyId: linkedPropertyId,
                          })
                        }
                      />
                    ) : undefined
                  }
                />
              );
            }}
            contentContainerStyle={styles.messageList}
            onContentSizeChange={() => scrollToLatest(false)}
          />
        )}
      </View>

      <KeyboardAvoidingView
        enabled={true}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? headerHeight : 0}
        style={styles.composerAvoiding}
      >
        <SafeAreaView
          edges={['bottom']}
          style={[
            styles.composerDock,
            Platform.OS === 'android' && { paddingBottom: composerBottomPadding },
          ]}
        >
          {composerDockContent}
        </SafeAreaView>
      </KeyboardAvoidingView>

      <DeleteMessageModal
        visible={deleteConfirmMessageId != null}
        preview={
          actionMessage
            ? stripPropertyIdLine(plainMessageText(actionMessage)) || 'Message'
            : ''
        }
        deleting={deleteMessage.isPending}
        onCancel={() => setDeleteConfirmMessageId(null)}
        onConfirm={() => {
          if (actionMessage?.id === deleteConfirmMessageId) {
            handleDeleteMessage(actionMessage);
          }
        }}
      />

      <GroupMembersSheet
        visible={showMembers}
        groupTitle={groupTitle}
        members={groupMembers}
        canManage={canManageGroup}
        managing={managingMembers}
        removeError={removeMemberError}
        onClose={() => {
          setShowMembers(false);
          setRemoveMemberError(null);
        }}
        onAddMembers={() => {
          setShowMembers(false);
          setRemoveMemberError(null);
          setShowAddMembers(true);
        }}
        onRemoveMember={handleRemoveMember}
        avoidFooterHeight={0}
      />

      <AddGroupMemberSheet
        visible={showAddMembers}
        clients={addClientOptions}
        existingClientIds={existingClientIds}
        loading={addClientsLoading}
        submitting={addGroupMembers.isPending}
        onAdd={handleAddMembers}
        onClose={() => setShowAddMembers(false)}
        avoidFooterHeight={0}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.screen,
  },
  composerAvoiding: {
    flexShrink: 0,
  },
  composerDock: {
    backgroundColor: colors.background.surface,
  },
  messageListFlex: {
    flex: 1,
    minHeight: 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing['4xl'],
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
  emptyCard: {
    width: '100%',
    backgroundColor: colors.background.surface,
    borderRadius: 24,
    padding: spacing['2xl'],
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  messageList: {
    padding: spacing['3xl'],
    paddingBottom: spacing.xl,
  },
  content: {
    flex: 1,
    minHeight: 0,
  },
  propertyPreviewBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    borderTopWidth: 1,
    borderTopColor: '#bfdbfe',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  propertyPreviewContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  propertyPreviewAccent: {
    width: 3,
    height: 44,
    borderRadius: 2,
    backgroundColor: '#1d4ed8',
    flexShrink: 0,
  },
  propertyPreviewText: {
    flex: 1,
    gap: 2,
  },
  propertyPreviewPrice: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e40af',
  },
  propertyPreviewAddress: {
    fontSize: 12,
    color: '#1e293b',
  },
  propertyPreviewMeta: {
    fontSize: 11,
    color: '#64748b',
  },
  propertyPreviewDismiss: {
    paddingLeft: 12,
  },
  propertyPreviewDismissText: {
    fontSize: 15,
    color: '#94a3b8',
    fontWeight: '600',
  },
});
