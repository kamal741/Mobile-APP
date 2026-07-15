import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../theme';
import { ConflictType } from '../../types';

// ─── InfoCard ─────────────────────────────────────────────────────────────────

interface InfoCardProps {
  icon: string;
  label: string;
  value: string;
}

export const InfoCard: React.FC<InfoCardProps> = ({ icon, label, value }) => (
  <View style={styles.infoCard}>
    <Text style={styles.infoLabel}>
      {icon}{'  '}{label}
    </Text>
    <Text style={styles.infoValue}>{value}</Text>
  </View>
);

// ─── ConflictBadge ────────────────────────────────────────────────────────────

interface ConflictBadgeProps {
  label: string;
  type: ConflictType;
}

export const ConflictBadge: React.FC<ConflictBadgeProps> = ({ label, type }) => (
  <View style={[styles.badge, type === 'critical' && styles.badgeCritical]}>
    <Text style={[styles.badgeText, type === 'critical' && styles.badgeTextCritical]}>
      {label}
    </Text>
  </View>
);

// ─── ETABadge ─────────────────────────────────────────────────────────────────

interface ETABadgeProps {
  eta: string;
}

export const ETABadge: React.FC<ETABadgeProps> = ({ eta }) => (
  <View style={styles.etaBadge}>
    <Text style={styles.etaBadgeText}>ETA {eta}</Text>
  </View>
);

// ─── SectionTitle ─────────────────────────────────────────────────────────────

interface SectionTitleProps {
  children: React.ReactNode;
}

export const SectionTitle: React.FC<SectionTitleProps> = ({ children }) => (
  <Text style={styles.sectionTitle}>{children}</Text>
);

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // InfoCard
  infoCard: {
    backgroundColor: colors.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
  },
  infoLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },

  // ConflictBadge
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.warningBg,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 4,
    marginBottom: 4,
  },
  badgeCritical: {
    backgroundColor: colors.dangerBg,
  },
  badgeText: {
    fontSize: 11,
    color: colors.warningText,
    fontWeight: '600',
  },
  badgeTextCritical: {
    color: colors.dangerText,
  },

  // ETABadge
  etaBadge: {
    backgroundColor: '#f1f5f9',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  etaBadgeText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },

  // SectionTitle
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 10,
  },
});
