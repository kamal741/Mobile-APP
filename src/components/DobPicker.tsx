import { useState, useEffect, useRef, useCallback } from 'react';
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

// ─── Constants ────────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  'January', 'February', 'March', 'April',
  'May', 'June', 'July', 'August',
  'September', 'October', 'November', 'December',
];

const ITEM_HEIGHT = 44;
const VISIBLE_ITEMS = 5; // must be odd
const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toYMD(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function parseYMD(value: string): { year: number; month: number; day: number } | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [y, m, d] = value.split('-').map(Number);
  if (isNaN(y) || isNaN(m) || isNaN(d)) return null;
  return { year: y, month: m - 1, day: d };
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function generateYears(minYear: number, maxYear: number): number[] {
  const years: number[] = [];
  for (let y = maxYear; y >= minYear; y--) years.push(y);
  return years;
}

// ─── Drum Picker ─────────────────────────────────────────────────────────────

interface DrumPickerProps {
  items: (string | number)[];
  selectedIndex: number;
  onIndexChange: (index: number) => void;
  width: number;
}

function DrumPicker({ items, selectedIndex, onIndexChange, width }: DrumPickerProps) {
  const scrollRef = useRef<ScrollView>(null);
  const isScrolling = useRef(false);

  const scrollToIndex = useCallback(
    (index: number, animated = true) => {
      scrollRef.current?.scrollTo({ y: index * ITEM_HEIGHT, animated });
    },
    []
  );

  // Scroll to selected on mount or when selectedIndex changes externally
  useEffect(() => {
    if (!isScrolling.current) {
      scrollToIndex(selectedIndex, false);
    }
  }, [selectedIndex]);

  // Initial scroll (no animation)
  useEffect(() => {
    const t = setTimeout(() => scrollToIndex(selectedIndex, false), 50);
    return () => clearTimeout(t);
  }, []);

  const handleScrollEnd = (e: any) => {
    isScrolling.current = false;
    const offsetY = e.nativeEvent.contentOffset.y;
    const index = Math.round(offsetY / ITEM_HEIGHT);
    const clamped = Math.max(0, Math.min(index, items.length - 1));
    scrollToIndex(clamped);
    if (clamped !== selectedIndex) onIndexChange(clamped);
  };

  return (
    <View style={[styles.drumColumn, { width }]}>
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        onScrollBeginDrag={() => { isScrolling.current = true; }}
        onMomentumScrollEnd={handleScrollEnd}
        onScrollEndDrag={handleScrollEnd}
        contentContainerStyle={{ paddingVertical: ITEM_HEIGHT * 2 }}
        nestedScrollEnabled
      >
        {items.map((item, i) => {
          const dist = Math.abs(i - selectedIndex);
          const opacity = dist === 0 ? 1 : dist === 1 ? 0.55 : 0.25;
          const scale = dist === 0 ? 1 : dist === 1 ? 0.92 : 0.84;
          const isSelected = i === selectedIndex;
          return (
            <TouchableOpacity
              key={i}
              style={[styles.drumItem, { height: ITEM_HEIGHT }]}
              onPress={() => {
                onIndexChange(i);
                scrollToIndex(i);
              }}
              activeOpacity={0.6}
            >
              <Text
                style={[
                  styles.drumItemText,
                  { opacity, transform: [{ scale }] },
                  isSelected && styles.drumItemTextSelected,
                ]}
                numberOfLines={1}
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

// ─── Main Component ───────────────────────────────────────────────────────────

interface Props {
  visible: boolean;
  value: string; // YYYY-MM-DD or ''
  onConfirm: (date: string) => void;
  onDismiss: () => void;
  /** Earliest selectable year. Default: current year - 100 */
  minYear?: number;
  /** Latest selectable year. Default: current year */
  maxYear?: number;
}

export function DOBPicker({ visible, value, onConfirm, onDismiss, minYear, maxYear }: Props) {
  const sheetBottomPadding = useSheetBottomPadding(Platform.OS === 'ios' ? 20 : 8);
  const currentYear = new Date().getFullYear();
  const resolvedMaxYear = maxYear ?? currentYear;
  const resolvedMinYear = minYear ?? currentYear - 100;

  const years = generateYears(resolvedMinYear, resolvedMaxYear);
  const months = MONTH_NAMES;

  const defaultYear = currentYear - 25;
  const defaultYearIdx = years.indexOf(defaultYear) !== -1 ? years.indexOf(defaultYear) : 0;

  const [yearIdx, setYearIdx] = useState(defaultYearIdx);
  const [monthIdx, setMonthIdx] = useState(0);
  const [dayIdx, setDayIdx] = useState(0); // 0-based index into days array

  // Derived values
  const selectedYear = years[yearIdx];
  const totalDays = daysInMonth(selectedYear, monthIdx);
  const days = Array.from({ length: totalDays }, (_, i) => i + 1);

  // Clamp day if month/year changes shrink the days
  useEffect(() => {
    if (dayIdx >= totalDays) setDayIdx(totalDays - 1);
  }, [totalDays]);

  // Sync state when modal opens
  useEffect(() => {
    if (!visible) return;
    const parsed = parseYMD(value);
    if (parsed) {
      const yIdx = years.indexOf(parsed.year);
      setYearIdx(yIdx !== -1 ? yIdx : defaultYearIdx);
      setMonthIdx(parsed.month);
      setDayIdx(Math.min(parsed.day - 1, daysInMonth(parsed.year, parsed.month) - 1));
    } else {
      setYearIdx(defaultYearIdx);
      setMonthIdx(0);
      setDayIdx(0);
    }
  }, [visible]);

  const handleConfirm = () => {
    onConfirm(toYMD(selectedYear, monthIdx, dayIdx + 1));
  };

  const formattedPreview = `${days[dayIdx]} ${MONTH_NAMES[monthIdx]} ${selectedYear}`;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onDismiss}
      statusBarTranslucent
    >
      <Pressable style={styles.backdrop} onPress={onDismiss}>
        <Pressable
          style={[styles.sheet, { paddingBottom: sheetBottomPadding }]}
          onPress={() => {}}
        >

          {/* Handle bar */}
          <View style={styles.handle} />

          {/* Title */}
          <Text style={styles.title}>Date of Birth</Text>
          <Text style={styles.preview}>{formattedPreview}</Text>

          {/* Drum columns */}
          <View style={styles.pickerContainer}>
            {/* Selection highlight stripe */}
            <View pointerEvents="none" style={styles.selectionStripe} />

            {/* Day */}
            <DrumPicker
              items={days}
              selectedIndex={dayIdx}
              onIndexChange={setDayIdx}
              width={54}
            />

            {/* Month */}
            <DrumPicker
              items={months}
              selectedIndex={monthIdx}
              onIndexChange={setMonthIdx}
              width={138}
            />

            {/* Year */}
            <DrumPicker
              items={years}
              selectedIndex={yearIdx}
              onIndexChange={setYearIdx}
              width={72}
            />
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onDismiss} activeOpacity={0.7}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm} activeOpacity={0.8}>
              <Text style={styles.confirmText}>Confirm</Text>
            </TouchableOpacity>
          </View>

        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const ACCENT = '#0f172a';
const BLUE = '#2563eb';

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingHorizontal: 20,
    // Shadow
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
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: ACCENT,
    textAlign: 'center',
    letterSpacing: -0.4,
    marginBottom: 4,
  },
  preview: {
    fontSize: 14,
    fontWeight: '500',
    color: BLUE,
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: 0.2,
  },

  // ── Picker ──
  pickerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    height: PICKER_HEIGHT,
    overflow: 'hidden',
    position: 'relative',
  },
  selectionStripe: {
    position: 'absolute',
    left: 12,
    right: 12,
    top: '50%',
    marginTop: -(ITEM_HEIGHT / 2),
    height: ITEM_HEIGHT,
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
  },
  drumColumn: {
    height: PICKER_HEIGHT,
    overflow: 'hidden',
  },
  drumItem: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  drumItemText: {
    fontSize: 16,
    color: ACCENT,
    fontWeight: '500',
    textAlign: 'center',
  },
  drumItemTextSelected: {
    fontWeight: '700',
    fontSize: 17,
    color: BLUE,
  },

  // ── Footer ──
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
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748b',
  },
  confirmBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: BLUE,
    alignItems: 'center',
  },
  confirmText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.2,
  },
});