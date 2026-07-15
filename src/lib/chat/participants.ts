import { formatClientDisplayName } from '../notifications/clientDisplayNames';
import type { ChatConversation, ChatMessage, ChatRole } from './types';

export type ParticipantKind = 'agent' | 'client';

export interface GroupMemberDisplay {
  key: string;
  kind: ParticipantKind;
  id: number;
  name: string;
  isSelf: boolean;
}

export function participantKey(kind: ParticipantKind, id: number): string {
  return `${kind}:${id}`;
}

export function mentionHandle(name: string, fallbackId?: number): string {
  const handle = name
    .trim()
    .replace(/^@+/, '')
    .replace(/\s+/g, '')
    .replace(/[^a-zA-Z0-9_]/g, '');
  return handle || `member${fallbackId ?? ''}`;
}

export function messageSenderKey(message: ChatMessage): string | null {
  if (message.senderAgentId != null) {
    return participantKey('agent', message.senderAgentId);
  }
  if (message.senderClientProfileId != null) {
    return participantKey('client', message.senderClientProfileId);
  }
  return null;
}

export function buildParticipantNameMap(
  conversation: ChatConversation,
  role: ChatRole,
  options: {
    currentUserId: string;
    currentUserName?: string;
    clientNameMap?: Record<string, string>;
    agentDisplayName?: string;
  },
): Record<string, string> {
  const map: Record<string, string> = {};

  for (const member of conversation.members) {
    const serverName = member.displayName?.trim();

    if (member.agentId != null) {
      const key = participantKey('agent', member.agentId);
      if (
        role === 'agent' &&
        String(member.agentId) === options.currentUserId &&
        options.currentUserName
      ) {
        map[key] = options.currentUserName;
      } else if (role === 'client') {
        map[key] = options.agentDisplayName?.trim() || 'Your agent';
      } else if (serverName) {
        map[key] = serverName;
      } else {
        map[key] = `Agent #${member.agentId}`;
      }
    }

    if (member.clientProfileId != null) {
      const key = participantKey('client', member.clientProfileId);
      if (
        role === 'client' &&
        String(member.clientProfileId) === options.currentUserId &&
        options.currentUserName
      ) {
        map[key] = options.currentUserName;
      } else if (serverName) {
        map[key] = serverName;
      } else {
        map[key] =
          options.clientNameMap?.[String(member.clientProfileId)] ??
          `Client #${member.clientProfileId}`;
      }
    }
  }

  return map;
}

export function listGroupMembers(
  conversation: ChatConversation,
  participantNames: Record<string, string>,
  currentUserId: string,
  role: ChatRole,
): GroupMemberDisplay[] {
  return conversation.members
    .map((member) => {
      if (member.agentId != null) {
        const key = participantKey('agent', member.agentId);
        return {
          key,
          kind: 'agent' as const,
          id: member.agentId,
          name: participantNames[key] ?? `Agent #${member.agentId}`,
          isSelf: role === 'agent' && String(member.agentId) === currentUserId,
        };
      }
      if (member.clientProfileId != null) {
        const key = participantKey('client', member.clientProfileId);
        return {
          key,
          kind: 'client' as const,
          id: member.clientProfileId,
          name: participantNames[key] ?? `Client #${member.clientProfileId}`,
          isSelf: role === 'client' && String(member.clientProfileId) === currentUserId,
        };
      }
      return null;
    })
    .filter((member): member is GroupMemberDisplay => member != null)
    .sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === 'agent' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
}

export function messageSenderName(
  message: ChatMessage,
  participantNames: Record<string, string>,
  isOwn: boolean,
): string | null {
  if (isOwn) return null;
  const key = messageSenderKey(message);
  if (!key) return null;
  return participantNames[key] ?? null;
}

export function currentUserDisplayName(
  user: { firstName?: string; lastName?: string },
): string {
  return formatClientDisplayName(user.firstName, user.lastName) || 'You';
}
