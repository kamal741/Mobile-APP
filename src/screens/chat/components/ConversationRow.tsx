import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ChevronRight, Users } from 'lucide-react-native';
import { colors, border, fontSize, fontWeight } from '@/theme';
import {
  conversationInitials,
  conversationTitle,
  formatChatTime,
  plainMessageText,
} from '../../../lib/chat/display';
import type { ChatConversation, ChatMessage, ChatRole } from '../../../lib/chat/types';

interface ConversationRowProps {
  conversation: ChatConversation;
  role: ChatRole;
  previewMessage?: ChatMessage | null;
  clientNameMap?: Record<string, string>;
  agentDisplayName?: string;
  onPress: () => void;
}

export function ConversationRow({
  conversation,
  role,
  previewMessage,
  clientNameMap,
  agentDisplayName,
  onPress,
}: Readonly<ConversationRowProps>) {
  const title = conversationTitle(conversation, role, {
    clientNameMap,
    agentDisplayName,
  });
  const initials = conversationInitials(title);
  const hasUnread = conversation.unreadCount > 0;
  let preview = 'No messages yet';
  if (previewMessage) {
    preview = plainMessageText(previewMessage);
  } else if (hasUnread) {
    preview = `${conversation.unreadCount} unread ${conversation.unreadCount === 1 ? 'message' : 'messages'}`;
  }
  const truncated = preview.length > 56 ? `${preview.slice(0, 56)}…` : preview;
  const isGroup = conversation.conversationType === 'GROUP';

  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.78}>
      <View style={[styles.avatar, isGroup ? styles.avatarGroup : styles.avatarDirect]}>
        {isGroup ? (
          <Users size={22} color={colors.text.inverse} />
        ) : (
          <Text style={styles.avatarText}>{initials}</Text>
        )}
      </View>

      <View style={styles.body}>
        <View style={styles.header}>
          <Text style={[styles.title, hasUnread && styles.titleUnread]} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.time}>{formatChatTime(conversation.lastMessageAt)}</Text>
        </View>

        <View style={styles.footer}>
          <Text
            style={[styles.preview, hasUnread && styles.previewUnread]}
            numberOfLines={1}
          >
            {truncated}
          </Text>
          {hasUnread ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
              </Text>
            </View>
          ) : (
            <ChevronRight size={16} color={colors.text.muted} />
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: colors.background.surface,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarDirect: {
    backgroundColor: colors.primary.default,
  },
  avatarGroup: {
    backgroundColor: colors.purple.default,
  },
  avatarText: {
    color: colors.text.inverse,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
    gap: 8,
  },
  title: {
    flex: 1,
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text.primary,
  },
  titleUnread: {
    fontWeight: fontWeight.bold,
  },
  time: {
    fontSize: fontSize.xs,
    color: colors.text.muted,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  preview: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.text.secondary,
  },
  previewUnread: {
    color: colors.text.primary,
    fontWeight: fontWeight.medium,
  },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: border.radius.full,
    backgroundColor: colors.primary.default,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: colors.text.inverse,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
  },
});
