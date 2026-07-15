import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import {
  addGroupMember,
  createGroupConversation,
  deleteMessage,
  getConversation,
  listConversations,
  listMessages,
  markConversationRead,
  openClientDirectConversation,
  openDirectConversation,
  removeGroupAgentMember,
  removeGroupClientMember,
  sendMessage,
} from '../lib/chat/api';
import {
  markConversationReadInCache,
  removeMemberFromConversationCache,
  removeChatMessageFromCache,
  upsertChatMessageInCache,
} from '../lib/chat/cacheHelpers';
import { newDedupeKey } from '../lib/chat/display';
import {
  decryptConversationMessages,
  ensureRegisteredChatKey,
} from '../lib/chat/e2ee';
import { chatQueryKeys } from '../lib/chat/queryKeys';
import type {
  AddGroupMemberRequest,
  ChatConversation,
  ChatMessage,
  ChatRole,
  CreateGroupConversationRequest,
} from '../lib/chat/types';

export interface SendChatMessageInput {
  text: string;
  mentionedAgentIds?: number[];
  mentionedClientProfileIds?: number[];
}

const MESSAGE_PAGE_SIZE = 40;
const MESSAGE_REFETCH_INTERVAL_MS = 3_000;
const CONVERSATION_REFETCH_INTERVAL_MS = 5_000;

export function useChatRole(): ChatRole | null {
  const { user } = useAuth();
  if (user?.role === 'agent') return 'agent';
  if (user?.role === 'client') return 'client';
  return null;
}

export function useChatConversations() {
  const role = useChatRole();
  return useQuery({
    queryKey: role ? chatQueryKeys.conversations(role) : ['chat', 'disabled'],
    queryFn: async () => {
      await ensureRegisteredChatKey(role!);
      return listConversations(role!);
    },
    enabled: role != null,
    staleTime: 15_000,
    refetchInterval: CONVERSATION_REFETCH_INTERVAL_MS,
    refetchIntervalInBackground: true,
    refetchOnMount: 'always',
    refetchOnReconnect: true,
  });
}

export function useChatConversation(conversationId: string) {
  const role = useChatRole();

  return useQuery({
    queryKey: role
      ? chatQueryKeys.conversation(role, conversationId)
      : ['chat', 'conversation', 'disabled'],
    queryFn: () => getConversation(role!, conversationId),
    enabled: role != null && Boolean(conversationId),
    staleTime: 30_000,
  });
}

export function useChatUnreadCount() {
  const { data: conversations = [] } = useChatConversations();
  return conversations.reduce((sum, item) => sum + (item.unreadCount ?? 0), 0);
}

export function useChatUnreadConversationCount() {
  const { data: conversations = [] } = useChatConversations();
  return conversations.reduce(
    (sum, item) => sum + ((item.unreadCount ?? 0) > 0 ? 1 : 0),
    0,
  );
}

export function useChatMessages(conversationId: string) {
  const role = useChatRole();
  const { user } = useAuth();
  return useQuery({
    queryKey: role
      ? chatQueryKeys.messages(role, conversationId)
      : ['chat', 'messages', 'disabled'],
    queryFn: async () => {
      const page = await listMessages(role!, conversationId, { limit: MESSAGE_PAGE_SIZE });
      const sorted = [...page.messages].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
      if (!user?.id) return sorted;
      return decryptConversationMessages(role!, user.id, conversationId, sorted);
    },
    enabled: role != null && Boolean(conversationId),
    staleTime: 10_000,
    // Keep chat responsive even if realtime STOMP delivery temporarily drops.
    refetchInterval: MESSAGE_REFETCH_INTERVAL_MS,
    refetchIntervalInBackground: true,
    refetchOnMount: 'always',
    refetchOnReconnect: true,
  });
}

export function useOpenDirectConversation() {
  const queryClient = useQueryClient();
  const role = useChatRole();

  return useMutation({
    mutationFn: (clientProfileId: number) => openDirectConversation(clientProfileId),
    onSuccess: (conversation) => {
      if (role) {
        queryClient.setQueryData<ChatConversation[]>(
          chatQueryKeys.conversations(role),
          (current = []) => {
            if (current.some((item) => item.id === conversation.id)) return current;
            return [conversation, ...current];
          },
        );
        queryClient.invalidateQueries({ queryKey: chatQueryKeys.conversations(role) });
      }
    },
  });
}

export function useOpenClientDirectConversation() {
  const queryClient = useQueryClient();
  const role = useChatRole();

  return useMutation({
    mutationFn: (agentId: number) => openClientDirectConversation(agentId),
    onSuccess: (conversation) => {
      if (role) {
        queryClient.setQueryData<ChatConversation[]>(
          chatQueryKeys.conversations(role),
          (current = []) => {
            if (current.some((item) => item.id === conversation.id)) return current;
            return [conversation, ...current];
          },
        );
        queryClient.invalidateQueries({ queryKey: chatQueryKeys.conversations(role) });
      }
    },
  });
}

export function useCreateGroupConversation() {
  const queryClient = useQueryClient();
  const role = useChatRole();

  return useMutation({
    mutationFn: (body: CreateGroupConversationRequest) => createGroupConversation(body),
    onSuccess: (conversation) => {
      if (role) {
        queryClient.setQueryData<ChatConversation[]>(
          chatQueryKeys.conversations(role),
          (current = []) => {
            if (current.some((item) => item.id === conversation.id)) return current;
            return [conversation, ...current];
          },
        );
        queryClient.invalidateQueries({ queryKey: chatQueryKeys.conversations(role) });
      }
    },
  });
}

