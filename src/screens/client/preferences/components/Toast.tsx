import React from 'react';
import { Animated, Text } from 'react-native';
import { screenStyles as S } from '../styles/screenStyles';

interface Props {
  message:   string | null;
  animValue: Animated.Value;
}

export function Toast({ message, animValue }: Props) {
  if (!message) return null;

  const translateY = animValue.interpolate({
    inputRange:  [0, 1],
    outputRange: [20, 0],
  });

  return (
    <Animated.View
      style={[
        S.toast,
        { opacity: animValue, transform: [{ translateY }] },
      ]}
    >
      <Text style={S.toastTxt}>✓ {message}</Text>
    </Animated.View>
  );
}
