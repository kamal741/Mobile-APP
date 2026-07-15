/**
 * SliderRangeInput.tsx
 *
 * A dual-thumb range slider for React Native that replaces the plain TextInput
 * range fields for: Min/Max Budget, Lot Front, Lot Depth, Age of Property.
 *
 * Drop this file into your components/ folder alongside RangeInput.tsx.
 * Then wire it up in FieldRow.tsx per the integration notes at the bottom.
 *
 * Dependencies: react-native only (no extra packages needed).
 */

import React, { useCallback, useRef, useState } from 'react';
import {
  Animated,
  LayoutChangeEvent,
  PanResponder,
  StyleSheet,
  Text,
  View,
} from 'react-native';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SliderConfig {
  /** Minimum possible value on the track */
  min: number;
  /** Maximum possible value on the track */
  max: number;
  /** Step size (default 1) */
  step?: number;
  /** Unit label shown after tick marks e.g. "sqft", "ft", "yrs" */
  unit?: string;
  /** Format a raw number into a display string (e.g. "$1,200,000") */
  formatValue?: (v: number) => string;
  /** Tick mark count (default 5, including endpoints) */
  tickCount?: number;
}

export interface SliderRangeVal {
  from: number | null; // null = "Unspecified" (left end = min)
  to:   number | null; // null = "Max" (right end = max)
}

interface Props {
  config:   SliderConfig;
  value:    SliderRangeVal;
  onChange: (val: SliderRangeVal) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TRACK_HEIGHT  = 4;
const THUMB_SIZE    = 22;
const THUMB_HIT     = 14; // extra hit slop on each side

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v));
}

function snap(v: number, step: number) {
  return Math.round(v / step) * step;
}

function pctToVal(pct: number, min: number, max: number, step: number) {
  return snap(min + pct * (max - min), step);
}

function valToPct(v: number, min: number, max: number) {
  return (v - min) / (max - min);
}

const DEFAULT_FORMAT = (v: number) =>
  v >= 1_000_000
    ? `$${(v / 1_000_000).toFixed(v % 1_000_000 === 0 ? 0 : 1)}M`
    : v >= 1_000
    ? `$${(v / 1_000).toFixed(0)}K`
    : String(v);

// ─── Component ────────────────────────────────────────────────────────────────

