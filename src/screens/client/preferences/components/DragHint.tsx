import React from 'react';
import { View, Text } from 'react-native';
import { dragHintStyles as S } from '../styles/progressStyles';

export function DragHint() {
  return (
    <View style={S.dragHint}>
      <Text style={S.dragHintTxt}>
        💡 Drag ⠿ to another section — hold near top or bottom edge to scroll
      </Text>
    </View>
  );
}
