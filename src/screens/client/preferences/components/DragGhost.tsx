import React from 'react';
import { Animated, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { Colors } from '../constants/theme';
import type { FieldDef } from '../types/preferences';

const POINTER_GAP_X = 12;
const POINTER_GAP_Y = 20;

interface Props {
  field:      FieldDef;
  dragAnimXY: Animated.ValueXY;
}

export function DragGhost({ field, dragAnimXY }: Readonly<Props>) {
  const { width: SCREEN_W } = useWindowDimensions();
  const GHOST_WIDTH = Math.min(SCREEN_W - 32, 340);

  // Keep the card near the pointer and clamp it to viewport bounds.
  const translateX = dragAnimXY.x.interpolate({
    inputRange: [0, SCREEN_W],
    outputRange: [
      16,
      Math.max(16, SCREEN_W - GHOST_WIDTH - 16),
    ],
    extrapolate: 'clamp',
  });
  const translateXWithGap = Animated.add(translateX, POINTER_GAP_X);
  const translateY = Animated.subtract(dragAnimXY.y, POINTER_GAP_Y);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.ghost,
        { width: GHOST_WIDTH, transform: [{ translateX: translateXWithGap }, { translateY }] },
      ]}
    >
      <Text style={styles.handle}>⠿</Text>
      <Animated.View style={styles.textWrap}>
        <Text style={styles.label} numberOfLines={1}>{field.label}</Text>
        <Text style={styles.sub} numberOfLines={1}>{field.subLabel}</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  ghost: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 9999,
    elevation: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.dragBorder,
    paddingVertical: 12,
    paddingHorizontal: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
  },
  handle: {
    fontSize: 18,
    color: Colors.primary,
    marginRight: 10,
  },
  textWrap: {
    flex: 1,
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
  },
  sub: {
    fontSize: 12,
    color: Colors.textSub,
    marginTop: 2,
  },
});
