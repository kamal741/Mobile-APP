import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import {
  CalendarDays,
  ChevronDown,
  Clock3,
  Timer,
  X,
} from 'lucide-react-native';
import { Property } from '../../types';
import { colors, shadows, radius, border, spacing, fontSize, fontWeight } from '@/theme';
import { ConflictBadge } from './Atoms';
import { VIEWING_DURATIONS } from '../../constants';
import TimePickerClock from '@/components/TimePickerClock';

interface RoutePropertyCardProps {
  property: Property;
  index: number;
  routeDateLabel?: string;
  onRemove: (property: Property) => void;
  onUpdate?: (updated: Property) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseStartTime(raw: string | undefined | null): { h: number; m: number; ampm: 'AM' | 'PM' } {
  if (!raw) return { h: 10, m: 0, ampm: 'AM' };
  const match = raw.match(/(\d+):(\d+)\s*([AP])/i);
  if (!match) return { h: 10, m: 0, ampm: 'AM' };
  return {
    h: parseInt(match[1], 10),
    m: parseInt(match[2], 10),
    ampm: match[3].toUpperCase() === 'P' ? 'PM' : 'AM',
  };
}

function formatStartTime(h: number, m: number, ampm: 'AM' | 'PM'): string {
  return `${h}:${String(m).padStart(2, '0')} ${ampm === 'AM' ? 'A' : 'P'}`;
}

// ─── Inline Viewing Dropdown ──────────────────────────────────────────────────

const InlineViewingDropdown: React.FC<{
  current: number;
  onSelect: (min: number) => void;
}> = ({ current, onSelect }) => (
  <View style={dropdownStyles.container}>
    {(VIEWING_DURATIONS as readonly number[]).map((min) => {
      const active = min === current;
      return (
        <TouchableOpacity
          key={min}
          style={[dropdownStyles.option, active && dropdownStyles.optionActive]}
          onPress={() => onSelect(min)}
          activeOpacity={0.7}
        >
          <Text style={[dropdownStyles.optionText, active && dropdownStyles.optionTextActive]}>
            {min} min
          </Text>
          {active && <Text style={dropdownStyles.check}>✓</Text>}
        </TouchableOpacity>
      );
    })}
  </View>
);

// ─── Main Component ───────────────────────────────────────────────────────────

const RoutePropertyCard: React.FC<RoutePropertyCardProps> = ({
  property,
  index,
  routeDateLabel,
  onRemove,
  onUpdate,
}) => {
  const parsed = parseStartTime(property.startTime ?? '');

  const [showTimePicker,    setShowTimePicker]    = useState(false);
  const [showViewingPicker, setShowViewingPicker] = useState(false);

  const [timeH,    setTimeH]    = useState(parsed.h);
  const [timeM,    setTimeM]    = useState(parsed.m);
  const [timeAmpm, setTimeAmpm] = useState<'AM' | 'PM'>(parsed.ampm);
  const [viewingMin, setViewingMin] = useState(property.viewingMin ?? 30);

  // ── Sync from parent ONLY when no picker is open ─────────────────────────
  //
  // The problem in the original code: this useEffect ran on every
  // property.startTime change — including cascade updates coming *from*
  // this very card.  When the agent picks e.g. "4 PM", handleTimeChange
  // fires → parent cascades → new property prop arrives → useEffect fires →
  // local state gets reset to the new cascaded value for THIS card, which
  // happens to be the same as what the agent just picked so it looks fine…
  // EXCEPT for the first card whose time the agent is actively editing:
  // the cascade doesn't change its own startTime, but the parent re-render
  // still triggers the effect and snaps the picker columns back.
  //
  // Fix: skip the sync while either picker is open.  Once the agent closes
  // the picker, subsequent cascade pushes (from edits on OTHER cards) are
  // safe to accept.
  //
  useEffect(() => {
    if (showTimePicker || showViewingPicker) return; // agent is actively editing

    const p = parseStartTime(property.startTime ?? '');
    setTimeH(p.h);
    setTimeM(p.m);
    setTimeAmpm(p.ampm);
    setViewingMin(property.viewingMin ?? 30);
  }, [property.startTime, property.viewingMin, showTimePicker, showViewingPicker]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleTimeChange = (h: number, m: number, ampm: 'AM' | 'PM') => {
    setTimeH(h);
    setTimeM(m);
    setTimeAmpm(ampm);
    onUpdate?.({ ...property, startTime: formatStartTime(h, m, ampm) });
  };

  const handleViewingSelect = (min: number) => {
    setViewingMin(min);
    onUpdate?.({ ...property, viewingMin: min });
    setShowViewingPicker(false);
  };

  const displayTime = `${timeH}:${String(timeM).padStart(2, '0')} ${timeAmpm}`;

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.propertyNumber}>
          <Text style={styles.propertyNumberText}>{index + 1}</Text>
        </View>
        <View style={styles.headerCopy}>
          <Text style={styles.stopEyebrow}>STOP {index + 1}</Text>
          <Text style={styles.address}>{property.address}</Text>
        </View>
        <TouchableOpacity
          style={styles.removeBtn}
          onPress={() => onRemove(property)}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel={`Remove ${property.address} from route`}
        >
          <X size={17} color={colors.text.muted} strokeWidth={2.2} />
        </TouchableOpacity>
      </View>

      <View style={styles.statusRow}>
        <View style={styles.etaBadge}>
          <Clock3 size={12} color={colors.primary.default} strokeWidth={2.2} />
          <Text style={styles.etaText}>ETA {property.eta}</Text>
        </View>
        {!!routeDateLabel && (
          <View style={styles.dateBadge}>
            <CalendarDays size={12} color={colors.text.secondary} strokeWidth={2.2} />
            <Text style={styles.dateText}>{routeDateLabel}</Text>
          </View>
        )}
        {property.conflict && property.conflictLabel && (
          <ConflictBadge label={property.conflictLabel} type={property.conflict} />
        )}
      </View>

      <View style={styles.editorRow}>
        <View style={styles.editorField}>
          <Text style={styles.editorLabel}>SHOWING START</Text>
          <TouchableOpacity
            style={[styles.editorInput, showTimePicker && styles.editorInputActive]}
            onPress={() => {
              setShowTimePicker(true);
              setShowViewingPicker(false);
            }}
            activeOpacity={0.7}
          >
            <Clock3
              size={15}
              color={showTimePicker ? colors.primary.default : colors.text.secondary}
              strokeWidth={2.1}
            />
            <Text style={styles.editorInputText}>{displayTime}</Text>
            <ChevronDown size={14} color={colors.text.muted} strokeWidth={2.2} />
          </TouchableOpacity>
        </View>

        <View style={styles.editorField}>
          <Text style={styles.editorLabel}>VIEWING TIME</Text>
          <TouchableOpacity
            style={[styles.editorInput, showViewingPicker && styles.editorInputActive]}
            onPress={() => {
              setShowViewingPicker((value) => !value);
              setShowTimePicker(false);
            }}
            activeOpacity={0.7}
          >
            <Timer
              size={15}
              color={showViewingPicker ? colors.primary.default : colors.text.secondary}
              strokeWidth={2.1}
            />
            <Text style={styles.editorInputText}>{viewingMin} min</Text>
            <ChevronDown size={14} color={colors.text.muted} strokeWidth={2.2} />
          </TouchableOpacity>
        </View>
      </View>

      <TimePickerClock
        visible={showTimePicker}
        initialHour={timeH}
        initialMinute={timeM}
        initialAmpm={timeAmpm}
        title="SHOWING START TIME"
        onCancel={() => setShowTimePicker(false)}
        onConfirm={(h, m, ampm) => {
          handleTimeChange(h, m, ampm);
          setShowTimePicker(false);
        }}
      />

      {showViewingPicker && (
        <InlineViewingDropdown
          current={viewingMin}
          onSelect={handleViewingSelect}
        />
      )}
    </View>
  );
};

