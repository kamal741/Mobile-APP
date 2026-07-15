import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useBottomInset } from '@/hooks/useSafeAreaPadding';
import { screenStyles as S } from '../styles/screenStyles';

interface Props {
  isSaving:          boolean;
  onCancel:          () => void;
  onReview:          () => void;
  hasUnmetRequired?: boolean;
  blockedMessage?:   string;
}

export function BottomNavBar({
  isSaving,
  onCancel,
  onReview,
  hasUnmetRequired = false,
  blockedMessage = 'Fill in all Must Have fields to continue',
}: Props) {
  const bottomInset = useBottomInset();

  return (
    <View style={[S.navBar, { paddingBottom: 12 + bottomInset }]}>
      <TouchableOpacity activeOpacity={0.75} onPress={onCancel} style={S.btnBack}>
        <Text style={S.btnBackArrow}>←</Text>
        <Text style={S.btnBackTxt}>Cancel</Text>
      </TouchableOpacity>

      <View style={styles.nextWrap}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={onReview}
          style={[S.btnNext, hasUnmetRequired && styles.btnBlocked]}
        >
          <Text style={S.btnNextTxt}>Review</Text>
          <Text style={S.btnNextArrow}>→</Text>
        </TouchableOpacity>

        {hasUnmetRequired && (
          <Text style={styles.blockedHint}>
            {blockedMessage}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  nextWrap: {
    alignItems: 'flex-end',
  },
  btnBlocked: {
    opacity: 0.45,
  },
  blockedHint: {
    color: '#C53030',
    fontSize: 11,
    fontWeight: '500',
    marginTop: 4,
    textAlign: 'right',
  },
});