function invalidateGroupConversation(
  queryClient: ReturnType<typeof useQueryClient>,
  role: ChatRole,
  conversationId: string,
) {
  queryClient.invalidateQueries({ queryKey: chatQueryKeys.conversation(role, conversationId) });
  queryClient.invalidateQueries({ queryKey: chatQueryKeys.conversations(role) });
}

export function useAddGroupMembers(conversationId: string) {
  const queryClient = useQueryClient();
  const role = useChatRole();

  return useMutation({
    mutationFn: async (clientProfileIds: number[]) => {
      for (const clientProfileId of clientProfileIds) {
        await addGroupMember(conversationId, { clientProfileId });
      }
    },
    onSuccess: () => {
      if (role) invalidateGroupConversation(queryClient, role, conversationId);
    },
  });
}

export function useRemoveGroupMember(conversationId: string) {
  const queryClient = useQueryClient();
  const role = useChatRole();

  return useMutation({
    mutationFn: async (target: AddGroupMemberRequest) => {
      if (target.clientProfileId != null) {
        await removeGroupClientMember(conversationId, target.clientProfileId);
        return;
      }
      if (target.agentId != null) {
        await removeGroupAgentMember(conversationId, target.agentId);
        return;
      }
      throw new Error('Member target required');
    },
    onMutate: (target) => {
      if (role) {
        removeMemberFromConversationCache(queryClient, role, conversationId, target);
      }
    },
    onSuccess: () => {
      if (role) invalidateGroupConversation(queryClient, role, conversationId);
    },
  });
}

export function useSendChatMessage(conversationId: string) {
  const queryClient = useQueryClient();
  const role = useChatRole();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      text,
      mentionedAgentIds = [],
      mentionedClientProfileIds = [],
    }: SendChatMessageInput) => {
      if (!role) throw new Error('Chat role unavailable');
      if (!user?.id) throw new Error('User identity unavailable');

      const trimmed = text.trim();
      const dedupeKey = newDedupeKey();

      // NOTE: E2EE sending is temporarily disabled because cross-session key
      // management (different browsers / devices) causes messages to become
      // unreadable when a party's private key changes. All new messages are
      // sent as NONE (plaintext) until secure key backup is in place.
      // Key registration still runs in the background for infrastructure readiness.
      const payload: import('../lib/chat/types').SendChatMessageRequest = {
        ciphertext: trimmed,
        algorithmVersion: 'NONE',
        dedupeKey,
        mentionedAgentIds,
        mentionedClientProfileIds,
      };

      return sendMessage(role, conversationId, payload);
    },
    onSuccess: (message, variables) => {
      if (!role) return;
      // Store the plaintext in cache immediately so the sender sees the real
      // text instead of the raw encrypted ciphertext ("Encrypted message").
      // The server holds the encrypted form; the local cache shows plaintext.
      const displayMessage: ChatMessage = {
        ...message,
        ciphertext: variables.text.trim(),
        algorithmVersion: 'NONE',
        nonce: null,
      };
      upsertChatMessageInCache(queryClient, role, conversationId, displayMessage);
      queryClient.setQueryData<ChatConversation[]>(
        chatQueryKeys.conversations(role),
        (current = []) =>
          current.map((conversation) =>
            conversation.id === conversationId
              ? { ...conversation, lastMessageAt: message.createdAt, unreadCount: 0 }
              : conversation,
          ),
      );
    },
    onError: (_error, input) => {
      if (__DEV__) {
        console.warn(
          '[chat] send failed',
          conversationId,
          user?.id,
          input.text.slice(0, 40),
        );
      }
    },
  });
}

export function useDeleteChatMessage(conversationId: string) {
  const queryClient = useQueryClient();
  const role = useChatRole();

  return useMutation({
    mutationFn: async (messageId: string) => {
      if (!role) throw new Error('Chat role unavailable');
      await deleteMessage(role, conversationId, messageId);
      return messageId;
    },
    onMutate: async (messageId) => {
      if (!role) return undefined;
      await queryClient.cancelQueries({
        queryKey: chatQueryKeys.messages(role, conversationId),
      });
      const previous = queryClient.getQueryData<ChatMessage[]>(
        chatQueryKeys.messages(role, conversationId),
      );
      removeChatMessageFromCache(queryClient, role, conversationId, messageId);
      return { previous };
    },
    onError: (_error, _messageId, context) => {
      if (!role || !context?.previous) return;
      queryClient.setQueryData(
        chatQueryKeys.messages(role, conversationId),
        context.previous,
      );
    },
    onSettled: () => {
      if (!role) return;
      queryClient.invalidateQueries({
        queryKey: chatQueryKeys.messages(role, conversationId),
      });
      queryClient.invalidateQueries({ queryKey: chatQueryKeys.conversations(role) });
    },
  });
}

export function useMarkConversationRead(conversationId: string) {
  const queryClient = useQueryClient();
  const role = useChatRole();

  return useMutation({
    mutationFn: () => {
      if (!role) throw new Error('Chat role unavailable');
      return markConversationRead(role, conversationId);
    },
    onSuccess: () => {
      if (!role) return;
      markConversationReadInCache(queryClient, role, conversationId);
    },
  });
}

export function useLoadOlderMessages(conversationId: string) {
  const role = useChatRole();

  return useInfiniteQuery({
    queryKey: [...chatQueryKeys.messages(role ?? 'agent', conversationId), 'older'] as const,
    enabled: false,
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      const page = await listMessages(role!, conversationId, {
        before: pageParam,
        limit: MESSAGE_PAGE_SIZE,
      });
      return page;
    },
    getNextPageParam: (lastPage) => lastPage.nextBefore ?? undefined,
    select: (data) => data.pages.flatMap((page) => page.messages),
  });
}