export default RoutePropertyCard;

// ─── Card Styles ──────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.background.surface,
    borderRadius: radius.card,
    borderWidth: border.width.thin,
    borderColor: colors.border.default,
    padding: spacing['2xl'],
    marginBottom: spacing.xl,
    ...shadows.card,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  propertyNumber: {
    width: 36,
    height: 36,
    borderRadius: radius.card,
    backgroundColor: colors.primary.default,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.lg,
  },
  propertyNumberText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.extraBold,
    color: colors.text.inverse,
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
  },
  stopEyebrow: {
    fontSize: 8,
    lineHeight: 11,
    color: colors.primary.default,
    fontWeight: fontWeight.extraBold,
    letterSpacing: 0.65,
  },
  address: {
    fontSize: fontSize.md,
    lineHeight: 19,
    fontWeight: fontWeight.bold,
    color: colors.text.primary,
    marginTop: 1,
  },
  removeBtn: {
    width: 30,
    height: 30,
    borderRadius: radius.item,
    backgroundColor: colors.background.screen,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.md,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  etaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.primary.light,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  etaText: {
    fontSize: fontSize.tiny,
    lineHeight: 14,
    color: colors.primary.default,
    fontWeight: fontWeight.bold,
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.background.screen,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  dateText: {
    fontSize: fontSize.tiny,
    lineHeight: 14,
    color: colors.text.secondary,
    fontWeight: fontWeight.medium,
  },
  editorRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing['2xl'],
  },
  editorField: {
    flex: 1,
    minWidth: 0,
  },
  editorLabel: {
    fontSize: 8,
    lineHeight: 11,
    color: colors.text.muted,
    fontWeight: fontWeight.extraBold,
    marginBottom: spacing.sm,
    letterSpacing: 0.45,
  },
  editorInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: border.width.thin,
    borderColor: colors.border.default,
    borderRadius: radius.item,
    minHeight: 42,
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.background.screen,
  },
  editorInputActive: {
    borderColor: colors.primary.default,
    backgroundColor: colors.primary.light,
    ...shadows.sm,
    shadowColor: colors.primary.default,
  },
  editorInputText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.text.primary,
    fontWeight: fontWeight.bold,
  },
});

