import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  PanResponder,
  GestureResponderEvent,
  PanResponderGestureState,
  TextInput,
  Pressable,
} from 'react-native';
import { Keyboard as KeyboardIcon, Clock3 } from 'lucide-react-native';
import {
  colors,
  shadows,
  radius,
  border,
  spacing,
  fontSize,
  fontWeight,
  letterSpacing,
} from '@/theme';

// ─── Geometry constants ────────────────────────────────────────────────────
// Everything is laid out around a fixed-size dial so the touch-angle math
// below is deterministic — no onLayout race conditions.

const DIAL_SIZE = 264;
const DIAL_CENTER = DIAL_SIZE / 2;
const NUMBER_RADIUS = 96;   // distance from center to each number bubble
const BUBBLE_SIZE = 34;
const CENTER_DOT_SIZE = 8;

const HOUR_MARKS = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]; // index 0 → 12 (top)
const MINUTE_MARKS = Array.from({ length: 12 }, (_, i) => i * 5); // 0,5,10…55

type Mode = 'hour' | 'minute';
type InputMode = 'clock' | 'keyboard';
type Ampm = 'AM' | 'PM';

interface TimePickerClockProps {
  visible: boolean;
  initialHour: number;   // 1–12
  initialMinute: number; // 0–59
  initialAmpm: Ampm;
  title?: string;
  onCancel: () => void;
  onConfirm: (h: number, m: number, ampm: Ampm) => void;
}

// Returns the {x, y} position (relative to the dial's own top-left corner)
// for a given index (0–11) around the circle, where index 0 sits at 12 o'clock
// and indices increase clockwise — matching how numbers sit on a real clock face.
function positionForIndex(index: number) {
  const angleRad = ((index * 30) * Math.PI) / 180;
  const x = DIAL_CENTER + NUMBER_RADIUS * Math.sin(angleRad);
  const y = DIAL_CENTER - NUMBER_RADIUS * Math.cos(angleRad);
  return { x, y };
}

// Converts a touch point (relative to the dial) into the nearest of the
// 12 clock positions, returning the index (for both the value and the hand).
function indexForTouch(x: number, y: number) {
  const dx = x - DIAL_CENTER;
  const dy = y - DIAL_CENTER;
  let angleDeg = (Math.atan2(dx, -dy) * 180) / Math.PI;
  if (angleDeg < 0) angleDeg += 360;
  return Math.round(angleDeg / 30) % 12;
}

