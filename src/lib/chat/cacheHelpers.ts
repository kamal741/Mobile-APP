import type { QueryClient } from '@tanstack/react-query';
import { chatQueryKeys } from './queryKeys';
import type {
  AddGroupMemberRequest,
  ChatConversation,
  ChatEventPayload,
  ChatMessage,
  ChatRole,
} from './types';

function toMessage(event: ChatEventPayload): ChatMessage | null {
  if (!event.messageId || !event.conversationId || !event.createdAt) {
    return null;
  }
  return {
    id: event.messageId,
    conversationId: event.conversationId,
    senderAgentId: event.senderAgentId ?? null,
    senderClientProfileId: event.senderClientProfileId ?? null,
    messageType: (event.messageType as ChatMessage['messageType']) ?? 'TEXT',
    ciphertext: event.ciphertext ?? null,
    senderKeyId: event.senderKeyId ?? null,
    algorithmVersion: event.algorithmVersion ?? 'NONE',
    nonce: event.nonce ?? null,
    hasMentions: Boolean(event.hasMentions),
    createdAt: event.createdAt,
  };
}

export function upsertChatMessageInCache(
  queryClient: QueryClient,
  role: ChatRole,
  conversationId: string,
  message: ChatMessage,
) {
  queryClient.setQueryData<ChatMessage[]>(
    chatQueryKeys.messages(role, conversationId),
    (current = []) => {
      if (current.some((item) => item.id === message.id)) {
        return current;
      }
      return [...current, message].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
    },
  );
}

export function removeChatMessageFromCache(
  queryClient: QueryClient,
  role: ChatRole,
  conversationId: string,
  messageId: string,
) {
  queryClient.setQueryData<ChatMessage[]>(
    chatQueryKeys.messages(role, conversationId),
    (current = []) => current.filter((message) => message.id !== messageId),
  );
}

export function applyChatEventToCache(
  queryClient: QueryClient,
  role: ChatRole,
  userId: string,
  event: ChatEventPayload,
) {
  if (event.type === 'MESSAGE_CREATED') {
    const message = toMessage(event);
    if (!message) return;

    upsertChatMessageInCache(queryClient, role, message.conversationId, message);

    queryClient.setQueryData<ChatConversation[]>(
      chatQueryKeys.conversations(role),
      (current = []) =>
        current.map((conversation) => {
          if (conversation.id !== message.conversationId) return conversation;
          const isOwn =
            role === 'agent'
              ? message.senderAgentId === Number(userId)
              : message.senderClientProfileId === Number(userId);
          return {
            ...conversation,
            lastMessageAt: message.createdAt,
            unreadCount: isOwn ? conversation.unreadCount : conversation.unreadCount + 1,
          };
        }),
    );
    return;
  }

  if (event.type === 'MESSAGE_DELETED' && event.conversationId && event.messageId) {
    removeChatMessageFromCache(
      queryClient,
      role,
      event.conversationId,
      event.messageId,
    );
    queryClient.setQueryData<ChatConversation[]>(
      chatQueryKeys.conversations(role),
      (current = []) =>
        current.map((conversation) =>
          conversation.id === event.conversationId
            ? { ...conversation, lastMessageAt: event.lastMessageAt ?? null }
            : conversation,
        ),
    );
    return;
  }

  if (event.type === 'RECEIPT_UPDATED' || event.type === 'MEMBERSHIP_CHANGED') {
    queryClient.invalidateQueries({ queryKey: chatQueryKeys.conversations(role) });
    if (event.conversationId) {
      queryClient.invalidateQueries({
        queryKey: chatQueryKeys.conversation(role, event.conversationId),
      });
    }
  }
}

export function removeMemberFromConversationCache(
  queryClient: QueryClient,
  role: ChatRole,
  conversationId: string,
  target: AddGroupMemberRequest,
) {
  const keepMember = (member: ChatConversation['members'][number]) => {
    if (target.clientProfileId != null) {
      return member.clientProfileId !== target.clientProfileId;
    }
    if (target.agentId != null) {
      return member.agentId !== target.agentId;
    }
    return true;
  };

  const updateConversation = (conversation: ChatConversation): ChatConversation => {
    if (conversation.id !== conversationId) return conversation;
    return { ...conversation, members: conversation.members.filter(keepMember) };
  };

  queryClient.setQueryData<ChatConversation>(
    chatQueryKeys.conversation(role, conversationId),
    (current) => (current ? updateConversation(current) : current),
  );

  queryClient.setQueryData<ChatConversation[]>(
    chatQueryKeys.conversations(role),
    (current = []) => current.map(updateConversation),
  );
}

export function markConversationReadInCache(
  queryClient: QueryClient,
  role: ChatRole,
  conversationId: string,
) {
  queryClient.setQueryData<ChatConversation[]>(
    chatQueryKeys.conversations(role),
    (current = []) =>
      current.map((conversation) =>
        conversation.id === conversationId
          ? { ...conversation, unreadCount: 0 }
          : conversation,
      ),
  );
}
