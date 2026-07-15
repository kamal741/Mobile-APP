/**
 * DateTimePickerModal
 *
 * A two-step picker:
 *   Step 1 — calendar date  (reuses existing DatePickerModal)
 *   Step 2 — drum-scroll hour / minute / AM·PM
 *
 * Props
 *   visible        – controls visibility
 *   initialDate    – YYYY-MM-DD pre-fill  ('' = none)
 *   initialTime    – 'HH:MM AM/PM' pre-fill ('' = none)
 *   onConfirm      – called with { date: 'YYYY-MM-DD', time: 'HH:MM AM' }
 *   onDismiss      – called on backdrop tap / Cancel
 *   minDate        – earliest selectable date (default: start of today, so today is selectable)
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Pressable,
  ScrollView,
  Platform,
} from 'react-native';
import { useSheetBottomPadding } from '@/hooks/useSafeAreaPadding';
import { DatePickerCalendar } from './DatePickerCalendar'; // ← calendar content, no nested Modal

// ─── Constants ────────────────────────────────────────────────────────────────
const ITEM_HEIGHT = 44;
const VISIBLE_ITEMS = 5;
const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;

const HOURS = Array.from({ length: 12 }, (_, i) =>
  String(i + 1).padStart(2, '0'),
); // ['01'..'12']
const MINUTES = Array.from({ length: 60 }, (_, i) =>
  String(i).padStart(2, '0'),
); // ['00'..'59']
const PERIODS = ['AM', 'PM'];

const MONTH_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function parseTime(value: string): { hour: number; minute: number; period: 0 | 1 } {
  // Accepts 'HH:MM AM', 'H:MM PM', '14:30', etc.
  if (!value) return { hour: 0, minute: 0, period: 0 };

  const upper = value.toUpperCase().trim();
  const isPM = upper.includes('PM');
  const cleaned = upper.replace('AM', '').replace('PM', '').trim();
  const [hStr, mStr] = cleaned.split(':');
  let h = parseInt(hStr, 10) || 0;
  const m = parseInt(mStr, 10) || 0;

  // Normalise to 12-hour
  if (h === 0) h = 12;
  if (h > 12) { h = h - 12; }

  return {
    hour: Math.max(0, Math.min(h - 1, 11)),   // 0-based index into HOURS
    minute: Math.max(0, Math.min(m, 59)),
    period: isPM ? 1 : 0,
  };
}

function formatDatePreview(ymd: string): string {
  if (!ymd) return '';
  const parts = ymd.split('-');
  if (parts.length !== 3) return ymd;
  const [y, m, d] = parts.map(Number);
  return `${d} ${MONTH_SHORT[m - 1]} ${y}`;
}

function formatTimeOutput(hourIdx: number, minuteIdx: number, periodIdx: number): string {
  return `${HOURS[hourIdx]}:${MINUTES[minuteIdx]} ${PERIODS[periodIdx]}`;
}

/** Returns a Date set to 00:00:00.000 of the current day. */
function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

// ─── Drum Picker ─────────────────────────────────────────────────────────────
interface DrumPickerProps {
  items: string[];
  selectedIndex: number;
  onIndexChange: (index: number) => void;
  width: number;
}