const TimePickerClock: React.FC<TimePickerClockProps> = ({
  visible,
  initialHour,
  initialMinute,
  initialAmpm,
  title = 'SELECT TIME',
  onCancel,
  onConfirm,
}) => {
  const [mode, setMode] = useState<Mode>('hour');
  const [inputMode, setInputMode] = useState<InputMode>('clock');
  const [h, setH] = useState(initialHour);
  const [m, setM] = useState(initialMinute);
  const [ampm, setAmpm] = useState<Ampm>(initialAmpm);

  const [hourText, setHourText] = useState(String(initialHour));
  const [minuteText, setMinuteText] = useState(String(initialMinute).padStart(2, '0'));


  const modeRef = useRef(mode);
useEffect(() => {
  modeRef.current = mode;
}, [mode]);
  // Reset local state fresh every time the modal opens, so a Cancel never
  // leaves stale edits behind for next time it's opened.
  useEffect(() => {
    if (!visible) return;
    const nearestMinute = Math.round(initialMinute / 5) * 5 % 60;
    setMode('hour');
    setInputMode('clock');
    setH(initialHour);
    setM(nearestMinute);
    setAmpm(initialAmpm);
    setHourText(String(initialHour));
    setMinuteText(String(nearestMinute).padStart(2, '0'));
  }, [visible, initialHour, initialMinute, initialAmpm]);

  const updateFromTouch = (x: number, y: number) => {
  const index = indexForTouch(x, y);
  if (modeRef.current === 'hour') {
    setH(index === 0 ? 12 : index);
  } else {
    setM((index * 5) % 60);
  }
};

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt: GestureResponderEvent) => {
        updateFromTouch(evt.nativeEvent.locationX, evt.nativeEvent.locationY);
      },
      onPanResponderMove: (evt: GestureResponderEvent, _g: PanResponderGestureState) => {
        updateFromTouch(evt.nativeEvent.locationX, evt.nativeEvent.locationY);
      },
      onPanResponderRelease: () => {
        // Mirrors the familiar Android/iOS flow: release the hour hand and
        // the picker advances straight into minute selection.
        setMode((current) => (current === 'hour' ? 'minute' : current));
      },
    })
  ).current;

  const activeMarks = mode === 'hour' ? HOUR_MARKS : MINUTE_MARKS;
  const selectedIndex = useMemo(() => {
    if (mode === 'hour') return h === 12 ? 0 : h;
    return Math.round(m / 5) % 12;
  }, [mode, h, m]);

  const handPos = positionForIndex(selectedIndex);

  const handleKeyboardConfirm = () => {
    const parsedH = Math.max(1, Math.min(12, parseInt(hourText, 10) || 1));
    const parsedM = Math.max(0, Math.min(59, parseInt(minuteText, 10) || 0));
    setH(parsedH);
    setM(parsedM);
    onConfirm(parsedH, parsedM, ampm);
  };

  const handleConfirm = () => {
    if (inputMode === 'keyboard') {
      handleKeyboardConfirm();
      return;
    }
    onConfirm(h, m, ampm);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.overlay} onPress={onCancel}>
        {/* Stop taps inside the card from bubbling to the overlay's dismiss handler */}
        <Pressable style={styles.card} onPress={() => {}}>
          <Text style={styles.title}>{title}</Text>

          <View style={styles.displayRow}>
            <TouchableOpacity
              style={[styles.digitBox, mode === 'hour' && inputMode === 'clock' && styles.digitBoxActive]}
              onPress={() => setMode('hour')}
              activeOpacity={0.7}
              disabled={inputMode === 'keyboard'}
            >
              {inputMode === 'keyboard' ? (
                <TextInput
                  style={styles.digitInput}
                  value={hourText}
                  onChangeText={(t) => setHourText(t.replace(/[^0-9]/g, '').slice(0, 2))}
                  keyboardType="number-pad"
                  maxLength={2}
                  selectTextOnFocus
                />
              ) : (
                <Text style={[styles.digitText, mode === 'hour' && styles.digitTextActive]}>
                  {String(h).padStart(2, '0')}
                </Text>
              )}
            </TouchableOpacity>

            <Text style={styles.colon}>:</Text>

            <TouchableOpacity
              style={[styles.digitBox, mode === 'minute' && inputMode === 'clock' && styles.digitBoxActive]}
              onPress={() => setMode('minute')}
              activeOpacity={0.7}
              disabled={inputMode === 'keyboard'}
            >
              {inputMode === 'keyboard' ? (
                <TextInput
                  style={styles.digitInput}
                  value={minuteText}
                  onChangeText={(t) => setMinuteText(t.replace(/[^0-9]/g, '').slice(0, 2))}
                  keyboardType="number-pad"
                  maxLength={2}
                  selectTextOnFocus
                />
              ) : (
                <Text style={[styles.digitText, mode === 'minute' && styles.digitTextActive]}>
                  {String(m).padStart(2, '0')}
                </Text>
              )}
            </TouchableOpacity>

            <View style={styles.ampmCol}>
              <TouchableOpacity
                style={[styles.ampmBtn, ampm === 'AM' && styles.ampmBtnActive]}
                onPress={() => setAmpm('AM')}
                activeOpacity={0.7}
              >
                <Text style={[styles.ampmText, ampm === 'AM' && styles.ampmTextActive]}>AM</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.ampmBtn, ampm === 'PM' && styles.ampmBtnActive]}
                onPress={() => setAmpm('PM')}
                activeOpacity={0.7}
              >
                <Text style={[styles.ampmText, ampm === 'PM' && styles.ampmTextActive]}>PM</Text>
              </TouchableOpacity>
            </View>
          </View>

          {inputMode === 'clock' && (
            <View style={styles.dialWrap} {...panResponder.panHandlers}>
              <View style={styles.dial}>
                {/* Hand — a zero-size anchor at dial center, rotated so its
                    child stem always points at the selected number. */}
                <View
                  style={[
                    styles.handAnchor,
                    { transform: [{ rotate: `${selectedIndex * 30}deg` }] },
                  ]}
                  pointerEvents="none"
                >
                  <View style={[styles.handStem, { height: NUMBER_RADIUS - BUBBLE_SIZE / 2 }]} />
                </View>

                <View style={styles.centerDot} pointerEvents="none" />

                {/* Selected-number bubble, placed with plain trig (not the
                    rotated anchor) so its text stays upright. */}
                <View
                  style={[
                    styles.bubble,
                    { left: handPos.x - BUBBLE_SIZE / 2, top: handPos.y - BUBBLE_SIZE / 2 },
                  ]}
                  pointerEvents="none"
                />

                {activeMarks.map((value, index) => {
                  const pos = positionForIndex(index);
                  const active = index === selectedIndex;
                  const label = mode === 'hour' ? String(value) : String(value).padStart(2, '0');
                  return (
                    <View
                      key={value}
                      style={[
                        styles.numberSlot,
                        { left: pos.x - BUBBLE_SIZE / 2, top: pos.y - BUBBLE_SIZE / 2 },
                      ]}
                      pointerEvents="none"
                    >
                      <Text style={[styles.numberText, active && styles.numberTextActive]}>
                        {label}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          <View style={styles.footer}>
            <TouchableOpacity
              onPress={() => setInputMode((cur) => (cur === 'clock' ? 'keyboard' : 'clock'))}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.footerIconBtn}
            >
              {inputMode === 'clock' ? (
                <KeyboardIcon size={20} color={colors.text.secondary} strokeWidth={2} />
              ) : (
                <Clock3 size={20} color={colors.text.secondary} strokeWidth={2} />
              )}
            </TouchableOpacity>

            <View style={styles.footerActions}>
              <TouchableOpacity onPress={onCancel} activeOpacity={0.7} style={styles.footerBtn}>
                <Text style={styles.footerBtnText}>CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleConfirm} activeOpacity={0.7} style={styles.footerBtn}>
                <Text style={styles.footerBtnText}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

export default TimePickerClock;

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.background.overlay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: 312,
    borderRadius: radius.modal,
    backgroundColor: colors.background.surface,
    paddingTop: spacing['5xl'],
    paddingHorizontal: spacing['5xl'],
    paddingBottom: spacing.xl,
    ...shadows.modal,
  },
  title: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.extraBold,
    letterSpacing: letterSpacing.wider,
    color: colors.text.muted,
    marginBottom: spacing['4xl'],
  },
  displayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing['6xl'],
  },
  digitBox: {
    width: 64,
    height: 64,
    borderRadius: radius.item,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background.subtle,
  },
  digitBoxActive: {
    backgroundColor: colors.primary.light,
    borderWidth: border.width.mid,
    borderColor: colors.primary.default,
  },
  digitText: {
    fontSize: 34,
    fontWeight: fontWeight.semiBold,
    color: colors.text.primary,
  },
  digitTextActive: {
    color: colors.primary.default,
    fontWeight: fontWeight.extraBold,
  },
  digitInput: {
    fontSize: 34,
    fontWeight: fontWeight.bold,
    color: colors.primary.default,
    textAlign: 'center',
    width: '100%',
    padding: 0,
  },
  colon: {
    fontSize: 30,
    fontWeight: fontWeight.bold,
    color: colors.text.primary,
    marginHorizontal: spacing.sm,
  },
  ampmCol: {
    marginLeft: spacing.xl,
    gap: spacing.sm,
  },
  ampmBtn: {
    width: 44,
    height: 27,
    borderRadius: radius.btnSm,
    borderWidth: border.width.thin,
    borderColor: colors.border.default,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background.surface,
  },
  ampmBtnActive: {
    backgroundColor: colors.primary.default,
    borderColor: colors.primary.default,
  },
  ampmText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.extraBold,
    color: colors.text.secondary,
  },
  ampmTextActive: {
    color: colors.text.inverse,
  },
  dialWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing['2xl'],
  },
  dial: {
    width: DIAL_SIZE,
    height: DIAL_SIZE,
    borderRadius: DIAL_SIZE / 2,
    backgroundColor: colors.background.subtle,
  },
  handAnchor: {
    position: 'absolute',
    left: DIAL_CENTER,
    top: DIAL_CENTER,
    width: 0,
    height: 0,
  },
  handStem: {
    position: 'absolute',
    left: -1,
    bottom: 0,
    width: 2,
    backgroundColor: colors.primary.default,
  },
  centerDot: {
    position: 'absolute',
    left: DIAL_CENTER - CENTER_DOT_SIZE / 2,
    top: DIAL_CENTER - CENTER_DOT_SIZE / 2,
    width: CENTER_DOT_SIZE,
    height: CENTER_DOT_SIZE,
    borderRadius: CENTER_DOT_SIZE / 2,
    backgroundColor: colors.primary.default,
  },
  bubble: {
    position: 'absolute',
    width: BUBBLE_SIZE,
    height: BUBBLE_SIZE,
    borderRadius: BUBBLE_SIZE / 2,
    backgroundColor: colors.primary.default,
  },
  numberSlot: {
    position: 'absolute',
    width: BUBBLE_SIZE,
    height: BUBBLE_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semiBold,
    color: colors.text.secondary,
  },
  numberTextActive: {
    color: colors.text.inverse,
    fontWeight: fontWeight.extraBold,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  footerIconBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerActions: {
    flexDirection: 'row',
    gap: spacing['5xl'],
  },
  footerBtn: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  footerBtnText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.extraBold,
    color: colors.primary.default,
    letterSpacing: 0.3,
  },
});