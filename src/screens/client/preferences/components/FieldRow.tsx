import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Animated,
  PanResponder,
  StyleSheet,
} from "react-native";
import { fieldRowStyles as S } from "../styles/fieldRowStyles";
import { Colors } from "../constants/theme";
import { ChipSelector } from "./ChipSelector";
import { RangeInput } from "./RangeInput";
import { MultiValueTextInput } from "./MultiValueTextInput";
import { LocationPickerInput } from "./LocationPickerInput";
import { formatAnswer, hasAnswer } from "../utils/preferenceHelpers";
import type { FieldDef, AnswerVal, RangeVal, Answers } from "../types/preferences";

interface Props {
  field: FieldDef;
  value: AnswerVal | undefined;
  answers?: Answers;
  province?: string;
  onChange: (v: AnswerVal) => void;
  isLast: boolean;
  onDragStart: (field: FieldDef) => void;
  onDragMove?: (pageX: number, pageY: number) => void;
  onDragEnd?: () => void;
  onHandleTouch?: (touching: boolean) => void;
  isDragging?: boolean;
  isRequired?: boolean;
  showRequiredError?: boolean;
  /** Bubbled up to the screen's ScrollView so it can bring this row to the
   *  top before a location field opens its keyboard/dropdown. */
  onRequestScrollToField?: (pageY: number) => void;
}

function fmtMoney(v: number): string {
  if (v >= 1_000_000)
    return `$${(v / 1_000_000).toFixed(v % 1_000_000 === 0 ? 0 : 1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v}`;
}

const BUDGET_CONFIG = {
  min: 0,
  max: 4_000_000,
  step: 50_000,
  minLabel: "$0",
  maxLabel: "Max",
  tickMarks: [
    { value: 0, label: "$0" },
    { value: 450_000, label: "$450K" },
    { value: 850_000, label: "$850K" },
    { value: 1_800_000, label: "$1.8M" },
    { value: 3_800_000, label: "$3.8M" },
    { value: 4_000_000, label: "Max" },
  ],
  formatLabel: (v: number, isLow: boolean, min: number, max: number) => {
    if (isLow && v === min) return "$0";
    if (!isLow && v === max) return "Max";
    return fmtMoney(v);
  },
};

const LOT_CONFIG = {
  min: 0,
  max: 100,
  step: 5,
  minLabel: "Unspecified",
  maxLabel: "Max",
  tickMarks: [
    { value: 0, label: "0" },
    { value: 20, label: "20" },
    { value: 40, label: "40" },
    { value: 60, label: "60" },
    { value: 80, label: "80" },
    { value: 100, label: "Max" },
  ],
};

const SCHOOL_CONFIG = {
  min: 0,
  max: 10,
  step: 1,
  minLabel: "0",
  maxLabel: "10",
  tickMarks: [
    { value: 0, label: "0" },
    { value: 2, label: "2" },
    { value: 4, label: "4" },
    { value: 6, label: "6" },
    { value: 8, label: "8" },
    { value: 10, label: "10" },
  ],
};

function getRangeConfig(key: string) {
  if (key === "budget_range") return BUDGET_CONFIG;
  if (key === "lot_front" || key === "lot_depth") return LOT_CONFIG;
  if (key === "school_rating") return SCHOOL_CONFIG;
  return {
    min: 0,
    max: 100,
    step: 1,
    minLabel: "Unspecified",
    maxLabel: "Max",
    tickMarks: undefined,
  };
}

