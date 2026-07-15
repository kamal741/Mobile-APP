import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../../theme';

interface TopBarProps {
  leftLabel: string;
  title: string;
  onLeftPress?: () => void;
}

const TopBar: React.FC<TopBarProps> = ({ leftLabel, title, onLeftPress }) => (
  <View style={styles.topBar}>
    <TouchableOpacity style={styles.left} onPress={onLeftPress} activeOpacity={0.7}>
      <Text style={styles.arrow}>←</Text>
      <Text style={styles.leftText}>{leftLabel}</Text>
    </TouchableOpacity>

    <Text style={styles.title}>{title}</Text>

    <TouchableOpacity style={styles.right}>
      <Text style={styles.menu}>⋯</Text>
    </TouchableOpacity>
  </View>
);

export default TopBar;

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.white,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 60,
  },
  arrow: {
    fontSize: 18,
    color: colors.blue,
    marginRight: 4,
  },
  leftText: {
    fontSize: 14,
    color: colors.blue,
    fontWeight: '500',
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  right: {
    minWidth: 60,
    alignItems: 'flex-end',
  },
  menu: {
    fontSize: 20,
    color: colors.textSecondary,
    letterSpacing: 1,
  },
});
