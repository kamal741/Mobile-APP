import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet } from 'react-native';
import { sectionCardStyles as S } from '../styles/sectionCardStyles';
import { Colors } from '../constants/theme';
import { MIN_MUST_HAVE_FIELDS } from '../constants';
import { FieldRow } from './FieldRow';
import { hasAnswer } from '../utils/preferenceHelpers';
import type { ScreenDef, Answers, AnswerVal, FieldDef } from '../types/preferences';

const isMustHave = (screen: ScreenDef) =>
  screen.title.toLowerCase().includes('must have');

interface Props {
  screen:           ScreenDef;
  answers:          Answers;
  onChange:         (key: string, val: AnswerVal) => void;
  isDragTarget:     boolean;
  isDimmed?:        boolean;
  draggingFieldKey?: string | null;
  onDragStart:      (field: FieldDef) => void;
  onDragMove?:      (pageX: number, pageY: number) => void;
  onDragEnd?:       () => void;
  onHandleTouch?:   (touching: boolean) => void;
  onSectionLayout?: (key: string, top: number, height: number) => void;
  boundsRefreshKey?: number;
  showRequired?:      boolean;
  /** Passed straight through to each FieldRow. */
  onRequestScrollToField?: (pageY: number) => void;
}

export function CollapsibleSectionCard({
  screen,
  answers,
  onChange,
  isDragTarget,
  isDimmed = false,
  draggingFieldKey,
  onDragStart,
  onDragMove,
  onDragEnd,
  onHandleTouch,
  onSectionLayout,
  boundsRefreshKey = 0,
  showRequired = false,
  onRequestScrollToField,
}: Readonly<Props>) {
  const [open, setOpen] = useState(true);
  const anim = useRef(new Animated.Value(1)).current;
  const highlightAnim = useRef(new Animated.Value(0)).current;
  const targetPulseAnim = useRef(new Animated.Value(0)).current;
  const cardRef = useRef<View>(null);

  const measureSection = useCallback(() => {
    cardRef.current?.measureInWindow((_x, y, _w, h) => {
      onSectionLayout?.(screen.key, y, h);
    });
  }, [onSectionLayout, screen.key]);

  useEffect(() => {
    measureSection();
  }, [measureSection, screen.fields.length, open, boundsRefreshKey]);

  const isRequired = isMustHave(screen);
  const answeredCount = screen.fields.filter(f => hasAnswer(answers[f.key])).length;
  const unmetFields = isRequired
    ? screen.fields.filter(f => !hasAnswer(answers[f.key]))
    : [];
  const hasUnmet = unmetFields.length > 0;
  const isBelowMinimum = isRequired && screen.fields.length < MIN_MUST_HAVE_FIELDS;

  useEffect(() => {
    if (showRequired && isRequired && (hasUnmet || isBelowMinimum) && !open) {
      setOpen(true);
      Animated.timing(anim, { toValue: 1, duration: 220, useNativeDriver: false }).start();
    }
  }, [showRequired, isRequired, hasUnmet, isBelowMinimum, open, anim]);

  useEffect(() => {
    Animated.timing(highlightAnim, {
      toValue: isDragTarget ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [isDragTarget, highlightAnim]);

  useEffect(() => {
    if (!isDragTarget) {
      targetPulseAnim.setValue(0);
      return;
    }
    targetPulseAnim.setValue(0);
    Animated.sequence([
      Animated.timing(targetPulseAnim, {
        toValue: 1,
        duration: 130,
        useNativeDriver: true,
      }),
      Animated.timing(targetPulseAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isDragTarget, targetPulseAnim]);

  function toggle() {
    const next = !open;
    Animated.timing(anim, { toValue: next ? 1 : 0, duration: 220, useNativeDriver: false }).start();
    setOpen(next);
  }

  const rot = anim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '90deg'] });
  const maxH = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, screen.fields.length * 280],
  });
  const opac = anim.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 0, 1] });

  const showError = isRequired && showRequired && (hasUnmet || isBelowMinimum);
  const borderColor = highlightAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [showError ? '#FC8181' : Colors.border, Colors.dragBorder],
  });
  const bgColor = highlightAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [Colors.surface, Colors.dragHighlight],
  });
  const targetScale = targetPulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.015],
  });

  return (
    <Animated.View
      ref={cardRef}
      onLayout={measureSection}
      style={[
        S.card,
        { borderColor, backgroundColor: bgColor },
        isDimmed && styles.dimmed,
      ]}
    >
      {/* Scale uses native driver; border/bg use JS driver — must be separate views */}
      <Animated.View style={{ transform: [{ scale: targetScale }] }}>
      {isDragTarget && (
        <View style={S.dropZoneBanner}>
          <Text style={S.dropZoneTxt}>⬇ Drop here to move to {screen.title}</Text>
        </View>
      )}

      <TouchableOpacity activeOpacity={0.7} onPress={toggle} style={S.cardHeader}>
        {/* <View style={[S.cardDot, { backgroundColor: screen.dotColor }]} /> */}
        <Text style={S.cardTitle}>
          {screen.dot} {screen.title}
          {isRequired && <Text style={styles.requiredStar}> *</Text>}
        </Text>
        <View style={S.cardBadge}>
          <Text style={S.cardBadgeTxt}>{answeredCount}/{screen.fields.length}</Text>
        </View>
        {showError && (
          <View style={styles.errorBadge}>
            <Text style={styles.errorBadgeTxt}>
              {isBelowMinimum
                ? `${MIN_MUST_HAVE_FIELDS - screen.fields.length} more needed`
                : `${unmetFields.length} required`}
            </Text>
          </View>
        )}
        <Animated.Text style={[S.rowChevron, { transform: [{ rotate: rot }] }]}>›</Animated.Text>
      </TouchableOpacity>

      {showError && (
        <View style={styles.validationBanner}>
          <Text style={styles.validationBannerTxt}>
            {isBelowMinimum
              ? `Move at least ${MIN_MUST_HAVE_FIELDS} preferences into Must Have`
              : 'Complete all Must Have fields before continuing to Review'}
          </Text>
        </View>
      )}

      <Animated.View style={{ maxHeight: maxH, opacity: opac, overflow: 'hidden' }}>
        {screen.fields.length === 0 ? (
          <View style={S.emptySection}>
            <Text style={S.emptySectionTxt}>No fields — drag one here</Text>
          </View>
        ) : (
          screen.fields.map((f, i) => (
    <FieldRow
      key={f.key}
      field={f}
      value={answers[f.key]}
      answers={answers}
      onChange={val => onChange(f.key, val)}
      isLast={i === screen.fields.length - 1}
      onDragStart={onDragStart}
      onDragMove={onDragMove}
      onDragEnd={onDragEnd}
      onHandleTouch={onHandleTouch}
      isDragging={draggingFieldKey === f.key}
      isRequired={isRequired}
      showRequiredError={isRequired && showRequired && !hasAnswer(answers[f.key])}
      onRequestScrollToField={onRequestScrollToField}
    />
  ))
        )}
      </Animated.View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  dimmed: { opacity: 0.55 },
  requiredStar: {
    color: '#E53E3E',
    fontSize: 13,
    fontWeight: '700',
  },
  errorBadge: {
    backgroundColor: '#FFF5F5',
    borderWidth: 1,
    borderColor: '#FC8181',
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
    marginRight: 6,
  },
  errorBadgeTxt: {
    color: '#C53030',
    fontSize: 11,
    fontWeight: '600',
  },
  validationBanner: {
    backgroundColor: '#FFF5F5',
    borderTopWidth: 1,
    borderTopColor: '#FC8181',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  validationBannerTxt: {
    color: '#C53030',
    fontSize: 12,
    fontWeight: '500',
  },
});
