import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../styles/shared.styles';

interface Props {
  isFiltered?: boolean;
}

export function AgentClientListEmpty({ isFiltered }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>{isFiltered ? '🔍' : '👤'}</Text>
      <Text style={styles.title}>
        {isFiltered ? 'No Results Found' : 'No Clients Yet'}
      </Text>
      <Text style={styles.text}>
        {isFiltered
          ? 'Try a different search term'
          : 'This agent has no clients assigned'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', paddingTop: 60, paddingBottom: 40 },
  icon:      { fontSize: 44, marginBottom: 14 },
  title:     { fontSize: 17, fontWeight: '600', color: '#1e293b' },
  text:      { fontSize: 13, color: colors.textMuted, marginTop: 4, textAlign: 'center' },
});