export function FieldRow({
  field,
  value,
  answers = {},
  province,
  onChange,
  isLast,
  onDragStart,
  onDragMove,
  onDragEnd,
  onHandleTouch,
  isDragging = false,
  isRequired = false,
  showRequiredError = false,
  onRequestScrollToField,
}: Readonly<Props>) {
  const [open, setOpen] = useState(false);
  const anim = useRef(new Animated.Value(0)).current;
  const dragScale = useRef(new Animated.Value(1)).current;
  const isDraggingRef = useRef(false);
  const rowRef = useRef<View>(null);

  const onDragStartRef = useRef(onDragStart);
  const onDragMoveRef = useRef(onDragMove);
  const onDragEndRef = useRef(onDragEnd);
  const onHandleTouchRef = useRef(onHandleTouch);

  useEffect(() => {
    onDragStartRef.current = onDragStart;
    onDragMoveRef.current = onDragMove;
    onDragEndRef.current = onDragEnd;
    onHandleTouchRef.current = onHandleTouch;
  });

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (evt) => {
        isDraggingRef.current = true;
        const { pageX, pageY } = evt.nativeEvent;
        onHandleTouchRef.current?.(true);
        Animated.spring(dragScale, {
          toValue: 1.04,
          useNativeDriver: true,
          friction: 7,
        }).start();
        onDragStartRef.current(field);
        onDragMoveRef.current?.(pageX, pageY);
      },
      onPanResponderMove: (evt) => {
        onDragMoveRef.current?.(evt.nativeEvent.pageX, evt.nativeEvent.pageY);
      },
      onPanResponderRelease: () => {
        endDrag();
      },
      onPanResponderTerminate: () => {
        endDrag();
      },
    }),
  ).current;

  function handleHandleTouchStart() {
    onHandleTouchRef.current?.(true);
  }

  function handleHandleTouchEnd() {
    // Keep scroll locked while an active drag is in progress.
    if (!isDraggingRef.current) {
      onHandleTouchRef.current?.(false);
    }
  }

  function endDrag() {
    onHandleTouchRef.current?.(false);
    Animated.spring(dragScale, { toValue: 1, useNativeDriver: true }).start();
    if (isDraggingRef.current) {
      onDragEndRef.current?.();
    }
    isDraggingRef.current = false;
  }

  const prevShowError = useRef(false);

  if (showRequiredError && !prevShowError.current && !open) {
    prevShowError.current = true;
    setTimeout(() => {
      setOpen(true);
      Animated.timing(anim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: false,
      }).start();
    }, 0);
  }
  if (!showRequiredError) {
    prevShowError.current = false;
  }

  function toggle() {
    const next = !open;
    Animated.timing(anim, {
      toValue: next ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
    setOpen(next);
  }

  function selectOption(opt: string) {
    if (field.type === "multi") {
      const cur = (value as string[]) ?? [];
      const next = cur.includes(opt)
        ? cur.filter((v) => v !== opt)
        : [...cur, opt];
      onChange(next);
    } else {
      onChange(opt);
      Animated.timing(anim, {
        toValue: 0,
        duration: 160,
        useNativeDriver: false,
      }).start();
      setOpen(false);
    }
  }

  function isSelected(opt: string): boolean {
    if (field.type === "multi")
      return ((value as string[]) ?? []).includes(opt);
    return value === opt;
  }

  /**
   * Measures this row's own on-screen position and forwards it to the parent
   * ScrollView (via CollapsibleSectionCard → PreferencesFormScreen) so it can
   * scroll the field to the top before the location picker's keyboard opens.
   */
  const handleFieldFocusScroll = useCallback(() => {
    rowRef.current?.measureInWindow((_x, y) => {
      onRequestScrollToField?.(y);
    });
  }, [onRequestScrollToField]);

  const answered = hasAnswer(value);
  const summary = formatAnswer(value, field.valueType);
  const isLocationField = ['area', 'municipality', 'community'].includes(field.key);
  const maxH = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, isLocationField ? 680 : 500],
  });
  const opac = anim.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [0, 0, 1],
  });
  const rot = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "90deg"],
  });

  const rangeValue = (value as RangeVal) ?? { from: "", to: "" };

  const selectedAreas = (answers.area as string[] | undefined) ?? [];
  const selectedMunicipalities =
    (answers.municipality as string[] | undefined) ?? [];

  return (
    <Animated.View
      ref={rowRef}
      style={[
        S.row,
        !isLast && S.rowBorder,
        { transform: [{ scale: dragScale }] },
        showRequiredError && styles.rowError,
        isDragging && styles.rowPlaceholder,
      ]}
    >
      <View style={S.rowInner}>
        <View
          {...panResponder.panHandlers}
          style={S.dragHandle}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          onTouchStart={handleHandleTouchStart}
          onTouchEnd={handleHandleTouchEnd}
          onTouchCancel={handleHandleTouchEnd}
        >
          <Text style={S.dragHandleIcon}>⠿</Text>
        </View>


        <TouchableOpacity
          activeOpacity={0.65}
          onPress={toggle}
          style={S.rowHeader}
        >
          <View style={styles.rowLabelWrap}>
            <View style={styles.labelRow}>
              <Text style={S.rowLabel}>{field.label}</Text>
              {isRequired && <Text style={styles.requiredStar}> *</Text>}
            </View>
            <Text style={styles.rowSubLabel}>{field.subLabel}</Text>
            {showRequiredError && (
              <Text style={styles.errorHint}>This field is required</Text>
            )}
          </View>

          <View style={styles.rowRight}>
            {answered && !open && (
              <Text style={S.rowValue} numberOfLines={1}>
                {summary}
              </Text>
            )}
            <Animated.Text
              style={[S.rowChevron, { transform: [{ rotate: rot }] }]}
            >
              ›
            </Animated.Text>
          </View>
        </TouchableOpacity>
      </View>

      <Animated.View
        style={{ maxHeight: maxH, opacity: opac, overflow: "hidden" }}
      >
        <View style={S.rowBody}>
          {field.type === "price_input" && (
            <TextInput
              style={[S.textInput, showRequiredError && styles.inputError]}
              placeholder={
                field.label === "Min Budget" ? "e.g. $500,000" : "e.g. $900,000"
              }
              placeholderTextColor={Colors.textMuted}
              value={(value as string) ?? ""}
              onChangeText={(t) => onChange(t)}
              keyboardType="numeric"
              returnKeyType="done"
              onSubmitEditing={toggle}
            />
          )}

          {(field.type === "price_range" || field.type === "range") &&
            (() => {
              const cfg = getRangeConfig(field.key);
              return (
                <RangeInput
                  value={rangeValue}
                  unit={field.key === "budget_range" ? undefined : field.unit}
                  onChange={onChange}
                  min={cfg.min}
                  max={cfg.max}
                  step={cfg.step}
                  minLabel={cfg.minLabel}
                  maxLabel={cfg.maxLabel}
                  tickMarks={cfg.tickMarks}
                  {...(field.key === "budget_range"
                    ? { formatLabel: BUDGET_CONFIG.formatLabel }
                    : {})}
                />
              );
            })()}

          {field.key === "area" && (
            <LocationPickerInput
              kind="areas"
              values={(value as string[]) ?? []}
              onChange={(vals) => onChange(vals)}
              province={province}
              hasError={showRequiredError}
              onFocusScrollRequest={handleFieldFocusScroll}
            />
          )}

          {field.key === "municipality" && (
            <LocationPickerInput
              kind="municipalities"
              values={(value as string[]) ?? []}
              onChange={(vals) => onChange(vals)}
              province={province}
              parentAreas={selectedAreas}
              hasError={showRequiredError}
              onFocusScrollRequest={handleFieldFocusScroll}
            />
          )}

          {field.key === "community" && (
            <LocationPickerInput
              kind="communities"
              values={(value as string[]) ?? []}
              onChange={(vals) => onChange(vals)}
              province={province}
              parentAreas={selectedAreas}
              parentMunicipalities={selectedMunicipalities}
              hasError={showRequiredError}
              onFocusScrollRequest={handleFieldFocusScroll}
            />
          )}

          {field.type === "multi_text" && field.key !== "area" && (
            <MultiValueTextInput
              values={(value as string[]) ?? []}
              onChange={(vals) => onChange(vals)}
              placeholder="e.g. Downtown, Midtown"
              hasError={showRequiredError}
            />
          )}

          {(field.type === "single" || field.type === "multi") &&
            field.options &&
            !["municipality", "community"].includes(field.key) && (
              <ChipSelector
                options={field.options}
                isMulti={field.type === "multi"}
                isSelected={isSelected}
                onSelect={selectOption}
              />
            )}
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  rowLabelWrap: {
    flex: 1,
    flexDirection: "column",
    justifyContent: "center",
    marginRight: 8,
  },
  rowRight: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 0,
    maxWidth: 150,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "nowrap",
  },
  rowSubLabel: {
    fontSize: 12,
    color: "#9ca3af",
    marginTop: 1,
    fontWeight: "400",
  },
  rowError: {
    borderLeftWidth: 3,
    borderLeftColor: "#E53E3E",
  },
  rowPlaceholder: {
    opacity: 0.35,
    backgroundColor: Colors.subtle,
  },
  requiredStar: {
    color: "#E53E3E",
    fontSize: 14,
    fontWeight: "700",
  },
  errorHint: {
    color: "#C53030",
    fontSize: 11,
    fontWeight: "500",
    marginTop: 2,
  },
  inputError: {
    borderColor: "#FC8181",
    borderWidth: 1.5,
  },
});








