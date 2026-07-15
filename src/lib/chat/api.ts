import { apiRequest } from '../api';
import { API_GLOBAL_PATHS } from '../apiGlobalPaths';
import type {
  AddGroupMemberRequest,
  ChatParticipantKey,
  ChatConversation,
  ChatMember,
  ChatMessage,
  ChatMessagePage,
  ChatRole,
  CreateGroupConversationRequest,
  SendChatMessageRequest,
  UpsertChatParticipantKeyRequest,
} from './types';

function conversationsBase(role: ChatRole): string {
  return role === 'agent'
    ? API_GLOBAL_PATHS.chatAgentConversations
    : API_GLOBAL_PATHS.chatClientConversations;
}

export async function listConversations(role: ChatRole): Promise<ChatConversation[]> {
  return apiRequest<ChatConversation[]>('GET', conversationsBase(role));
}

export async function getConversation(
  role: ChatRole,
  conversationId: string,
): Promise<ChatConversation> {
  return apiRequest<ChatConversation>('GET', `${conversationsBase(role)}/${conversationId}`);
}

export async function openDirectConversation(clientProfileId: number): Promise<ChatConversation> {
  return apiRequest<ChatConversation>(
    'POST',
    API_GLOBAL_PATHS.chatAgentDirectConversation,
    { clientProfileId },
  );
}

export async function openClientDirectConversation(agentId: number): Promise<ChatConversation> {
  return apiRequest<ChatConversation>(
    'POST',
    API_GLOBAL_PATHS.chatClientDirectConversation,
    { agentId },
  );
}

export async function createGroupConversation(
  body: CreateGroupConversationRequest,
): Promise<ChatConversation> {
  return apiRequest<ChatConversation>(
    'POST',
    API_GLOBAL_PATHS.chatAgentGroupConversation,
    body,
  );
}

export async function addGroupMember(
  conversationId: string,
  body: AddGroupMemberRequest,
): Promise<ChatMember> {
  return apiRequest<ChatMember>(
    'POST',
    `${API_GLOBAL_PATHS.chatAgentConversations}/${conversationId}/members`,
    body,
  );
}

export async function removeGroupAgentMember(
  conversationId: string,
  agentId: number,
): Promise<void> {
  await apiRequest(
    'DELETE',
    `${API_GLOBAL_PATHS.chatAgentConversations}/${conversationId}/members/${agentId}`,
  );
}

export async function removeGroupClientMember(
  conversationId: string,
  clientProfileId: number,
): Promise<void> {
  await apiRequest(
    'DELETE',
    `${API_GLOBAL_PATHS.chatAgentConversations}/${conversationId}/members/clients/${clientProfileId}`,
  );
}

export async function listMessages(
  role: ChatRole,
  conversationId: string,
  params: { before?: string; limit?: number } = {},
): Promise<ChatMessagePage> {
  const query = new URLSearchParams();
  if (params.before) query.set('before', params.before);
  if (params.limit != null) query.set('limit', String(params.limit));
  const qs = query.toString();
  const suffix = qs ? `?${qs}` : '';
  const url = `${conversationsBase(role)}/${conversationId}/messages${suffix}`;
  return apiRequest<ChatMessagePage>('GET', url);
}

export async function sendMessage(
  role: ChatRole,
  conversationId: string,
  body: SendChatMessageRequest,
): Promise<ChatMessage> {
  return apiRequest<ChatMessage>(
    'POST',
    `${conversationsBase(role)}/${conversationId}/messages`,
    body,
  );
}

export async function deleteMessage(
  role: ChatRole,
  conversationId: string,
  messageId: string,
): Promise<void> {
  await apiRequest(
    'DELETE',
    `${conversationsBase(role)}/${conversationId}/messages/${messageId}`,
  );
}

export async function markConversationRead(role: ChatRole, conversationId: string): Promise<void> {
  await apiRequest('PUT', `${conversationsBase(role)}/${conversationId}/read`);
}

export async function upsertMyChatKey(
  role: ChatRole,
  body: UpsertChatParticipantKeyRequest,
): Promise<ChatParticipantKey> {
  return apiRequest<ChatParticipantKey>('PUT', `${conversationsBase(role)}/keys/me`, body);
}

export async function listConversationKeys(
  role: ChatRole,
  conversationId: string,
): Promise<ChatParticipantKey[]> {
  return apiRequest<ChatParticipantKey[]>('GET', `${conversationsBase(role)}/${conversationId}/keys`);
}
