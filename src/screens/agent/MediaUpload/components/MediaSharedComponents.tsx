import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '@/theme';
import { styles } from '../styles';

// ─── SectionHeader ────────────────────────────────────────────────────────────
interface SectionHeaderProps {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  count?: number;
}

export function SectionHeader({ icon, label, count }: SectionHeaderProps) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionIconWrap}>
        <Ionicons name={icon} size={13} color={colors.primary.default} />
      </View>
      <Text style={styles.sectionLabel}>{label}</Text>
      {count !== undefined && (
        <View style={styles.sectionCount}>
          <Text style={styles.sectionCountText}>{count}</Text>
        </View>
      )}
    </View>
  );
}

// ─── PickerButton ─────────────────────────────────────────────────────────────
interface PickerButtonProps {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  sublabel: string;
  onPress: () => void;
  disabled?: boolean;
}

export function PickerButton({ icon, label, sublabel, onPress, disabled }: PickerButtonProps) {
  return (
    <TouchableOpacity
      style={[styles.pickerBtn, disabled && { opacity: 0.55 }]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.75}
    >
      <View style={styles.pickerIconWrap}>
        <Ionicons name={icon} size={20} color={colors.primary.default} />
      </View>
      <Text style={styles.pickerBtnLabel}>{label}</Text>
      <Text style={styles.pickerBtnSub}>{sublabel}</Text>
    </TouchableOpacity>
  );
}

// ─── StatChip ─────────────────────────────────────────────────────────────────
interface StatChipProps {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  value: number;
  label: string;
}

export function StatChip({ icon, value, label }: StatChipProps) {
  return (
    <View style={styles.statChip}>
      <Ionicons name={icon} size={14} color={colors.primary.default} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// ─── SpacerH ──────────────────────────────────────────────────────────────────
export function SpacerH({ size }: { size: number }) {
  return <View style={{ width: size }} />;
}
