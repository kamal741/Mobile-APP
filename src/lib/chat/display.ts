import type { ChatConversation, ChatMessage, ChatRole } from './types';

const REPLY_PREFIX = '__ESTATEFLOW_REPLY__';

export interface ChatReplyContext {
  messageId: string;
  senderName: string;
  preview: string;
}

export function decodeMessageText(message: ChatMessage): string {
  if (!message.ciphertext) return '';
  if (message.algorithmVersion === 'NONE') {
    return message.ciphertext;
  }
  // Message was encrypted in a previous session whose private key is no longer
  // available on this device. Show a clear label rather than raw ciphertext.
  return '🔒 Message from a previous session';
}

function clampPreview(value: string, maxLength = 120): string {
  const compact = value.replace(/\s+/g, ' ').trim();
  if (compact.length <= maxLength) return compact;
  return `${compact.slice(0, maxLength - 3).trim()}...`;
}

export function parseReplyMessageText(text: string): {
  replyTo: ChatReplyContext | null;
  body: string;
} {
  if (!text.startsWith(`${REPLY_PREFIX}:`)) {
    return { replyTo: null, body: text };
  }

  const firstLineEnd = text.indexOf('\n');
  const markerLine = firstLineEnd >= 0 ? text.slice(0, firstLineEnd) : text;
  const body = firstLineEnd >= 0 ? text.slice(firstLineEnd + 1) : '';

  try {
    const raw = JSON.parse(markerLine.slice(REPLY_PREFIX.length + 1)) as Partial<ChatReplyContext>;
    if (!raw.messageId || !raw.preview) {
      return { replyTo: null, body: text };
    }
    return {
      replyTo: {
        messageId: String(raw.messageId),
        senderName: clampPreview(String(raw.senderName || 'Message'), 36),
        preview: clampPreview(String(raw.preview)),
      },
      body,
    };
  } catch {
    return { replyTo: null, body: text };
  }
}

export function plainMessageText(message: ChatMessage): string {
  return parseReplyMessageText(decodeMessageText(message)).body;
}

export function buildReplyMessageText(body: string, replyTo: ChatReplyContext | null): string {
  const trimmedBody = body.trim();
  if (!replyTo) return trimmedBody;

  const payload: ChatReplyContext = {
    messageId: replyTo.messageId,
    senderName: clampPreview(replyTo.senderName, 36),
    preview: clampPreview(replyTo.preview),
  };

  return `${REPLY_PREFIX}:${JSON.stringify(payload)}\n${trimmedBody}`;
}

export function isOwnMessage(
  message: ChatMessage,
  role: ChatRole,
  userId: string,
): boolean {
  const id = Number(userId);
  if (Number.isNaN(id)) return false;
  return role === 'agent'
    ? message.senderAgentId === id
    : message.senderClientProfileId === id;
}

export function conversationTitle(
  conversation: ChatConversation,
  role: ChatRole,
  options: {
    clientNameMap?: Record<string, string>;
    agentDisplayName?: string;
  } = {},
): string {
  if (conversation.conversationType === 'GROUP') {
    return conversation.title?.trim() || 'Group chat';
  }

  const otherMember = conversation.members.find((member) =>
    role === 'agent' ? member.clientProfileId != null : member.agentId != null,
  );

  if (role === 'agent' && otherMember?.clientProfileId != null) {
    const serverName = otherMember.displayName?.trim();
    if (serverName) return serverName;
    const mapped = options.clientNameMap?.[String(otherMember.clientProfileId)];
    if (mapped) return mapped;
    return `Client #${otherMember.clientProfileId}`;
  }

  if (role === 'client') {
    return options.agentDisplayName?.trim() || 'Your Agent';
  }

  return 'Chat';
}

export function conversationInitials(title: string): string {
  const parts = title.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
}

export function formatChatTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return '';

  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return date.toLocaleDateString('en-US', { weekday: 'short' });
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function formatMessageTime(dateStr: string): string {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export function formatDateHeader(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}

export function newDedupeKey(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = Math.trunc(Math.random() * 16);
    const value = char === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}
