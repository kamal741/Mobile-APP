import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../styles/shared.styles';

export function AgentListEmpty() {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>🏢</Text>
      <Text style={styles.title}>No Agents Yet</Text>
      <Text style={styles.text}>Invite your first agent to get started</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', paddingTop: 60, paddingBottom: 40 },
  icon:      { fontSize: 48, marginBottom: 16 },
  title:     { fontSize: 18, fontWeight: '600', color: '#1e293b' },
  text:      { fontSize: 14, color: colors.textMuted, marginTop: 4 },
});