// import React, { useState, useRef, useEffect } from "react";
// import {
//   View,
//   Text,
//   TouchableOpacity,
//   TextInput,
//   Animated,
//   PanResponder,
//   StyleSheet,
// } from "react-native";
// import { fieldRowStyles as S } from "../styles/fieldRowStyles";
// import { Colors } from "../constants/theme";
// import { ChipSelector } from "./ChipSelector";
// import { RangeInput } from "./RangeInput";
// import { MultiValueTextInput } from "./MultiValueTextInput";
// import { LocationPickerInput } from "./LocationPickerInput";
// import { formatAnswer, hasAnswer } from "../utils/preferenceHelpers";
// import type { FieldDef, AnswerVal, RangeVal, Answers } from "../types/preferences";

// interface Props {
//   field: FieldDef;
//   value: AnswerVal | undefined;
//   answers?: Answers;
//   province?: string;
//   onChange: (v: AnswerVal) => void;
//   isLast: boolean;
//   onDragStart: (field: FieldDef) => void;
//   onDragMove?: (pageX: number, pageY: number) => void;
//   onDragEnd?: () => void;
//   onHandleTouch?: (touching: boolean) => void;
//   isDragging?: boolean;
//   isRequired?: boolean;
//   showRequiredError?: boolean;
// }

