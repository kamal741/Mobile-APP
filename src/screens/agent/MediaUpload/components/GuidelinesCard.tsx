import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '@/theme';
import { PHOTO_TIPS } from '../constants/mediaUpload.constants';
import { styles } from '../styles';

// ─── GuidelinesCard ───────────────────────────────────────────────────────────
export function GuidelinesCard() {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.tipsIconWrap}>
          <Ionicons name="star-outline" size={14} color={colors.warning.default} />
        </View>
        <Text style={[styles.cardTitle, { marginLeft: spacing.sm }]}>Guidelines</Text>
      </View>

      {PHOTO_TIPS.map((tip, index) => (
        <View
          key={tip.id}
          style={[styles.tipRow, index < PHOTO_TIPS.length - 1 && styles.tipRowDivider]}
        >
          <View style={styles.tipNumber}>
            <Text style={styles.tipNumberText}>{tip.id}</Text>
          </View>
          <Text style={styles.tipRowText}>{tip.text}</Text>
        </View>
      ))}
    </View>
  );
}