export function SliderRangeInput({ config, value, onChange }: Props) {
  const {
    min,
    max,
    step        = 1,
    unit,
    formatValue = DEFAULT_FORMAT,
    tickCount   = 5,
  } = config;

  const [trackWidth, setTrackWidth] = useState(0);
  const trackWidthRef = useRef(0);

  // Resolved numeric values (null = endpoint)
  const fromVal = value.from ?? min;
  const toVal   = value.to   ?? max;

  const fromPct = valToPct(fromVal, min, max);
  const toPct   = valToPct(toVal,   min, max);

  // Animated positions (0–1 range)
  const fromAnim = useRef(new Animated.Value(fromPct)).current;
  const toAnim   = useRef(new Animated.Value(toPct)).current;

  // Keep ref values in sync for pan responders
  const fromPctRef = useRef(fromPct);
  const toPctRef   = useRef(toPct);

  // Scale animations for thumb press feedback
  const fromScale = useRef(new Animated.Value(1)).current;
  const toScale   = useRef(new Animated.Value(1)).current;

  const pressThumb = (anim: Animated.Value) =>
    Animated.spring(anim, { toValue: 1.3, useNativeDriver: true, speed: 40 }).start();
  const releaseThumb = (anim: Animated.Value) =>
    Animated.spring(anim, { toValue: 1, useNativeDriver: true, speed: 30 }).start();

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    setTrackWidth(w);
    trackWidthRef.current = w;
  };

  // ── From thumb pan ──
  const fromPanRef = useRef(0); // px at grant
  const fromPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder:  () => true,
      onPanResponderGrant: (_, gs) => {
        pressThumb(fromScale);
        fromPanRef.current = fromPctRef.current * trackWidthRef.current - gs.x0 + gs.moveX;
      },
      onPanResponderMove: (_, gs) => {
        const px  = fromPanRef.current + gs.dx + gs.x0 - gs.moveX + gs.dx; // approximate
        const raw = gs.moveX / trackWidthRef.current;
        const pct = clamp(raw, 0, toPctRef.current - step / (max - min));
        fromPctRef.current = pct;
        fromAnim.setValue(pct);

        const v = pctToVal(pct, min, max, step);
        onChange({ from: v === min ? null : v, to: value.to });
      },
      onPanResponderRelease:   () => releaseThumb(fromScale),
      onPanResponderTerminate: () => releaseThumb(fromScale),
    }),
  ).current;

  // ── To thumb pan ──
  const toPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder:  () => true,
      onPanResponderGrant: () => pressThumb(toScale),
      onPanResponderMove: (_, gs) => {
        const raw = gs.moveX / trackWidthRef.current;
        const pct = clamp(raw, fromPctRef.current + step / (max - min), 1);
        toPctRef.current = pct;
        toAnim.setValue(pct);

        const v = pctToVal(pct, min, max, step);
        onChange({ from: value.from, to: v === max ? null : v });
      },
      onPanResponderRelease:   () => releaseThumb(toScale),
      onPanResponderTerminate: () => releaseThumb(toScale),
    }),
  ).current;

  // Sync anim values when controlled value changes externally
  const prevFromVal = useRef(fromVal);
  const prevToVal   = useRef(toVal);
  if (prevFromVal.current !== fromVal) {
    prevFromVal.current = fromVal;
    fromPctRef.current  = valToPct(fromVal, min, max);
    fromAnim.setValue(fromPctRef.current);
  }
  if (prevToVal.current !== toVal) {
    prevToVal.current = toVal;
    toPctRef.current  = valToPct(toVal, min, max);
    toAnim.setValue(toPctRef.current);
  }

  // ── Tick marks ──
  const ticks = Array.from({ length: tickCount }, (_, i) => {
    const v   = min + (i / (tickCount - 1)) * (max - min);
    const snp = snap(v, step);
    return { pct: i / (tickCount - 1), label: i === tickCount - 1 ? 'Max' : formatValue(snp) };
  });

  // ── Value label ──
  const fromLabel = value.from == null ? 'Unspecified' : formatValue(fromVal);
  const toLabel   = value.to   == null ? 'Max'         : formatValue(toVal);
  const rangeLabel = `${fromLabel} – ${toLabel}`;

  // Derived positions for fill
  const fillLeft  = fromAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  const fillRight = toAnim.interpolate({ inputRange: [0, 1], outputRange: ['100%', '0%'] });

  return (
    <View style={styles.wrap}>
      {/* Current range label */}
      <Text style={styles.rangeLabel}>{rangeLabel}{unit ? ` ${unit}` : ''}</Text>

      {/* Track area */}
      <View style={styles.trackArea} onLayout={onLayout}>
        {/* Background track */}
        <View style={styles.trackBg} />

        {/* Active fill */}
        <Animated.View
          style={[
            styles.trackFill,
            { left: fillLeft, right: fillRight },
          ]}
        />

        {/* From thumb */}
        <Animated.View
          {...fromPanResponder.panHandlers}
          style={[
            styles.thumbWrap,
            { left: fromAnim.interpolate({ inputRange: [0, 1], outputRange: [-(THUMB_SIZE / 2), trackWidth - THUMB_SIZE / 2] }) },
          ]}
          hitSlop={{ top: THUMB_HIT, bottom: THUMB_HIT, left: THUMB_HIT, right: THUMB_HIT }}
        >
          <Animated.View style={[styles.thumb, { transform: [{ scale: fromScale }] }]} />
        </Animated.View>

        {/* To thumb */}
        <Animated.View
          {...toPanResponder.panHandlers}
          style={[
            styles.thumbWrap,
            { left: toAnim.interpolate({ inputRange: [0, 1], outputRange: [-(THUMB_SIZE / 2), trackWidth - THUMB_SIZE / 2] }) },
          ]}
          hitSlop={{ top: THUMB_HIT, bottom: THUMB_HIT, left: THUMB_HIT, right: THUMB_HIT }}
        >
          <Animated.View style={[styles.thumb, { transform: [{ scale: toScale }] }]} />
        </Animated.View>
      </View>

      {/* Tick labels */}
      <View style={styles.ticks}>
        {ticks.map((t, i) => (
          <Text
            key={i}
            style={[
              styles.tickLabel,
              i === 0           && styles.tickLeft,
              i === ticks.length - 1 && styles.tickRight,
            ]}
          >
            {t.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

// Matches the teal/cyan accent from the screenshot (#00BCD4 / #0AAFB8 range)
const TEAL = '#0AAFB8';

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 4,
    paddingTop: 4,
    paddingBottom: 8,
  },
  rangeLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2D3748',      // matches existing rowLabel colour
    marginBottom: 18,
  },
  trackArea: {
    height: THUMB_SIZE,
    justifyContent: 'center',
    marginHorizontal: THUMB_SIZE / 2,
    position: 'relative',
  },
  trackBg: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    backgroundColor: '#E2E8F0',   // light grey — matches existing border palette
  },
  trackFill: {
    position: 'absolute',
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    backgroundColor: TEAL,
  },
  thumbWrap: {
    position: 'absolute',
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: TEAL,
    // Shadow — iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    // Shadow — Android
    elevation: 4,
  },
  ticks: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    marginHorizontal: 0,
  },
  tickLabel: {
    fontSize: 11,
    color: '#718096',   // muted grey matching existing subLabel
    textAlign: 'center',
    flex: 1,
  },
  tickLeft: {
    textAlign: 'left',
  },
  tickRight: {
    textAlign: 'right',
  },
});