// function fmtMoney(v: number): string {
//   if (v >= 1_000_000)
//     return `$${(v / 1_000_000).toFixed(v % 1_000_000 === 0 ? 0 : 1)}M`;
//   if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
//   return `$${v}`;
// }

// const BUDGET_CONFIG = {
//   min: 0,
//   max: 4_000_000,
//   step: 50_000,
//   minLabel: "$0",
//   maxLabel: "Max",
//   tickMarks: [
//     { value: 0, label: "$0" },
//     { value: 450_000, label: "$450K" },
//     { value: 850_000, label: "$850K" },
//     { value: 1_800_000, label: "$1.8M" },
//     { value: 3_800_000, label: "$3.8M" },
//     { value: 4_000_000, label: "Max" },
//   ],
//   formatLabel: (v: number, isLow: boolean, min: number, max: number) => {
//     if (isLow && v === min) return "$0";
//     if (!isLow && v === max) return "Max";
//     return fmtMoney(v);
//   },
// };

// const LOT_CONFIG = {
//   min: 0,
//   max: 100,
//   step: 5,
//   minLabel: "Unspecified",
//   maxLabel: "Max",
//   tickMarks: [
//     { value: 0, label: "0" },
//     { value: 20, label: "20" },
//     { value: 40, label: "40" },
//     { value: 60, label: "60" },
//     { value: 80, label: "80" },
//     { value: 100, label: "Max" },
//   ],
// };

