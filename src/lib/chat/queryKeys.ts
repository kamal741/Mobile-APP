import type { ChatRole } from './types';

export const chatQueryKeys = {
  conversations: (role: ChatRole) => ['chat', role, 'conversations'] as const,
  conversation: (role: ChatRole, conversationId: string) =>
    ['chat', role, 'conversation', conversationId] as const,
  messages: (role: ChatRole, conversationId: string) =>
    ['chat', role, 'messages', conversationId] as const,
};
