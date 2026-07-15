// components/ZoomableImage.tsx
import { useRef } from "react";
import { View, Animated, PanResponder, useWindowDimensions, StyleSheet } from "react-native";

type Props = {
  uri: string;
  onZoomingChange: (zooming: boolean) => void;
};

export function ZoomableImage({ uri, onZoomingChange }: Props) {
  // Reactive on rotation — unlike Dimensions.get() which only reads once.
  const { width: SCREEN_W, height: SCREEN_H } = useWindowDimensions();

  const scale = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  const lastScale = useRef(1);
  const lastTx = useRef(0);
  const lastTy = useRef(0);
  const initDist = useRef<number | null>(null);
  const initScale = useRef(1);
  const prevTouchX = useRef(0);
  const prevTouchY = useRef(0);
  const isZooming = useRef(false);

  // Keep the latest screen size available inside PanResponder callbacks
  // without recreating the responder on every rotation.
  const screenRef = useRef({ w: SCREEN_W, h: SCREEN_H });
  screenRef.current = { w: SCREEN_W, h: SCREEN_H };

  const dist = (touches: any[]) => {
    const dx = touches[0].pageX - touches[1].pageX;
    const dy = touches[0].pageY - touches[1].pageY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const clamp = (v: number, lo: number, hi: number) =>
    Math.min(Math.max(v, lo), hi);

  const resetZoom = (animated = true) => {
    if (animated) {
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, useNativeDriver: true }),
        Animated.spring(translateX, { toValue: 0, useNativeDriver: true }),
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true }),
      ]).start();
    } else {
      scale.setValue(1);
      translateX.setValue(0);
      translateY.setValue(0);
    }
    lastScale.current = 1;
    lastTx.current = 0;
    lastTy.current = 0;
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (evt) => evt.nativeEvent.touches.length >= 2,
      onStartShouldSetPanResponderCapture: (evt) => evt.nativeEvent.touches.length >= 2,
      onMoveShouldSetPanResponder: (evt) =>
        evt.nativeEvent.touches.length >= 2 || lastScale.current > 1,
      onMoveShouldSetPanResponderCapture: (evt) =>
        evt.nativeEvent.touches.length >= 2,

      onPanResponderGrant: (evt) => {
        lastScale.current = (scale as any)._value ?? 1;
        lastTx.current = (translateX as any)._value ?? 0;
        lastTy.current = (translateY as any)._value ?? 0;
        initDist.current = null;
        prevTouchX.current = 0;
        prevTouchY.current = 0;
        if (evt.nativeEvent.touches.length >= 2) {
          isZooming.current = true;
          onZoomingChange(true);
        }
      },

      onPanResponderMove: (evt) => {
        const touches = evt.nativeEvent.touches;
        if (touches.length >= 2) {
          if (!isZooming.current) {
            isZooming.current = true;
            onZoomingChange(true);
          }
          const d = dist(touches);
          if (initDist.current === null) {
            initDist.current = d;
            initScale.current = lastScale.current;
          }
          const next = clamp((initScale.current * d) / initDist.current, 1, 5);
          lastScale.current = next;
          scale.setValue(next);
          if (next <= 1) {
            lastTx.current = 0;
            lastTy.current = 0;
            translateX.setValue(0);
            translateY.setValue(0);
          }
        } else if (touches.length === 1 && lastScale.current > 1) {
          const t = touches[0];
          if (prevTouchX.current === 0) {
            prevTouchX.current = t.pageX;
            prevTouchY.current = t.pageY;
            return;
          }
          const dx = t.pageX - prevTouchX.current;
          const dy = t.pageY - prevTouchY.current;
          prevTouchX.current = t.pageX;
          prevTouchY.current = t.pageY;
          const { w, h } = screenRef.current;
          const maxX = (w * (lastScale.current - 1)) / 2;
          const maxY = (h * (lastScale.current - 1)) / 2;
          lastTx.current = clamp(lastTx.current + dx, -maxX, maxX);
          lastTy.current = clamp(lastTy.current + dy, -maxY, maxY);
          translateX.setValue(lastTx.current);
          translateY.setValue(lastTy.current);
        }
      },

      onPanResponderRelease: () => {
        initDist.current = null;
        prevTouchX.current = 0;
        prevTouchY.current = 0;
        isZooming.current = false;
        onZoomingChange(false);
        if (lastScale.current < 1.05) resetZoom(true);
      },

      onPanResponderTerminate: () => {
        initDist.current = null;
        prevTouchX.current = 0;
        prevTouchY.current = 0;
        isZooming.current = false;
        onZoomingChange(false);
      },

      onPanResponderTerminationRequest: () => false,
    })
  ).current;

  return (
    <View
      style={[styles.imageSlot, { width: SCREEN_W, height: SCREEN_H }]}
      {...panResponder.panHandlers}
    >
      <Animated.Image
        source={{ uri }}
        style={[
          // Fill the entire slot — resizeMode="contain" handles centering
          // and letterboxing based on the image's actual aspect ratio, so
          // there's no manually-reserved empty space above/below it.
          { width: SCREEN_W, height: SCREEN_H },
          { transform: [{ scale }, { translateX }, { translateY }] },
        ]}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  imageSlot: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
});



