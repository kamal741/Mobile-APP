import { View, Text, Image, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { colors, border, fontSize, fontWeight, spacing } from '@/theme';
import { conversationInitials } from '../../../lib/chat/display';

interface AgentPinnedRowProps {
  agentName: string;
  agentImageUrl?: string | null;
  isLoading?: boolean;
  onPress: () => void;
}

/**
 * Pinned row shown above the conversation list for clients, representing
 * their assigned agent. Mirrors ConversationRow's layout (avatar, title,
 * chevron) but adds a small "Your Agent" label and pulls data straight from
 * AuthContext's `user.agentDetails` rather than from a ChatConversation.
 */
export function AgentPinnedRow({
  agentName,
  agentImageUrl,
  isLoading,
  onPress,
}: Readonly<AgentPinnedRowProps>) {
  const initials = conversationInitials(agentName);

  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      activeOpacity={0.78}
      disabled={isLoading}
    >
      <View style={styles.avatar}>
        {agentImageUrl ? (
          <Image source={{ uri: agentImageUrl }} style={styles.avatarImage} />
        ) : (
          <Text style={styles.avatarText}>{initials}</Text>
        )}
      </View>

      <View style={styles.body}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Your Agent</Text>
        </View>
        <View style={styles.header}>
          <Text style={styles.title} numberOfLines={1}>
            {agentName}
          </Text>
          {isLoading ? (
            <ActivityIndicator size="small" color={colors.primary.default} />
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
    backgroundColor: colors.primary.hover,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    backgroundColor: colors.primary.default,
    overflow: 'hidden',
  },
  avatarImage: {
    width: 52,
    height: 52,
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
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: 2,
    borderRadius: border.radius.pill,
    backgroundColor: colors.primary.default,
    marginBottom: 4,
  },
  badgeText: {
    color: colors.text.inverse,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  title: {
    flex: 1,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text.primary,
  },
});