// ─── Dropdown Styles ──────────────────────────────────────────────────────────

const dropdownStyles = StyleSheet.create({
  container: {
    marginTop: spacing.md,
    borderWidth: border.width.thin,
    borderColor: colors.border.default,
    borderRadius: radius.item,
    overflow: 'hidden',
    backgroundColor: colors.background.surface,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing['2xl'],
    paddingVertical: spacing.xl,
    borderBottomWidth: border.width.thin,
    borderBottomColor: colors.border.default,
  },
  optionActive: {
    backgroundColor: colors.primary.default,
  },
  optionText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text.primary,
  },
  optionTextActive: {
    color: colors.text.inverse,
    fontWeight: fontWeight.bold,
  },
  check: {
    fontSize: fontSize.md,
    color: colors.text.inverse,
    fontWeight: fontWeight.bold,
  },
});







// import React, { useRef, useState, useEffect, useCallback, memo } from 'react';
// import {
//   View,
//   Text,
//   TouchableOpacity,
//   StyleSheet,
//   ScrollView,
// } from 'react-native';
// import {
//   ChevronDown,
//   Clock3,
//   Timer,
//   X,
// } from 'lucide-react-native';
// import { Property } from '../../types';
// import { colors, shadow } from '../../theme';
// import { ConflictBadge } from './Atoms';
// import { VIEWING_DURATIONS } from '../../constants';

// interface RoutePropertyCardProps {
//   property: Property;
//   index: number;
//   onRemove: (property: Property) => void;
//   onUpdate?: (updated: Property) => void;
// }

// // ─── Helpers ──────────────────────────────────────────────────────────────────

