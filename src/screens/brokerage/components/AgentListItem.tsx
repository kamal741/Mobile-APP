import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking,
} from 'react-native';
import { Mail, Phone, Calendar } from 'lucide-react-native';
import { BrokerAgent } from '../../../lib/brokerApi';
import { colors, radius, spacing } from '../styles/shared.styles';

// Re-export so screen can import from one place
export type { BrokerAgent };

interface Props {
  agent:   BrokerAgent;
  onPress: (agent: BrokerAgent) => void;
}

function getInitials(displayName: string): string {
  const parts = displayName.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return displayName.slice(0, 2).toUpperCase();
}

/** "ACTIVE" → "Active", "INACTIVE" → "Inactive" etc. */
function toTitleCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

function formatJoinDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'month' in Intl.DateTimeFormat.prototype ? 'numeric' : undefined,
      month: 'short',
      day:   'numeric',
    });
  } catch {
    return iso.slice(0, 10);
  }
}

const STATUS_MAP: Record<string, { bg: string; border: string; text: string }> = {
  ACTIVE:   { bg: colors.successBg, border: colors.successBorder, text: colors.success },
  INACTIVE: { bg: colors.bgMuted,   border: colors.border,        text: colors.textMuted },
  PENDING:  { bg: '#fefce8',         border: '#fde68a',            text: '#92400e' },
};

function getStatusStyle(status: string) {
  return STATUS_MAP[status.toUpperCase()] ?? STATUS_MAP['INACTIVE'];
}

export function AgentListItem({ agent, onPress }: Props) {
  const statusStyle = getStatusStyle(agent.status);

  const handleCall = () => {
    if (agent.phoneE164) {
      Linking.openURL(`tel:${agent.phoneE164}`);
    }
  };

  return (
    <TouchableOpacity
      onPress={() => onPress(agent)}
      activeOpacity={0.85}
      style={[styles.row, { marginHorizontal: spacing.lg }]}
    >
      {/* Top row: avatar + info + call button */}
      <View style={styles.rowTop}>
        {/* Avatar */}
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{getInitials(agent.displayName)}</Text>
        </View>

        {/* Info */}
        <View style={styles.info}>
          {/* Name */}
          <Text style={styles.name} numberOfLines={1}>
            {agent.displayName}
          </Text>

          {/* Email */}
          <View style={styles.metaRow}>
            <Mail size={11} color={colors.textDisabled} style={{ marginRight: 3 }} />
            <Text style={styles.metaText} numberOfLines={1}>{agent.email}</Text>
          </View>

          {/* Phone (if available) */}
          {agent.phoneE164 ? (
            <View style={styles.metaRow}>
              <Phone size={11} color={colors.textDisabled} style={{ marginRight: 3 }} />
              <Text style={styles.metaText}>{agent.phoneE164}</Text>
            </View>
          ) : null}

          {/* Joined date */}
          <View style={styles.metaRow}>
            <Calendar size={11} color={colors.textDisabled} style={{ marginRight: 3 }} />
            <Text style={styles.metaText}>Joined {formatJoinDate(agent.createdAt)}</Text>
          </View>

          {/* Badges */}
          <View style={styles.badgesRow}>
            {/* Status badge */}
            <View style={[styles.badge, { backgroundColor: statusStyle.bg, borderColor: statusStyle.border }]}>
              <Text style={[styles.badgeText, { color: statusStyle.text }]}>
                {toTitleCase(agent.status)}
              </Text>
            </View>

            {/* Referral code badge */}
            <View style={styles.refBadge}>
              <Text style={styles.refBadgeText}>#{agent.referralCode}</Text>
            </View>
          </View>
        </View>

        {/* Call button */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.iconBtn, !agent.phoneE164 && styles.iconBtnDisabled]}
            onPress={handleCall}
            disabled={!agent.phoneE164}
          >
            <Phone size={15} color={agent.phoneE164 ? colors.brand : colors.textDisabled} />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingVertical: spacing.md,
    gap: spacing.sm,
    backgroundColor: colors.bgCard,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm + 2,
  },

  avatar: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.brand,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
    opacity: 0.9,
  },
  avatarText: { color: colors.textInverted, fontSize: 15, fontWeight: '700' },

  info:    { flex: 1, minWidth: 0, gap: 3 },
  name:    { fontSize: 14, fontWeight: '700', color: colors.textPrimary },

  metaRow: { flexDirection: 'row', alignItems: 'center' },
  metaText:{ fontSize: 11, color: colors.textMuted, flex: 1 },

  badgesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: 2 },
  badge: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
  },
  badgeText: { fontSize: 10, fontWeight: '600' },

  refBadge: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: colors.bgMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  refBadgeText: { fontSize: 10, fontWeight: '500', color: colors.textDisabled, fontFamily: 'monospace' },

  actions: { flexShrink: 0 },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  iconBtnDisabled: {
    backgroundColor: colors.bgPage,
    borderColor: colors.border,
  },
});


