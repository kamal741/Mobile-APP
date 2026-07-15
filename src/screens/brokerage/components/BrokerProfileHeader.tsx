import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Edit2 } from 'lucide-react-native';
import { colors, spacing } from '../styles/shared.styles';

interface BrokerageInfo {
  name: string;
  contactEmail?: string;
  contactPhone?: string;
  website?: string;
  ownerFirstName?: string;
  ownerLastName?: string;
  ownerEmail?: string;
  status?: string | null;
}

interface Props {
  info: BrokerageInfo;
  onEdit: () => void;
}

function getInitials(firstName?: string, lastName?: string): string {
  const f = firstName?.[0] ?? '';
  const l = lastName?.[0] ?? '';
  return (f + l).toUpperCase() || '??';
}

export function BrokerProfileHeader({ info, onEdit }: Props) {
  return (
    <View style={styles.card}>
      {/* Avatar */}
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {getInitials(info.ownerFirstName ?? info.name?.[0], info.ownerLastName)}
        </Text>
      </View>

      {/* Brokerage name */}
      <Text style={styles.name}>{info.name}</Text>

      {/* Owner email — always show if present */}
      {info.ownerEmail ? (
        <Text style={styles.ownerEmail}>{info.ownerEmail}</Text>
      ) : null}

      {/* Status badge */}
      {info.status && (
        <View style={[styles.badge, info.status === 'active' ? styles.badgeActive : styles.badgeInactive]}>
          <Text style={[styles.badgeText, info.status === 'active' ? styles.badgeTextActive : styles.badgeTextInactive]}>
            {info.status.charAt(0).toUpperCase() + info.status.slice(1)}
          </Text>
        </View>
      )}

      {/* Edit button */}
      <TouchableOpacity style={styles.editBtn} onPress={onEdit} activeOpacity={0.7}>
        <Edit2 size={15} color={colors.textInverted} />
        <Text style={styles.editBtnText}>Edit Profile</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    alignItems: 'center',
    paddingVertical: 26,
    paddingHorizontal: spacing.lg,
  },

  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.brand,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  avatarText: { color: colors.textInverted, fontSize: 28, fontWeight: '700' },

  name: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
    textAlign: 'center',
  },
  ownerLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: 2,
  },
  ownerEmail: {
    fontSize: 12,
    color: colors.textDisabled,
    marginBottom: spacing.md,
  },

  badge: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginBottom: spacing.md,
    borderWidth: 1,
  },
  badgeActive: { backgroundColor: colors.successBg, borderColor: colors.successBorder },
  badgeInactive: { backgroundColor: colors.bgMuted, borderColor: colors.border },
  badgeText: { fontSize: 11, fontWeight: '600' },
  badgeTextActive: { color: colors.success },
  badgeTextInactive: { color: colors.textMuted },

  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.brand,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: spacing.md,
    width: '100%',
    justifyContent: 'center',
  },
  editBtnText: { color: colors.textInverted, fontWeight: '600', fontSize: 14 },
});