function DrumPicker({ items, selectedIndex, onIndexChange, width }: DrumPickerProps) {
  const scrollRef = useRef<ScrollView>(null);
  const isScrolling = useRef(false);

  const scrollToIndex = useCallback((index: number, animated = true) => {
    scrollRef.current?.scrollTo({ y: index * ITEM_HEIGHT, animated });
  }, []);

  useEffect(() => {
    if (!isScrolling.current) scrollToIndex(selectedIndex, false);
  }, [selectedIndex]);

  useEffect(() => {
    const t = setTimeout(() => scrollToIndex(selectedIndex, false), 50);
    return () => clearTimeout(t);
  }, []);

  const handleScroll = (e: any) => {
    const index = Math.round(e.nativeEvent.contentOffset.y / ITEM_HEIGHT);
    const clamped = Math.max(0, Math.min(index, items.length - 1));
    if (clamped !== selectedIndex) {
      onIndexChange(clamped);
    }
  };

  const handleScrollEnd = (e: any) => {
    isScrolling.current = false;
    const index = Math.round(e.nativeEvent.contentOffset.y / ITEM_HEIGHT);
    const clamped = Math.max(0, Math.min(index, items.length - 1));
    scrollToIndex(clamped);
    if (clamped !== selectedIndex) onIndexChange(clamped);
  };

  return (
    <View style={[drumStyles.column, { width }]}>
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        onScroll={handleScroll}
        scrollEventThrottle={16}
        onScrollBeginDrag={() => { isScrolling.current = true; }}
        onMomentumScrollEnd={handleScrollEnd}
        onScrollEndDrag={handleScrollEnd}
        contentContainerStyle={{ paddingVertical: ITEM_HEIGHT * 2 }}
        nestedScrollEnabled
      >
        {items.map((item, i) => {
          const dist = Math.abs(i - selectedIndex);
          const opacity = dist === 0 ? 1 : dist === 1 ? 0.5 : 0.22;
          const scale = dist === 0 ? 1 : dist === 1 ? 0.91 : 0.82;
          return (
            <TouchableOpacity
              key={i}
              style={[drumStyles.item, { height: ITEM_HEIGHT }]}
              onPress={() => { onIndexChange(i); scrollToIndex(i); }}
              activeOpacity={0.6}
            >
              <Text
                style={[
                  drumStyles.itemText,
                  { opacity, transform: [{ scale }] },
                  i === selectedIndex && drumStyles.itemTextSelected,
                ]}
              >
                {item}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const drumStyles = StyleSheet.create({
  column: { height: PICKER_HEIGHT, overflow: 'hidden' },
  item: { justifyContent: 'center', alignItems: 'center' },
  itemText: { fontSize: 20, color: '#1e293b', fontWeight: '500' },
  itemTextSelected: { fontSize: 22, fontWeight: '700', color: '#1e40af' },
});

// ─── Time-Picker Sheet ────────────────────────────────────────────────────────
interface TimeSheetProps {
  dateLabel: string;
  initialHour: number;
  initialMinute: number;
  initialPeriod: number;
  onBack: () => void;
  onConfirm: (hourIdx: number, minuteIdx: number, periodIdx: number) => void;
  onDismiss: () => void;
}

function TimeSheet({
  dateLabel,
  initialHour,
  initialMinute,
  initialPeriod,
  onBack,
  onConfirm,
  onDismiss,
}: TimeSheetProps) {
  const [hourIdx, setHourIdx] = useState(initialHour);
  const [minIdx, setMinIdx] = useState(initialMinute);
  const [periodIdx, setPeriodIdx] = useState(initialPeriod);
  const sheetBottomPadding = useSheetBottomPadding(Platform.OS === 'ios' ? 20 : 8);

  // Re-sync whenever the sheet is presented with new initials
  useEffect(() => {
    setHourIdx(initialHour);
    setMinIdx(initialMinute);
    setPeriodIdx(initialPeriod);
  }, [initialHour, initialMinute, initialPeriod]);

  const preview = `${dateLabel}  ·  ${HOURS[hourIdx]}:${MINUTES[minIdx]} ${PERIODS[periodIdx]}`;

  return (
    <Pressable style={timeStyles.backdrop} onPress={onDismiss}>
      <Pressable
        style={[timeStyles.sheet, { paddingBottom: sheetBottomPadding }]}
        onPress={() => {}}
      >
        {/* Handle */}
        <View style={timeStyles.handle} />

        {/* Back link */}
        <TouchableOpacity style={timeStyles.backRow} onPress={onBack} activeOpacity={0.7}>
          <Text style={timeStyles.backArrow}>‹</Text>
          <Text style={timeStyles.backText}>Change date</Text>
        </TouchableOpacity>

        <Text style={timeStyles.title}>Select Time</Text>
        <Text style={timeStyles.preview}>{preview}</Text>

        {/* Drum columns */}
        <View style={timeStyles.pickerContainer}>
          <View pointerEvents="none" style={timeStyles.stripe} />

          <DrumPicker items={HOURS}   selectedIndex={hourIdx}   onIndexChange={setHourIdx}   width={70} />
          <Text style={timeStyles.colon}>:</Text>
          <DrumPicker items={MINUTES} selectedIndex={minIdx}    onIndexChange={setMinIdx}    width={70} />
          <DrumPicker items={PERIODS} selectedIndex={periodIdx} onIndexChange={setPeriodIdx} width={70} />
        </View>

        {/* Footer */}
        <View style={timeStyles.footer}>
          <TouchableOpacity style={timeStyles.cancelBtn} onPress={onDismiss} activeOpacity={0.7}>
            <Text style={timeStyles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={timeStyles.confirmBtn}
            onPress={() => onConfirm(hourIdx, minIdx, periodIdx)}
            activeOpacity={0.8}
          >
            <Text style={timeStyles.confirmText}>Confirm</Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    </Pressable>
  );
}

const timeStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 24,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#e2e8f0',
    marginBottom: 12,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  backArrow: { fontSize: 22, color: '#2563eb', lineHeight: 26 },
  backText: { fontSize: 14, color: '#2563eb', fontWeight: '600' },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
    textAlign: 'center',
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  preview: {
    fontSize: 13,
    fontWeight: '500',
    color: '#2563eb',
    textAlign: 'center',
    marginBottom: 16,
  },
  pickerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    height: PICKER_HEIGHT,
    position: 'relative',
  },
  stripe: {
    position: 'absolute',
    left: 12,
    right: 12,
    top: '50%',
    marginTop: -(ITEM_HEIGHT / 2),
    height: ITEM_HEIGHT,
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
  },
  colon: {
    fontSize: 26,
    fontWeight: '700',
    color: '#0f172a',
    marginHorizontal: 2,
    marginBottom: 4,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e2e8f0',
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  cancelText: { fontSize: 15, fontWeight: '600', color: '#64748b' },
  confirmBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#1e40af',
    alignItems: 'center',
  },
  confirmText: { fontSize: 15, fontWeight: '700', color: '#fff', letterSpacing: 0.2 },
});

// ─── Public API ───────────────────────────────────────────────────────────────
export interface DateTimeResult {
  date: string; // 'YYYY-MM-DD'
  time: string; // 'HH:MM AM'
}

interface DateTimePickerModalProps {
  visible: boolean;
  initialDate?: string;  // 'YYYY-MM-DD' or ''
  initialTime?: string;  // 'HH:MM AM' or ''
  initialStep?: Step;
  onConfirm: (result: DateTimeResult) => void;
  onDismiss: () => void;
  minDate?: Date;
}

type Step = 'date' | 'time';

export function DateTimePickerModal({
  visible,
  initialDate = '',
  initialTime = '',
  initialStep = 'date',
  onConfirm,
  onDismiss,
  minDate,
}: DateTimePickerModalProps) {
  const [step, setStep] = useState<Step>('date');
  const [pickedDate, setPickedDate] = useState('');

  // Time drum state (initialised from initialTime when modal opens)
  const [initHour, setInitHour] = useState(0);
  const [initMin, setInitMin] = useState(0);
  const [initPeriod, setInitPeriod] = useState(0);

  // Reset step & time defaults whenever modal opens
  useEffect(() => {
    if (!visible) return;
    setStep(initialStep);
    setPickedDate(initialDate);
    const { hour, minute, period } = parseTime(initialTime);
    setInitHour(hour);
    setInitMin(minute);
    setInitPeriod(period);
  }, [visible, initialDate, initialStep, initialTime]);

  const handleDateConfirm = (date: string) => {
    setPickedDate(date);
    setStep('time');
  };

  const handleTimeConfirm = (hourIdx: number, minIdx: number, periodIdx: number) => {
    onConfirm({
      date: pickedDate,
      time: formatTimeOutput(hourIdx, minIdx, periodIdx),
    });
  };

  const handleDismiss = () => {
    onDismiss();
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleDismiss}
      statusBarTranslucent
    >
      {step === 'date' ? (
        // ── Step 1: Calendar ─────────────────────────────────────────────────
        // Rendered directly (no nested Modal) — this whole component is
        // already inside the <Modal> below, and stacking a second native
        // Modal on Android causes touch coordinates to be computed against
        // the wrong window, which is what was causing the wrong day to be
        // selected.
        <DatePickerCalendar
          value={pickedDate}
          onConfirm={handleDateConfirm}
          onDismiss={handleDismiss}
          minDate={minDate ?? startOfToday()}
        />
      ) : (
        // ── Step 2: Time drum ─────────────────────────────────────────────────
        <TimeSheet
          dateLabel={formatDatePreview(pickedDate)}
          initialHour={initHour}
          initialMinute={initMin}
          initialPeriod={initPeriod}
          onBack={() => setStep('date')}
          onConfirm={handleTimeConfirm}
          onDismiss={handleDismiss}
        />
      )}
    </Modal>
  );
}







// /**
//  * DateTimePickerModal
//  *
//  * A two-step picker:
//  *   Step 1 — calendar date  (reuses existing DatePickerModal)
//  *   Step 2 — drum-scroll hour / minute / AM·PM
//  *
//  * Props
//  *   visible        – controls visibility
//  *   initialDate    – YYYY-MM-DD pre-fill  ('' = none)
//  *   initialTime    – 'HH:MM AM/PM' pre-fill ('' = none)
//  *   onConfirm      – called with { date: 'YYYY-MM-DD', time: 'HH:MM AM' }
//  *   onDismiss      – called on backdrop tap / Cancel
//  *   minDate        – earliest selectable date (default: start of today, so today is selectable)
//  */

// import React, { useState, useEffect, useRef, useCallback } from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   Modal,
//   TouchableOpacity,
//   Pressable,
//   ScrollView,
//   Platform,
// } from 'react-native';
// import { DatePickerModal } from './DatePickerModal'; // ← your existing calendar picker

// // ─── Constants ────────────────────────────────────────────────────────────────
// const ITEM_HEIGHT = 44;
// const VISIBLE_ITEMS = 5;
// const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;

// const HOURS = Array.from({ length: 12 }, (_, i) =>
//   String(i + 1).padStart(2, '0'),
// ); // ['01'..'12']
// const MINUTES = Array.from({ length: 60 }, (_, i) =>
//   String(i).padStart(2, '0'),
// ); // ['00'..'59']
// const PERIODS = ['AM', 'PM'];

// const MONTH_SHORT = [
//   'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
//   'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
// ];

// // ─── Helpers ──────────────────────────────────────────────────────────────────
// function parseTime(value: string): { hour: number; minute: number; period: 0 | 1 } {
//   // Accepts 'HH:MM AM', 'H:MM PM', '14:30', etc.
//   if (!value) return { hour: 0, minute: 0, period: 0 };

//   const upper = value.toUpperCase().trim();
//   const isPM = upper.includes('PM');
//   const cleaned = upper.replace('AM', '').replace('PM', '').trim();
//   const [hStr, mStr] = cleaned.split(':');
//   let h = parseInt(hStr, 10) || 0;
//   const m = parseInt(mStr, 10) || 0;

//   // Normalise to 12-hour
//   if (h === 0) h = 12;
//   if (h > 12) { h = h - 12; }

//   return {
//     hour: Math.max(0, Math.min(h - 1, 11)),   // 0-based index into HOURS
//     minute: Math.max(0, Math.min(m, 59)),
//     period: isPM ? 1 : 0,
//   };
// }

// function formatDatePreview(ymd: string): string {
//   if (!ymd) return '';
//   const parts = ymd.split('-');
//   if (parts.length !== 3) return ymd;
//   const [y, m, d] = parts.map(Number);
//   return `${d} ${MONTH_SHORT[m - 1]} ${y}`;
// }

// function formatTimeOutput(hourIdx: number, minuteIdx: number, periodIdx: number): string {
//   return `${HOURS[hourIdx]}:${MINUTES[minuteIdx]} ${PERIODS[periodIdx]}`;
// }

// /** Returns a Date set to 00:00:00.000 of the current day. */
// function startOfToday(): Date {
//   const d = new Date();
//   d.setHours(0, 0, 0, 0);
//   return d;
// }

// // ─── Drum Picker ─────────────────────────────────────────────────────────────
// interface DrumPickerProps {
//   items: string[];
//   selectedIndex: number;
//   onIndexChange: (index: number) => void;
//   width: number;
// }

// function DrumPicker({ items, selectedIndex, onIndexChange, width }: DrumPickerProps) {
//   const scrollRef = useRef<ScrollView>(null);
//   const isScrolling = useRef(false);

//   const scrollToIndex = useCallback((index: number, animated = true) => {
//     scrollRef.current?.scrollTo({ y: index * ITEM_HEIGHT, animated });
//   }, []);

//   useEffect(() => {
//     if (!isScrolling.current) scrollToIndex(selectedIndex, false);
//   }, [selectedIndex]);

//   useEffect(() => {
//     const t = setTimeout(() => scrollToIndex(selectedIndex, false), 50);
//     return () => clearTimeout(t);
//   }, []);

//   const handleScrollEnd = (e: any) => {
//     isScrolling.current = false;
//     const index = Math.round(e.nativeEvent.contentOffset.y / ITEM_HEIGHT);
//     const clamped = Math.max(0, Math.min(index, items.length - 1));
//     scrollToIndex(clamped);
//     if (clamped !== selectedIndex) onIndexChange(clamped);
//   };

//   return (
//     <View style={[drumStyles.column, { width }]}>
//       <ScrollView
//         ref={scrollRef}
//         showsVerticalScrollIndicator={false}
//         snapToInterval={ITEM_HEIGHT}
//         decelerationRate="fast"
//         onScrollBeginDrag={() => { isScrolling.current = true; }}
//         onMomentumScrollEnd={handleScrollEnd}
//         onScrollEndDrag={handleScrollEnd}
//         contentContainerStyle={{ paddingVertical: ITEM_HEIGHT * 2 }}
//         nestedScrollEnabled
//       >
//         {items.map((item, i) => {
//           const dist = Math.abs(i - selectedIndex);
//           const opacity = dist === 0 ? 1 : dist === 1 ? 0.5 : 0.22;
//           const scale = dist === 0 ? 1 : dist === 1 ? 0.91 : 0.82;
//           return (
//             <TouchableOpacity
//               key={i}
//               style={[drumStyles.item, { height: ITEM_HEIGHT }]}
//               onPress={() => { onIndexChange(i); scrollToIndex(i); }}
//               activeOpacity={0.6}
//             >
//               <Text
//                 style={[
//                   drumStyles.itemText,
//                   { opacity, transform: [{ scale }] },
//                   i === selectedIndex && drumStyles.itemTextSelected,
//                 ]}
//               >
//                 {item}
//               </Text>
//             </TouchableOpacity>
//           );
//         })}
//       </ScrollView>
//     </View>
//   );
// }

// const drumStyles = StyleSheet.create({
//   column: { height: PICKER_HEIGHT, overflow: 'hidden' },
//   item: { justifyContent: 'center', alignItems: 'center' },
//   itemText: { fontSize: 20, color: '#1e293b', fontWeight: '500' },
//   itemTextSelected: { fontSize: 22, fontWeight: '700', color: '#1e40af' },
// });

// // ─── Time-Picker Sheet ────────────────────────────────────────────────────────
// interface TimeSheetProps {
//   dateLabel: string;
//   initialHour: number;
//   initialMinute: number;
//   initialPeriod: number;
//   onBack: () => void;
//   onConfirm: (hourIdx: number, minuteIdx: number, periodIdx: number) => void;
//   onDismiss: () => void;
// }

// function TimeSheet({
//   dateLabel,
//   initialHour,
//   initialMinute,
//   initialPeriod,
//   onBack,
//   onConfirm,
//   onDismiss,
// }: TimeSheetProps) {
//   const [hourIdx, setHourIdx] = useState(initialHour);
//   const [minIdx, setMinIdx] = useState(initialMinute);
//   const [periodIdx, setPeriodIdx] = useState(initialPeriod);

//   // Re-sync whenever the sheet is presented with new initials
//   useEffect(() => {
//     setHourIdx(initialHour);
//     setMinIdx(initialMinute);
//     setPeriodIdx(initialPeriod);
//   }, [initialHour, initialMinute, initialPeriod]);

//   const preview = `${dateLabel}  ·  ${HOURS[hourIdx]}:${MINUTES[minIdx]} ${PERIODS[periodIdx]}`;

//   return (
//     <Pressable style={timeStyles.backdrop} onPress={onDismiss}>
//       <Pressable style={timeStyles.sheet} onPress={() => {}}>
//         {/* Handle */}
//         <View style={timeStyles.handle} />

//         {/* Back link */}
//         <TouchableOpacity style={timeStyles.backRow} onPress={onBack} activeOpacity={0.7}>
//           <Text style={timeStyles.backArrow}>‹</Text>
//           <Text style={timeStyles.backText}>Change date</Text>
//         </TouchableOpacity>

//         <Text style={timeStyles.title}>Select Time</Text>
//         <Text style={timeStyles.preview}>{preview}</Text>

//         {/* Drum columns */}
//         <View style={timeStyles.pickerContainer}>
//           <View pointerEvents="none" style={timeStyles.stripe} />

//           <DrumPicker items={HOURS}   selectedIndex={hourIdx}   onIndexChange={setHourIdx}   width={70} />
//           <Text style={timeStyles.colon}>:</Text>
//           <DrumPicker items={MINUTES} selectedIndex={minIdx}    onIndexChange={setMinIdx}    width={70} />
//           <DrumPicker items={PERIODS} selectedIndex={periodIdx} onIndexChange={setPeriodIdx} width={70} />
//         </View>

//         {/* Footer */}
//         <View style={timeStyles.footer}>
//           <TouchableOpacity style={timeStyles.cancelBtn} onPress={onDismiss} activeOpacity={0.7}>
//             <Text style={timeStyles.cancelText}>Cancel</Text>
//           </TouchableOpacity>
//           <TouchableOpacity
//             style={timeStyles.confirmBtn}
//             onPress={() => onConfirm(hourIdx, minIdx, periodIdx)}
//             activeOpacity={0.8}
//           >
//             <Text style={timeStyles.confirmText}>Confirm</Text>
//           </TouchableOpacity>
//         </View>
//       </Pressable>
//     </Pressable>
//   );
// }

// const timeStyles = StyleSheet.create({
//   backdrop: {
//     flex: 1,
//     backgroundColor: 'rgba(0,0,0,0.45)',
//     justifyContent: 'flex-end',
//   },
//   sheet: {
//     backgroundColor: '#fff',
//     borderTopLeftRadius: 28,
//     borderTopRightRadius: 28,
//     paddingTop: 12,
//     paddingBottom: Platform.OS === 'ios' ? 36 : 24,
//     paddingHorizontal: 20,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: -4 },
//     shadowOpacity: 0.12,
//     shadowRadius: 20,
//     elevation: 24,
//   },
//   handle: {
//     alignSelf: 'center',
//     width: 40,
//     height: 4,
//     borderRadius: 2,
//     backgroundColor: '#e2e8f0',
//     marginBottom: 12,
//   },
//   backRow: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 4,
//     marginBottom: 8,
//   },
//   backArrow: { fontSize: 22, color: '#2563eb', lineHeight: 26 },
//   backText: { fontSize: 14, color: '#2563eb', fontWeight: '600' },
//   title: {
//     fontSize: 20,
//     fontWeight: '700',
//     color: '#0f172a',
//     textAlign: 'center',
//     letterSpacing: -0.3,
//     marginBottom: 4,
//   },
//   preview: {
//     fontSize: 13,
//     fontWeight: '500',
//     color: '#2563eb',
//     textAlign: 'center',
//     marginBottom: 16,
//   },
//   pickerContainer: {
//     flexDirection: 'row',
//     justifyContent: 'center',
//     alignItems: 'center',
//     height: PICKER_HEIGHT,
//     position: 'relative',
//   },
//   stripe: {
//     position: 'absolute',
//     left: 12,
//     right: 12,
//     top: '50%',
//     marginTop: -(ITEM_HEIGHT / 2),
//     height: ITEM_HEIGHT,
//     backgroundColor: '#f1f5f9',
//     borderRadius: 12,
//   },
//   colon: {
//     fontSize: 26,
//     fontWeight: '700',
//     color: '#0f172a',
//     marginHorizontal: 2,
//     marginBottom: 4,
//   },
//   footer: {
//     flexDirection: 'row',
//     gap: 12,
//     marginTop: 20,
//     paddingTop: 16,
//     borderTopWidth: StyleSheet.hairlineWidth,
//     borderTopColor: '#e2e8f0',
//   },
//   cancelBtn: {
//     flex: 1,
//     paddingVertical: 14,
//     borderRadius: 14,
//     borderWidth: 1.5,
//     borderColor: '#e2e8f0',
//     alignItems: 'center',
//     backgroundColor: '#f8fafc',
//   },
//   cancelText: { fontSize: 15, fontWeight: '600', color: '#64748b' },
//   confirmBtn: {
//     flex: 2,
//     paddingVertical: 14,
//     borderRadius: 14,
//     backgroundColor: '#1e40af',
//     alignItems: 'center',
//   },
//   confirmText: { fontSize: 15, fontWeight: '700', color: '#fff', letterSpacing: 0.2 },
// });

// // ─── Public API ───────────────────────────────────────────────────────────────
// export interface DateTimeResult {
//   date: string; // 'YYYY-MM-DD'
//   time: string; // 'HH:MM AM'
// }

// interface DateTimePickerModalProps {
//   visible: boolean;
//   initialDate?: string;  // 'YYYY-MM-DD' or ''
//   initialTime?: string;  // 'HH:MM AM' or ''
//   onConfirm: (result: DateTimeResult) => void;
//   onDismiss: () => void;
//   minDate?: Date;
// }

// type Step = 'date' | 'time';

// export function DateTimePickerModal({
//   visible,
//   initialDate = '',
//   initialTime = '',
//   onConfirm,
//   onDismiss,
//   minDate,
// }: DateTimePickerModalProps) {
//   const [step, setStep] = useState<Step>('date');
//   const [pickedDate, setPickedDate] = useState('');

//   // Time drum state (initialised from initialTime when modal opens)
//   const [initHour, setInitHour] = useState(0);
//   const [initMin, setInitMin] = useState(0);
//   const [initPeriod, setInitPeriod] = useState(0);

//   // Reset step & time defaults whenever modal opens
//   useEffect(() => {
//     if (!visible) return;
//     setStep('date');
//     setPickedDate(initialDate);
//     const { hour, minute, period } = parseTime(initialTime);
//     setInitHour(hour);
//     setInitMin(minute);
//     setInitPeriod(period);
//   }, [visible]);

//   const handleDateConfirm = (date: string) => {
//     setPickedDate(date);
//     setStep('time');
//   };

//   const handleTimeConfirm = (hourIdx: number, minIdx: number, periodIdx: number) => {
//     onConfirm({
//       date: pickedDate,
//       time: formatTimeOutput(hourIdx, minIdx, periodIdx),
//     });
//   };

//   const handleDismiss = () => {
//     onDismiss();
//   };

//   if (!visible) return null;

//   return (
//     <Modal
//       visible={visible}
//       transparent
//       animationType="slide"
//       onRequestClose={handleDismiss}
//       statusBarTranslucent
//     >
//       {step === 'date' ? (
//         // ── Step 1: Calendar ──────────────────────────────────────────────────
//         <DatePickerModal
//           visible
//           value={pickedDate}
//           onConfirm={handleDateConfirm}
//           onDismiss={handleDismiss}
//           minDate={minDate ?? startOfToday()}
//         />
//       ) : (
//         // ── Step 2: Time drum ─────────────────────────────────────────────────
//         <TimeSheet
//           dateLabel={formatDatePreview(pickedDate)}
//           initialHour={initHour}
//           initialMinute={initMin}
//           initialPeriod={initPeriod}
//           onBack={() => setStep('date')}
//           onConfirm={handleTimeConfirm}
//           onDismiss={handleDismiss}
//         />
//       )}
//     </Modal>
//   );
// }