// const SCHOOL_CONFIG = {
//   min: 0,
//   max: 10,
//   step: 1,
//   minLabel: "0",
//   maxLabel: "10",
//   tickMarks: [
//     { value: 0, label: "0" },
//     { value: 2, label: "2" },
//     { value: 4, label: "4" },
//     { value: 6, label: "6" },
//     { value: 8, label: "8" },
//     { value: 10, label: "10" },
//   ],
// };

// function getRangeConfig(key: string) {
//   if (key === "budget_range") return BUDGET_CONFIG;
//   if (key === "lot_front" || key === "lot_depth") return LOT_CONFIG;
//   if (key === "school_rating") return SCHOOL_CONFIG;
//   return {
//     min: 0,
//     max: 100,
//     step: 1,
//     minLabel: "Unspecified",
//     maxLabel: "Max",
//     tickMarks: undefined,
//   };
// }

// export function FieldRow({
//   field,
//   value,
//   answers = {},
//   province,
//   onChange,
//   isLast,
//   onDragStart,
//   onDragMove,
//   onDragEnd,
//   onHandleTouch,
//   isDragging = false,
//   isRequired = false,
//   showRequiredError = false,
// }: Readonly<Props>) {
//   const [open, setOpen] = useState(false);
//   const anim = useRef(new Animated.Value(0)).current;
//   const dragScale = useRef(new Animated.Value(1)).current;
//   const isDraggingRef = useRef(false);

//   const onDragStartRef = useRef(onDragStart);
//   const onDragMoveRef = useRef(onDragMove);
//   const onDragEndRef = useRef(onDragEnd);
//   const onHandleTouchRef = useRef(onHandleTouch);

//   useEffect(() => {
//     onDragStartRef.current = onDragStart;
//     onDragMoveRef.current = onDragMove;
//     onDragEndRef.current = onDragEnd;
//     onHandleTouchRef.current = onHandleTouch;
//   });

//   const panResponder = useRef(
//     PanResponder.create({
//       onStartShouldSetPanResponder: () => true,
//       onMoveShouldSetPanResponder: () => true,
//       onPanResponderTerminationRequest: () => false,
//       onPanResponderGrant: (evt) => {
//         isDraggingRef.current = true;
//         const { pageX, pageY } = evt.nativeEvent;
//         onHandleTouchRef.current?.(true);
//         Animated.spring(dragScale, {
//           toValue: 1.04,
//           useNativeDriver: true,
//           friction: 7,
//         }).start();
//         onDragStartRef.current(field);
//         onDragMoveRef.current?.(pageX, pageY);
//       },
//       onPanResponderMove: (evt) => {
//         onDragMoveRef.current?.(evt.nativeEvent.pageX, evt.nativeEvent.pageY);
//       },
//       onPanResponderRelease: () => {
//         endDrag();
//       },
//       onPanResponderTerminate: () => {
//         endDrag();
//       },
//     }),
//   ).current;

//   function handleHandleTouchStart() {
//     onHandleTouchRef.current?.(true);
//   }

//   function handleHandleTouchEnd() {
//     // Keep scroll locked while an active drag is in progress.
//     if (!isDraggingRef.current) {
//       onHandleTouchRef.current?.(false);
//     }
//   }

//   function endDrag() {
//     onHandleTouchRef.current?.(false);
//     Animated.spring(dragScale, { toValue: 1, useNativeDriver: true }).start();
//     if (isDraggingRef.current) {
//       onDragEndRef.current?.();
//     }
//     isDraggingRef.current = false;
//   }

//   const prevShowError = useRef(false);