// function parseStartTime(raw: string | undefined | null): { h: number; m: number; ampm: 'AM' | 'PM' } {
//   if (!raw) return { h: 10, m: 0, ampm: 'AM' };
//   const match = raw.match(/(\d+):(\d+)\s*([AP])/i);
//   if (!match) return { h: 10, m: 0, ampm: 'AM' };
//   return {
//     h: parseInt(match[1], 10),
//     m: parseInt(match[2], 10),
//     ampm: match[3].toUpperCase() === 'P' ? 'PM' : 'AM',
//   };
// }

// function formatStartTime(h: number, m: number, ampm: 'AM' | 'PM'): string {
//   return `${h}:${String(m).padStart(2, '0')} ${ampm === 'AM' ? 'A' : 'P'}`;
// }

// const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);   // 1–12
// const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5); // 0,5,10…55
// const ITEM_H = 40;

// // ─── Inline Scroll Column ─────────────────────────────────────────────────────

// function ScrollColumn<T extends number | string>({
//   items,
//   selected,
//   onSelect,
//   label,
// }: {
//   items: T[];
//   selected: T;
//   onSelect: (val: T) => void;
//   label: (v: T) => string;
// }) {
//   const scrollRef = useRef<ScrollView>(null);
//   // Only scroll-to-selected on initial mount, not on every selection change.
//   const hasLaidOut = useRef(false);

//   const handleLayout = useCallback(() => {
//     if (hasLaidOut.current) return;
//     hasLaidOut.current = true;
//     const idx = items.findIndex((i) => i === selected);
//     if (idx >= 0) {
//       scrollRef.current?.scrollTo({ y: idx * ITEM_H, animated: false });
//     }
//   }, []); // intentionally empty — runs once on mount

//   return (
//     <ScrollView
//       ref={scrollRef}
//       style={spinnerStyles.col}
//       showsVerticalScrollIndicator={false}
//       snapToInterval={ITEM_H}
//       decelerationRate="fast"
//       onLayout={handleLayout}
//     >
//       {items.map((item) => {
//         const active = item === selected;
//         return (
//           <TouchableOpacity
//             key={String(item)}
//             style={[spinnerStyles.item, active && spinnerStyles.itemActive]}
//             onPress={() => onSelect(item)}
//             activeOpacity={0.7}
//           >
//             <Text style={[spinnerStyles.itemText, active && spinnerStyles.itemTextActive]}>
//               {label(item)}
//             </Text>
//           </TouchableOpacity>
//         );
//       })}
//     </ScrollView>
//   );
// }

// // ─── Inline Time Picker ───────────────────────────────────────────────────────

// const InlineTimePicker: React.FC<{
//   h: number;
//   m: number;
//   ampm: 'AM' | 'PM';
//   onChange: (h: number, m: number, ampm: 'AM' | 'PM') => void;
// }> = memo(({ h, m, ampm, onChange }) => (
//   <View style={spinnerStyles.picker}>
//     <ScrollColumn
//       items={HOURS}
//       selected={h}
//       onSelect={(val) => onChange(val, m, ampm)}
//       label={(v) => String(v)}
//     />
//     <View style={spinnerStyles.divider} />
//     <ScrollColumn
//       items={MINUTES}
//       selected={m}
//       onSelect={(val) => onChange(h, val, ampm)}
//       label={(v) => String(v).padStart(2, '0')}
//     />
//     <View style={spinnerStyles.divider} />
//     {/* AM / PM column */}
//     <View style={spinnerStyles.col}>
//       {(['AM', 'PM'] as const).map((period) => {
//         const active = period === ampm;
//         return (
//           <TouchableOpacity
//             key={period}
//             style={[spinnerStyles.item, active && spinnerStyles.itemActive]}
//             onPress={() => onChange(h, m, period)}
//             activeOpacity={0.7}
//           >
//             <Text style={[spinnerStyles.itemText, active && spinnerStyles.itemTextActive]}>
//               {period}
//             </Text>
//           </TouchableOpacity>
//         );
//       })}
//     </View>
//   </View>
// ));

