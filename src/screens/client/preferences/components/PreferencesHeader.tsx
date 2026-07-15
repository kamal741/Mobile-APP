import React from 'react';
import { View, Text } from 'react-native';
import { Sparkles } from 'lucide-react-native';
import { screenStyles as S } from '../styles/screenStyles';
import { Colors } from '../constants/theme';

interface Props {
  answered:    number;
  totalFields: number;
}

export function PreferencesHeader({ answered, totalFields }: Props) {
  return (
    <View style={S.header}>
      <View>
        <View style={S.headerTitleRow}>
          <Sparkles size={20} color={Colors.primary} strokeWidth={2} />
          <Text style={S.headerTitle}>Your Preferences</Text>
        </View>
        <Text style={S.headerSub}>Fine-tune what matters most to you</Text>
      </View>
    </View>
  );
}
