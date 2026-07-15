export type ChatRole = 'agent' | 'client';
export type ChatParticipantType = 'AGENT' | 'CLIENT_PROFILE';

export type ConversationType = 'DIRECT' | 'GROUP';

export interface ChatMember {
  agentId: number | null;
  clientProfileId: number | null;
  displayName?: string | null;
  joinedAt: string;
  lastReadAt: string | null;
}

export interface ChatConversation {
  id: string;
  conversationType: ConversationType;
  title: string | null;
  createdByAgentId: number | null;
  lastMessageAt: string | null;
  createdAt: string;
  members: ChatMember[];
  unreadCount: number;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderAgentId: number | null;
  senderClientProfileId: number | null;
  messageType: 'TEXT' | 'SYSTEM';
  ciphertext: string | null;
  senderKeyId: string | null;
  algorithmVersion: string;
  nonce: string | null;
  hasMentions: boolean;
  createdAt: string;
}

export interface ChatMessagePage {
  messages: ChatMessage[];
  nextBefore: string | null;
}

export interface SendChatMessageRequest {
  ciphertext: string;
  senderKeyId?: string | null;
  algorithmVersion: string;
  nonce?: string | null;
  dedupeKey: string;
  mentionedAgentIds?: number[];
  mentionedClientProfileIds?: number[];
}

export interface UpsertChatParticipantKeyRequest {
  keyId: string;
  publicKey: string;
  algorithmVersion: string;
}

export interface CreateGroupConversationRequest {
  title: string;
  memberAgentIds?: number[];
  memberClientProfileIds?: number[];
}

export interface AddGroupMemberRequest {
  agentId?: number;
  clientProfileId?: number;
}

export interface ChatParticipantKey {
  keyId: string;
  publicKey: string;
  algorithmVersion: string;
  recipientType: ChatParticipantType;
  recipientId: number;
  createdAt: string;
  revokedAt: string | null;
}

export interface ChatEventPayload {
  type: string;
  conversationId?: string;
  messageId?: string;
  senderAgentId?: number | null;
  senderClientProfileId?: number | null;
  messageType?: string;
  ciphertext?: string | null;
  senderKeyId?: string | null;
  algorithmVersion?: string;
  nonce?: string | null;
  hasMentions?: boolean;
  createdAt?: string;
  lastMessageAt?: string | null;
  agentId?: number | null;
  clientProfileId?: number | null;
  status?: string;
}
