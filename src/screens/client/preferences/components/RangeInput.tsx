import React, { useRef, useState, useEffect } from 'react';
import {
  View, Text, StyleSheet,
  PanResponder, Animated, LayoutChangeEvent,
} from 'react-native';
import { Colors } from '../constants/theme';
import type { RangeVal } from '../types/preferences';

// ─── Tokens ───────────────────────────────────────────────────────────────────
const TRACK_H    = 4;
const THUMB_SIZE = 22;
const TEAL       = '#1ABCAE';
const INACTIVE   = '#DDE3EE';

interface TickMark { value: number; label: string }
interface Props {
  value:        RangeVal;
  unit?:        string;
  onChange:     (val: RangeVal) => void;
  min?:         number;
  max?:         number;
  step?:        number;
  tickMarks?:   TickMark[];
  minLabel?:    string;
  maxLabel?:    string;
  /** Optional custom label formatter — e.g. for currency display */
  formatLabel?: (v: number, isLow: boolean, min: number, max: number) => string;
  fromPlaceholder?: string;
  toPlaceholder?:   string;
}

function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }
function snapTo(v: number, step: number)           { return Math.round(v / step) * step;  }

export function RangeInput({
  value,
  unit,
  onChange,
  min         = 0,
  max         = 100,
  step        = 1,
  tickMarks,
  minLabel    = 'Unspecified',
  maxLabel    = 'Max',
  formatLabel,
}: Props) {

  const parseFrom = () => { const n = parseFloat(value.from); return isNaN(n) ? min : clamp(n, min, max); };
  const parseTo   = () => { const n = parseFloat(value.to);   return isNaN(n) ? max : clamp(n, min, max); };

  // ── Mutable refs ──────────────────────────────────────────────────────────
  const trackW      = useRef(0);
  const didLayout   = useRef(false);
  const lowPx       = useRef(0);
  const highPx      = useRef(0);
  const dragStartPx = useRef(0);

  const lowAnim  = useRef(new Animated.Value(0)).current;
  const highAnim = useRef(new Animated.Value(0)).current;

  const [lowVal,  setLowVal]  = useState<number>(parseFrom);
  const [highVal, setHighVal] = useState<number>(parseTo);

  const toPixel = (v: number) =>
    trackW.current === 0 ? 0 : ((v - min) / (max - min)) * trackW.current;
  const toValue = (px: number) =>
    snapTo(clamp((px / trackW.current) * (max - min) + min, min, max), step);

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w === 0) return;
    trackW.current = w;
    const lv = parseFrom(), hv = parseTo();
    const lp = toPixel(lv), hp = toPixel(hv);
    lowPx.current = lp;   highPx.current = hp;
    lowAnim.setValue(lp); highAnim.setValue(hp);
    setLowVal(lv);        setHighVal(hv);
    didLayout.current = true;
  };

  useEffect(() => {
    if (!didLayout.current) return;
    const lv = parseFrom(), hv = parseTo();
    const lp = toPixel(lv), hp = toPixel(hv);
    lowPx.current = lp;   lowAnim.setValue(lp);   setLowVal(lv);
    highPx.current = hp;  highAnim.setValue(hp);  setHighVal(hv);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.from, value.to]);

  // ── PanResponder ──────────────────────────────────────────────────────────
  const makePan = (isLow: boolean) =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder:  () => true,
      onPanResponderGrant() {
        dragStartPx.current = isLow ? lowPx.current : highPx.current;
        (isLow ? lowAnim : highAnim).stopAnimation();
      },
      onPanResponderMove(_, gs) {
        const MIN_GAP = 1;
        let px = clamp(dragStartPx.current + gs.dx, 0, trackW.current);
        if (isLow)  px = Math.min(px, highPx.current - MIN_GAP);
        else        px = Math.max(px, lowPx.current  + MIN_GAP);
        if (isLow)  lowPx.current  = px;
        else        highPx.current = px;
        (isLow ? lowAnim : highAnim).setValue(px);
        if (isLow)  setLowVal(toValue(px));
        else        setHighVal(toValue(px));
      },
      onPanResponderRelease() {
        const px         = isLow ? lowPx.current : highPx.current;
        const snappedVal = toValue(px);
        const snappedPx  = toPixel(snappedVal);
        if (isLow) {
          lowPx.current = snappedPx;
          lowAnim.setValue(snappedPx);
          setLowVal(snappedVal);
          onChange({ from: String(snappedVal), to: String(toValue(highPx.current)) });
        } else {
          highPx.current = snappedPx;
          highAnim.setValue(snappedPx);
          setHighVal(snappedVal);
          onChange({ from: String(toValue(lowPx.current)), to: String(snappedVal) });
        }
      },
    });

  const lowPan  = useRef(makePan(true)).current;
  const highPan = useRef(makePan(false)).current;

  // ── Label formatting ──────────────────────────────────────────────────────
  const fmt = (v: number, isLow: boolean): string => {
    if (formatLabel) return formatLabel(v, isLow, min, max);
    if (isLow  && v === min) return minLabel;
    if (!isLow && v === max) return maxLabel;
    return unit ? `${v} ${unit}` : String(v);
  };

  const fillLeft  = lowAnim;
  const fillWidth = Animated.subtract(highAnim, lowAnim);

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{fmt(lowVal, true)}</Text>
        <Text style={styles.dash}> – </Text>
        <Text style={styles.label}>{fmt(highVal, false)}</Text>
      </View>

      <View style={styles.trackWrap} onLayout={onLayout}>
        <View style={[styles.track, { backgroundColor: INACTIVE }]} />
        <Animated.View
          pointerEvents="none"
          style={[styles.track, { position: 'absolute', backgroundColor: TEAL, left: fillLeft, width: fillWidth }]}
        />
        <Animated.View
          {...lowPan.panHandlers}
          style={[styles.thumb, { left: Animated.subtract(lowAnim, THUMB_SIZE / 2) }]}
        />
        <Animated.View
          {...highPan.panHandlers}
          style={[styles.thumb, { left: Animated.subtract(highAnim, THUMB_SIZE / 2) }]}
        />
      </View>

      {tickMarks && tickMarks.length > 0 && (
        <View style={styles.tickRow}>
          {tickMarks.map(t => (
            <Text key={t.value} style={styles.tick}>{t.label}</Text>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingBottom: 4 },
  labelRow:  { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  label:     { fontSize: 13, fontWeight: '600', color: TEAL, letterSpacing: 0.1 },
  dash:      { fontSize: 13, color: Colors.textMuted },
  trackWrap: { height: THUMB_SIZE + 8, justifyContent: 'center', position: 'relative' },
  track:     { position: 'absolute', left: 0, right: 0, height: TRACK_H, borderRadius: TRACK_H / 2 },
  thumb: {
    position: 'absolute',
    width: THUMB_SIZE, height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: '#FFF',
    borderWidth: 2, borderColor: TEAL,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18, shadowRadius: 4,
    elevation: 5,
  },
  tickRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  tick:    { fontSize: 11, color: '#A0AABB' },
});