// // ─── Inline Viewing Dropdown ──────────────────────────────────────────────────

// const InlineViewingDropdown: React.FC<{
//   current: number;
//   onSelect: (min: number) => void;
// }> = ({ current, onSelect }) => (
//   <View style={dropdownStyles.container}>
//     {(VIEWING_DURATIONS as readonly number[]).map((min) => {
//       const active = min === current;
//       return (
//         <TouchableOpacity
//           key={min}
//           style={[dropdownStyles.option, active && dropdownStyles.optionActive]}
//           onPress={() => onSelect(min)}
//           activeOpacity={0.7}
//         >
//           <Text style={[dropdownStyles.optionText, active && dropdownStyles.optionTextActive]}>
//             {min} min
//           </Text>
//           {active && <Text style={dropdownStyles.check}>✓</Text>}
//         </TouchableOpacity>
//       );
//     })}
//   </View>
// );

// // ─── Main Component ───────────────────────────────────────────────────────────

// const RoutePropertyCard: React.FC<RoutePropertyCardProps> = ({
//   property,
//   index,
//   onRemove,
//   onUpdate,
// }) => {
//   const parsed = parseStartTime(property.startTime ?? '');

//   const [showTimePicker,    setShowTimePicker]    = useState(false);
//   const [showViewingPicker, setShowViewingPicker] = useState(false);

//   const [timeH,    setTimeH]    = useState(parsed.h);
//   const [timeM,    setTimeM]    = useState(parsed.m);
//   const [timeAmpm, setTimeAmpm] = useState<'AM' | 'PM'>(parsed.ampm);
//   const [viewingMin, setViewingMin] = useState(property.viewingMin ?? 30);

//   // ── Sync from parent ONLY when no picker is open ─────────────────────────
//   //
//   // The problem in the original code: this useEffect ran on every
//   // property.startTime change — including cascade updates coming *from*
//   // this very card.  When the agent picks e.g. "4 PM", handleTimeChange
//   // fires → parent cascades → new property prop arrives → useEffect fires →
//   // local state gets reset to the new cascaded value for THIS card, which
//   // happens to be the same as what the agent just picked so it looks fine…
//   // EXCEPT for the first card whose time the agent is actively editing:
//   // the cascade doesn't change its own startTime, but the parent re-render
//   // still triggers the effect and snaps the picker columns back.
//   //
//   // Fix: skip the sync while either picker is open.  Once the agent closes
//   // the picker, subsequent cascade pushes (from edits on OTHER cards) are
//   // safe to accept.
//   //
//   useEffect(() => {
//     if (showTimePicker || showViewingPicker) return; // agent is actively editing

//     const p = parseStartTime(property.startTime ?? '');
//     setTimeH(p.h);
//     setTimeM(p.m);
//     setTimeAmpm(p.ampm);
//     setViewingMin(property.viewingMin ?? 30);
//   }, [property.startTime, property.viewingMin, showTimePicker, showViewingPicker]);

//   // ── Handlers ─────────────────────────────────────────────────────────────

//   const handleTimeChange = (h: number, m: number, ampm: 'AM' | 'PM') => {
//     setTimeH(h);
//     setTimeM(m);
//     setTimeAmpm(ampm);
//     onUpdate?.({ ...property, startTime: formatStartTime(h, m, ampm) });
//   };

//   const handleViewingSelect = (min: number) => {
//     setViewingMin(min);
//     onUpdate?.({ ...property, viewingMin: min });
//     setShowViewingPicker(false);
//   };

//   const displayTime = `${timeH}:${String(timeM).padStart(2, '0')} ${timeAmpm}`;