//   if (showRequiredError && !prevShowError.current && !open) {
//     prevShowError.current = true;
//     setTimeout(() => {
//       setOpen(true);
//       Animated.timing(anim, {
//         toValue: 1,
//         duration: 200,
//         useNativeDriver: false,
//       }).start();
//     }, 0);
//   }
//   if (!showRequiredError) {
//     prevShowError.current = false;
//   }

//   function toggle() {
//     const next = !open;
//     Animated.timing(anim, {
//       toValue: next ? 1 : 0,
//       duration: 200,
//       useNativeDriver: false,
//     }).start();
//     setOpen(next);
//   }

//   function selectOption(opt: string) {
//     if (field.type === "multi") {
//       const cur = (value as string[]) ?? [];
//       const next = cur.includes(opt)
//         ? cur.filter((v) => v !== opt)
//         : [...cur, opt];
//       onChange(next);
//     } else {
//       onChange(opt);
//       Animated.timing(anim, {
//         toValue: 0,
//         duration: 160,
//         useNativeDriver: false,
//       }).start();
//       setOpen(false);
//     }
//   }

//   function isSelected(opt: string): boolean {
//     if (field.type === "multi")
//       return ((value as string[]) ?? []).includes(opt);
//     return value === opt;
//   }

//   const answered = hasAnswer(value);
//   const summary = formatAnswer(value, field.valueType);
//   const isLocationField = ['area', 'municipality', 'community'].includes(field.key);
//   const maxH = anim.interpolate({
//     inputRange: [0, 1],
//     outputRange: [0, isLocationField ? 680 : 500],
//   });
//   const opac = anim.interpolate({
//     inputRange: [0, 0.4, 1],
//     outputRange: [0, 0, 1],
//   });
//   const rot = anim.interpolate({
//     inputRange: [0, 1],
//     outputRange: ["0deg", "90deg"],
//   });

//   const rangeValue = (value as RangeVal) ?? { from: "", to: "" };

//   const selectedAreas = (answers.area as string[] | undefined) ?? [];
//   const selectedMunicipalities =
//     (answers.municipality as string[] | undefined) ?? [];

//   return (
//     <Animated.View
//       style={[
//         S.row,
//         !isLast && S.rowBorder,
//         { transform: [{ scale: dragScale }] },
//         showRequiredError && styles.rowError,
//         isDragging && styles.rowPlaceholder,
//       ]}
//     >
//       <View style={S.rowInner}>
//         <View
//           {...panResponder.panHandlers}
//           style={S.dragHandle}
//           hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
//           onTouchStart={handleHandleTouchStart}
//           onTouchEnd={handleHandleTouchEnd}
//           onTouchCancel={handleHandleTouchEnd}
//         >
//           <Text style={S.dragHandleIcon}>⠿</Text>
//         </View>


//         <TouchableOpacity
//           activeOpacity={0.65}
//           onPress={toggle}
//           style={S.rowHeader}
//         >
//           <View style={styles.rowLabelWrap}>
//             <View style={styles.labelRow}>
//               <Text style={S.rowLabel}>{field.label}</Text>
//               {isRequired && <Text style={styles.requiredStar}> *</Text>}
//             </View>
//             <Text style={styles.rowSubLabel}>{field.subLabel}</Text>
//             {showRequiredError && (
//               <Text style={styles.errorHint}>This field is required</Text>
//             )}
//           </View>

//           <View style={styles.rowRight}>
//             {answered && !open && (
//               <Text style={S.rowValue} numberOfLines={1}>
//                 {summary}
//               </Text>
//             )}
//             <Animated.Text
//               style={[S.rowChevron, { transform: [{ rotate: rot }] }]}
//             >
//               ›
//             </Animated.Text>
//           </View>
//         </TouchableOpacity>
//       </View>

