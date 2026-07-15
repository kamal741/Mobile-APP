import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Switch,
  StyleSheet,
} from 'react-native';
import { Mail, Phone, Trash2 } from 'lucide-react-native';
import { Card, CardContent } from '../../../../components/Card';
import { Client } from '../types/client.types';
import { getProfileInitials } from '../utils/clientProfile.utils';
import { colors, spacing } from '../styles/shared.styles';
import { useShareAgentStatsWithClient } from '../../../../lib/agentApi';

interface Props {
  client: Client;
  isDeleting: boolean;
  onDelete:   () => void;
  hasSharedStats: boolean;
}

export function ClientProfileHeader({ client, isDeleting, onDelete, hasSharedStats }: Props) {
  const [statsShared, setStatsShared] = useState(hasSharedStats); 
  const shareStatsMutation = useShareAgentStatsWithClient();

  function handleShareStatsToggle(value: boolean) {
    setStatsShared(value);
    shareStatsMutation.mutate(
      { clientProfileId: client.id, shareFlags: value },
      {
        onError: () => {
          setStatsShared(!value);
        },
      },
    );
  }

  return (
    <Card style={styles.card}>
      <CardContent style={styles.content}>
        {/* Avatar */}
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{getProfileInitials(client)}</Text>
        </View>

        {/* Name */}
        <Text style={styles.name}>
          {client.firstName} {client.lastName}
        </Text>

        {/* Contact buttons + Share Stats — single row */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.contactBtn}
            onPress={() => Linking.openURL(`mailto:${client.email}`)}
          >
            <Mail size={18} color={colors.brand} />
            <Text style={styles.contactText}>Email</Text>
          </TouchableOpacity>

          {client.phone && (
            <TouchableOpacity
              style={styles.contactBtn}
              onPress={() => Linking.openURL(`tel:${client.phone}`)}
            >
              <Phone size={18} color={colors.brand} />
              <Text style={styles.contactText}>Call</Text>
            </TouchableOpacity>
          )}

          {/* Divider */}
          <View style={styles.divider} />

          {/* Share Stats toggle */}
          <View style={styles.shareStatsGroup}>
            {shareStatsMutation.isPending ? (
              <ActivityIndicator size="small" color={colors.brand} />
            ) : (
              <Switch
                value={statsShared}
                onValueChange={handleShareStatsToggle}
                trackColor={{ false: '#e2e8f0', true: '#bfdbfe' }}
                thumbColor={statsShared ? colors.brand : '#94a3b8'}
              />
            )}
            <Text style={styles.shareStatsLabel}>Share Stats</Text>
          </View>
        </View>

      </CardContent>
    </Card>
  );
}

const styles = StyleSheet.create({
  card:    { marginBottom: spacing.lg, borderRadius: 16 },
  content: { alignItems: 'center', paddingVertical: 24 },

  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.brand,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  avatarText: { color: colors.textInverted, fontSize: 28, fontWeight: '700' },

  name: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },

  // Single row: Email | Call | divider | Switch + "Share Stats"
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },

  contactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#eff6ff',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  contactText: { color: colors.brand, fontWeight: '600', fontSize: 14 },

  divider: {
    width: 1,
    height: 28,
    backgroundColor: '#e2e8f0',
    marginHorizontal: spacing.xs ?? 4,
  },

  shareStatsGroup: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 2,
  },
  shareStatsLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textSecondary,
  },

  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: '#fef2f2',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: spacing.md,
    borderWidth: 1,
    borderColor: '#fecaca',
    marginTop: spacing.lg,
    width: '100%',
  },
  deleteText: { color: '#dc2626', fontWeight: '600', fontSize: 14 },
});