//   return (
//     <View style={styles.card}>
//       <View style={styles.headerRow}>
//         <View style={styles.propertyNumber}>
//           <Text style={styles.propertyNumberText}>{index + 1}</Text>
//         </View>
//         <View style={styles.headerCopy}>
//           <Text style={styles.stopEyebrow}>STOP {index + 1}</Text>
//           <Text style={styles.address}>{property.address}</Text>
//         </View>
//         <TouchableOpacity
//           style={styles.removeBtn}
//           onPress={() => onRemove(property)}
//           activeOpacity={0.7}
//           hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
//           accessibilityRole="button"
//           accessibilityLabel={`Remove ${property.address} from route`}
//         >
//           <X size={17} color={colors.textMuted} strokeWidth={2.2} />
//         </TouchableOpacity>
//       </View>

//       <View style={styles.statusRow}>
//         <View style={styles.etaBadge}>
//           <Clock3 size={12} color={colors.blue} strokeWidth={2.2} />
//           <Text style={styles.etaText}>ETA {property.eta}</Text>
//         </View>
//         {property.conflict && property.conflictLabel && (
//           <ConflictBadge label={property.conflictLabel} type={property.conflict} />
//         )}
//       </View>

//       <View style={styles.editorRow}>
//         <View style={styles.editorField}>
//           <Text style={styles.editorLabel}>SHOWING START</Text>
//           <TouchableOpacity
//             style={[styles.editorInput, showTimePicker && styles.editorInputActive]}
//             onPress={() => {
//               setShowTimePicker((value) => !value);
//               setShowViewingPicker(false);
//             }}
//             activeOpacity={0.7}
//           >
//             <Clock3
//               size={15}
//               color={showTimePicker ? colors.blue : colors.textSecondary}
//               strokeWidth={2.1}
//             />
//             <Text style={styles.editorInputText}>{displayTime}</Text>
//             <ChevronDown size={14} color={colors.textMuted} strokeWidth={2.2} />
//           </TouchableOpacity>
//         </View>

//         <View style={styles.editorField}>
//           <Text style={styles.editorLabel}>VIEWING TIME</Text>
//           <TouchableOpacity
//             style={[styles.editorInput, showViewingPicker && styles.editorInputActive]}
//             onPress={() => {
//               setShowViewingPicker((value) => !value);
//               setShowTimePicker(false);
//             }}
//             activeOpacity={0.7}
//           >
//             <Timer
//               size={15}
//               color={showViewingPicker ? colors.blue : colors.textSecondary}
//               strokeWidth={2.1}
//             />
//             <Text style={styles.editorInputText}>{viewingMin} min</Text>
//             <ChevronDown size={14} color={colors.textMuted} strokeWidth={2.2} />
//           </TouchableOpacity>
//         </View>
//       </View>

//       {showTimePicker && (
//         <InlineTimePicker
//           h={timeH}
//           m={timeM}
//           ampm={timeAmpm}
//           onChange={handleTimeChange}
//         />
//       )}

//       {showViewingPicker && (
//         <InlineViewingDropdown
//           current={viewingMin}
//           onSelect={handleViewingSelect}
//         />
//       )}
//     </View>
//   );
// };

// export default RoutePropertyCard;

// // ─── Card Styles ──────────────────────────────────────────────────────────────