//       <Animated.View
//         style={{ maxHeight: maxH, opacity: opac, overflow: "hidden" }}
//       >
//         <View style={S.rowBody}>
//           {field.type === "price_input" && (
//             <TextInput
//               style={[S.textInput, showRequiredError && styles.inputError]}
//               placeholder={
//                 field.label === "Min Budget" ? "e.g. $500,000" : "e.g. $900,000"
//               }
//               placeholderTextColor={Colors.textMuted}
//               value={(value as string) ?? ""}
//               onChangeText={(t) => onChange(t)}
//               keyboardType="numeric"
//               returnKeyType="done"
//               onSubmitEditing={toggle}
//             />
//           )}

//           {(field.type === "price_range" || field.type === "range") &&
//             (() => {
//               const cfg = getRangeConfig(field.key);
//               return (
//                 <RangeInput
//                   value={rangeValue}
//                   unit={field.key === "budget_range" ? undefined : field.unit}
//                   onChange={onChange}
//                   min={cfg.min}
//                   max={cfg.max}
//                   step={cfg.step}
//                   minLabel={cfg.minLabel}
//                   maxLabel={cfg.maxLabel}
//                   tickMarks={cfg.tickMarks}
//                   {...(field.key === "budget_range"
//                     ? { formatLabel: BUDGET_CONFIG.formatLabel }
//                     : {})}
//                 />
//               );
//             })()}

//           {field.key === "area" && (
//             <LocationPickerInput
//               kind="areas"
//               values={(value as string[]) ?? []}
//               onChange={(vals) => onChange(vals)}
//               province={province}
//               hasError={showRequiredError}
//             />
//           )}

//           {field.key === "municipality" && (
//             <LocationPickerInput
//               kind="municipalities"
//               values={(value as string[]) ?? []}
//               onChange={(vals) => onChange(vals)}
//               province={province}
//               parentAreas={selectedAreas}
//               hasError={showRequiredError}
//             />
//           )}

//           {field.key === "community" && (
//             <LocationPickerInput
//               kind="communities"
//               values={(value as string[]) ?? []}
//               onChange={(vals) => onChange(vals)}
//               province={province}
//               parentAreas={selectedAreas}
//               parentMunicipalities={selectedMunicipalities}
//               hasError={showRequiredError}
//             />
//           )}

//           {field.type === "multi_text" && field.key !== "area" && (
//             <MultiValueTextInput
//               values={(value as string[]) ?? []}
//               onChange={(vals) => onChange(vals)}
//               placeholder="e.g. Downtown, Midtown"
//               hasError={showRequiredError}
//             />
//           )}

//           {(field.type === "single" || field.type === "multi") &&
//             field.options &&
//             !["municipality", "community"].includes(field.key) && (
//               <ChipSelector
//                 options={field.options}
//                 isMulti={field.type === "multi"}
//                 isSelected={isSelected}
//                 onSelect={selectOption}
//               />
//             )}
//         </View>
//       </Animated.View>
//     </Animated.View>
//   );
// }

// const styles = StyleSheet.create({
//   rowLabelWrap: {
//     flex: 1,
//     flexDirection: "column",
//     justifyContent: "center",
//     marginRight: 8,
//   },
//   rowRight: {
//     flexDirection: "row",
//     alignItems: "center",
//     flexShrink: 0,
//     maxWidth: 150,
//   },
//   labelRow: {
//     flexDirection: "row",
//     alignItems: "center",
//     flexWrap: "nowrap",
//   },
//   rowSubLabel: {
//     fontSize: 12,
//     color: "#9ca3af",
//     marginTop: 1,
//     fontWeight: "400",
//   },
//   rowError: {
//     borderLeftWidth: 3,
//     borderLeftColor: "#E53E3E",
//   },
//   rowPlaceholder: {
//     opacity: 0.35,
//     backgroundColor: Colors.subtle,
//   },
//   requiredStar: {
//     color: "#E53E3E",
//     fontSize: 14,
//     fontWeight: "700",
//   },
//   errorHint: {
//     color: "#C53030",
//     fontSize: 11,
//     fontWeight: "500",
//     marginTop: 2,
//   },
//   inputError: {
//     borderColor: "#FC8181",
//     borderWidth: 1.5,
//   },
// });

