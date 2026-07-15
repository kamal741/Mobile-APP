import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../styles/shared.styles';

export function ClientListEmpty() {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>👥</Text>
      <Text style={styles.title}>No Clients Yet</Text>
      <Text style={styles.text}>Add your first client to get started</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', paddingTop: 60, paddingBottom: 40 },
  icon:      { fontSize: 48, marginBottom: 16 },
  title:     { fontSize: 18, fontWeight: '600', color: '#1e293b' },
  text:      { fontSize: 14, color: colors.textMuted, marginTop: 4 },
});