// const styles = StyleSheet.create({
//   card: {
//     backgroundColor: colors.white,
//     borderRadius: 18,
//     borderWidth: 1,
//     borderColor: '#E3EAF3',
//     padding: 14,
//     marginBottom: 12,
//     ...shadow.card,
//   },
//   headerRow: {
//     flexDirection: 'row',
//     alignItems: 'flex-start',
//   },
//   propertyNumber: {
//     width: 36,
//     height: 36,
//     borderRadius: 12,
//     backgroundColor: colors.blue,
//     alignItems: 'center',
//     justifyContent: 'center',
//     marginRight: 10,
//   },
//   propertyNumberText: {
//     fontSize: 13,
//     fontWeight: '800',
//     color: colors.white,
//   },
//   headerCopy: {
//     flex: 1,
//     minWidth: 0,
//   },
//   stopEyebrow: {
//     fontSize: 8,
//     lineHeight: 11,
//     color: colors.blue,
//     fontWeight: '800',
//     letterSpacing: 0.65,
//   },
//   address: {
//     fontSize: 14,
//     lineHeight: 19,
//     fontWeight: '700',
//     color: colors.textPrimary,
//     marginTop: 1,
//   },
//   removeBtn: {
//     width: 30,
//     height: 30,
//     borderRadius: 10,
//     backgroundColor: '#F8FAFC',
//     alignItems: 'center',
//     justifyContent: 'center',
//     marginLeft: 8,
//   },
//   statusRow: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     flexWrap: 'wrap',
//     gap: 6,
//     marginTop: 10,
//   },
//   etaBadge: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 5,
//     borderRadius: 999,
//     backgroundColor: colors.blueLight,
//     paddingHorizontal: 8,
//     paddingVertical: 4,
//   },
//   etaText: {
//     fontSize: 10,
//     lineHeight: 14,
//     color: colors.blue,
//     fontWeight: '700',
//   },
//   editorRow: {
//     flexDirection: 'row',
//     gap: 8,
//     marginTop: 13,
//   },
//   editorField: {
//     flex: 1,
//     minWidth: 0,
//   },
//   editorLabel: {
//     fontSize: 8,
//     lineHeight: 11,
//     color: colors.textMuted,
//     fontWeight: '800',
//     marginBottom: 5,
//     letterSpacing: 0.45,
//   },
//   editorInput: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 6,
//     borderWidth: 1,
//     borderColor: colors.border,
//     borderRadius: 11,
//     minHeight: 42,
//     paddingHorizontal: 9,
//     backgroundColor: '#F8FAFC',
//   },
//   editorInputActive: {
//     borderColor: colors.blue,
//     backgroundColor: colors.blueLight,
//   },
//   editorInputText: {
//     flex: 1,
//     fontSize: 12,
//     color: colors.textPrimary,
//     fontWeight: '700',
//   },
// });

// // ─── Spinner Styles ───────────────────────────────────────────────────────────

// const spinnerStyles = StyleSheet.create({
//   picker: {
//     flexDirection: 'row',
//     marginTop: 8,
//     borderWidth: 1,
//     borderColor: colors.border,
//     borderRadius: 10,
//     overflow: 'hidden',
//     backgroundColor: colors.white,
//     height: ITEM_H * 3,
//   },
//   col: {
//     flex: 1,
//     height: ITEM_H * 3,
//   },
//   divider: {
//     width: 1,
//     backgroundColor: colors.border,
//   },
//   item: {
//     height: ITEM_H,
//     alignItems: 'center',
//     justifyContent: 'center',
//     backgroundColor: colors.white,
//   },
//   itemActive: {
//     backgroundColor: colors.blue,
//   },
//   itemText: {
//     fontSize: 15,
//     fontWeight: '600',
//     color: colors.textSecondary,
//   },
//   itemTextActive: {
//     color: colors.white,
//   },
// });

// // ─── Dropdown Styles ──────────────────────────────────────────────────────────

// const dropdownStyles = StyleSheet.create({
//   container: {
//     marginTop: 8,
//     borderWidth: 1,
//     borderColor: colors.border,
//     borderRadius: 10,
//     overflow: 'hidden',
//     backgroundColor: colors.white,
//   },
//   option: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'space-between',
//     paddingHorizontal: 14,
//     paddingVertical: 11,
//     borderBottomWidth: 1,
//     borderBottomColor: colors.border,
//   },
//   optionActive: {
//     backgroundColor: colors.blue,
//   },
//   optionText: {
//     fontSize: 14,
//     fontWeight: '500',
//     color: colors.textPrimary,
//   },
//   optionTextActive: {
//     color: colors.white,
//     fontWeight: '700',
//   },
//   check: {
//     fontSize: 14,
//     color: colors.white,
//     fontWeight: '700',
//   },
// });
