import React, { useCallback, useRef, useState, useEffect } from 'react';
import { ScrollView, View, NativeSyntheticEvent, NativeScrollEvent, Platform } from 'react-native';
import { screenStyles as S } from '../styles/screenStyles';
import { ProgressBar, DragHint, CollapsibleSectionCard } from '../components';
import type { ScreenDef, Answers, AnswerVal, FieldDef } from '../types/preferences';

interface Props {
  screens:            ScreenDef[];
  answers:            Answers;
  answeredCount:        number;
  totalFields:          number;
  completenessPercent?: number;
  dragTargetSection:  string | null;
  draggingFieldKey?:  string | null;
  onChange:           (key: string, val: AnswerVal) => void;
  onDragStart:        (field: FieldDef) => void;
  onDragMove?:        (pageX: number, pageY: number) => void;
  onDragEnd?:         () => void;
  onSectionLayout?:   (key: string, top: number, height: number) => void;
  onScrollRemeasure?: () => void;
  boundsRefreshKey?: number;
  showRequired?:      boolean;
}

const EDGE_TRIGGER_PX = 110;
const AUTO_SCROLL_MIN_STEP = 5;
const AUTO_SCROLL_MAX_STEP = 28;
const REMEASURE_INTERVAL_MS = 80;
const FIELD_SCROLL_TOP_PADDING = 12; // small gap so the field isn't flush against the very top

export function PreferencesFormScreen({
  screens,
  answers,
  answeredCount,
  totalFields,
  completenessPercent,
  dragTargetSection,
  draggingFieldKey,
  onChange,
  onDragStart,
  onDragMove,
  onDragEnd,
  onSectionLayout,
  onScrollRemeasure,
  boundsRefreshKey = 0,
  showRequired = false,
}: Readonly<Props>) {
  const isDragging = Boolean(draggingFieldKey);
  const [isHandleTouching, setIsHandleTouching] = useState(false);

  const scrollRef = useRef<ScrollView>(null);
  const scrollOffsetYRef = useRef(0);
  const contentHeightRef = useRef(0);
  const viewportHeightRef = useRef(0);
  const viewportTopRef = useRef(0);
  const isDraggingRef = useRef(false);
  const latestDragPageXRef = useRef(0);
  const latestDragPageYRef = useRef(0);
  const autoScrollRafRef = useRef<number | null>(null);
  const lastRemeasureAtRef = useRef(0);
  const onScrollRemeasureRef = useRef(onScrollRemeasure);
  const onDragMoveRef = useRef(onDragMove);

  useEffect(() => {
    onScrollRemeasureRef.current = onScrollRemeasure;
  }, [onScrollRemeasure]);

  useEffect(() => {
    onDragMoveRef.current = onDragMove;
  }, [onDragMove]);

  useEffect(() => {
    isDraggingRef.current = isDragging;
    if (!isDragging) {
      stopAutoScrollLoop();
    }
  }, [isDragging]);

  useEffect(() => () => stopAutoScrollLoop(), []);

  const registerBounds = useCallback(
    (key: string, top: number, height: number) => {
      onSectionLayout?.(key, top, height);
    },
    [onSectionLayout],
  );

  const measureViewport = useCallback(() => {
    const node = scrollRef.current as unknown as View | null;
    node?.measureInWindow((_x: number, y: number, _w: number, h: number) => {
      viewportTopRef.current = y;
      if (h > 0) viewportHeightRef.current = h;
    });
  }, []);

  const requestBoundsRemeasure = useCallback(() => {
    const now = Date.now();
    if (now - lastRemeasureAtRef.current < REMEASURE_INTERVAL_MS) return;
    lastRemeasureAtRef.current = now;
    onScrollRemeasureRef.current?.();
  }, []);

  const stopAutoScrollLoop = () => {
    if (autoScrollRafRef.current != null) {
      cancelAnimationFrame(autoScrollRafRef.current);
      autoScrollRafRef.current = null;
    }
  };

  const tickAutoScroll = useCallback(() => {
    if (!isDraggingRef.current || Platform.OS === 'web') {
      autoScrollRafRef.current = null;
      return;
    }

    const viewportHeight = viewportHeightRef.current;
    if (viewportHeight <= 0) {
      autoScrollRafRef.current = requestAnimationFrame(tickAutoScroll);
      return;
    }

    const maxOffset = Math.max(0, contentHeightRef.current - viewportHeight);
    let didScroll = false;

    if (maxOffset > 0) {
      const localY = latestDragPageYRef.current - viewportTopRef.current;
      let scrollDelta = 0;

      if (localY < EDGE_TRIGGER_PX) {
        const intensity = 1 - Math.max(0, localY) / EDGE_TRIGGER_PX;
        scrollDelta = -Math.max(
          AUTO_SCROLL_MIN_STEP,
          Math.round(intensity * AUTO_SCROLL_MAX_STEP),
        );
      } else if (localY > viewportHeight - EDGE_TRIGGER_PX) {
        const distFromBottom = viewportHeight - localY;
        const intensity = 1 - Math.max(0, distFromBottom) / EDGE_TRIGGER_PX;
        scrollDelta = Math.max(
          AUTO_SCROLL_MIN_STEP,
          Math.round(intensity * AUTO_SCROLL_MAX_STEP),
        );
      }

      if (scrollDelta !== 0) {
        const nextOffset = Math.min(
          maxOffset,
          Math.max(0, scrollOffsetYRef.current + scrollDelta),
        );
        if (nextOffset !== scrollOffsetYRef.current) {
          scrollOffsetYRef.current = nextOffset;
          scrollRef.current?.scrollTo({ y: nextOffset, animated: false });
          requestBoundsRemeasure();
          didScroll = true;
        }
      }
    }

    // Re-hit-test tiers after scroll so drop target stays in sync.
    if (didScroll) {
      onDragMoveRef.current?.(
        latestDragPageXRef.current,
        latestDragPageYRef.current,
      );
    }

    autoScrollRafRef.current = requestAnimationFrame(tickAutoScroll);
  }, [requestBoundsRemeasure]);

  const startAutoScrollLoop = useCallback(() => {
    if (autoScrollRafRef.current != null) return;
    measureViewport();
    autoScrollRafRef.current = requestAnimationFrame(tickAutoScroll);
  }, [measureViewport, tickAutoScroll]);

  const handleHandleTouch = useCallback((touching: boolean) => {
    setIsHandleTouching(touching);
  }, []);

  const handleLayout = useCallback(() => {
    measureViewport();
  }, [measureViewport]);

  const handleContentSizeChange = useCallback((_: number, h: number) => {
    contentHeightRef.current = h;
  }, []);

  const handleDragStartWithScroll = useCallback(
    (field: FieldDef) => {
      isDraggingRef.current = true;
      measureViewport();
      onDragStart(field);
      startAutoScrollLoop();
    },
    [onDragStart, measureViewport, startAutoScrollLoop],
  );

  const handleDragMoveWithAutoScroll = useCallback(
    (pageX: number, pageY: number) => {
      latestDragPageXRef.current = pageX;
      latestDragPageYRef.current = pageY;
      onDragMove?.(pageX, pageY);
      startAutoScrollLoop();
    },
    [onDragMove, startAutoScrollLoop],
  );

  const handleDragEndWithCleanup = useCallback(() => {
    isDraggingRef.current = false;
    stopAutoScrollLoop();
    onDragEnd?.();
  }, [onDragEnd]);

  /**
   * IMPORTANT: onScrollRemeasure exists ONLY to keep drag-and-drop drop-zone
   * bounds fresh while a field is actively being dragged. It used to fire on
   * every scroll event unconditionally, which forced a full re-render of the
   * entire field tree (via boundsRefreshKey) tens of times a second on any
   * scroll — including the field-focus scroll below. That re-render churn,
   * happening right as a TextInput was gaining native focus, was the actual
   * cause of the keyboard/dropdown flashing open and immediately closing.
   * Gating this to drag-only fixes it, with no loss of drag functionality.
   */
  const handleScrollSync = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollOffsetYRef.current = e.nativeEvent.contentOffset.y;
    if (isDraggingRef.current) {
      onScrollRemeasureRef.current?.();
    }
  }, []);

  /**
   * Called by a LocationPickerInput (via FieldRow) when the Area/Municipality/
   * Community field gains focus, so the screen can scroll that field to the
   * top of the viewport.
   */
  const handleFieldFocusScroll = useCallback((pageY: number) => {
    const applyScroll = () => {
      const viewportHeight = viewportHeightRef.current;
      if (viewportHeight <= 0) return;

      const maxOffset = Math.max(0, contentHeightRef.current - viewportHeight);
      const delta = pageY - viewportTopRef.current - FIELD_SCROLL_TOP_PADDING;
      const nextOffset = Math.min(maxOffset, Math.max(0, scrollOffsetYRef.current + delta));

      scrollOffsetYRef.current = nextOffset;
      scrollRef.current?.scrollTo({ y: nextOffset, animated: true });
    };

    if (viewportHeightRef.current > 0) {
      applyScroll();
    } else {
      measureViewport();
      requestAnimationFrame(applyScroll);
    }
  }, [measureViewport]);

  return (
    <ScrollView
      ref={scrollRef}
      contentContainerStyle={S.scroll}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="always"
      scrollEventThrottle={16}
      disableScrollViewPanResponder
      scrollEnabled={!isDragging && !isHandleTouching}
      onLayout={handleLayout}
      onContentSizeChange={handleContentSizeChange}
      onScroll={handleScrollSync}
    >
      <ProgressBar
        answered={answeredCount}
        total={totalFields}
        percent={completenessPercent}
      />
      <DragHint />
      <View style={{ gap: 12 }}>
        {screens.map(screen => (
          <CollapsibleSectionCard
            key={screen.key}
            screen={screen}
            answers={answers}
            onChange={onChange}
            isDragTarget={dragTargetSection === screen.key}
            isDimmed={isDragging && dragTargetSection !== screen.key}
            draggingFieldKey={draggingFieldKey}
            onDragStart={handleDragStartWithScroll}
            onDragMove={handleDragMoveWithAutoScroll}
            onDragEnd={handleDragEndWithCleanup}
            onHandleTouch={handleHandleTouch}
            onSectionLayout={registerBounds}
            boundsRefreshKey={boundsRefreshKey}
            showRequired={showRequired}
            onRequestScrollToField={handleFieldFocusScroll}
          />
        ))}
      </View>

    </ScrollView>
  );
}










// import React, { useCallback, useRef, useState, useEffect } from 'react';
// import { ScrollView, View, NativeSyntheticEvent, NativeScrollEvent, Platform } from 'react-native';
// import { screenStyles as S } from '../styles/screenStyles';
// import { ProgressBar, DragHint, CollapsibleSectionCard } from '../components';
// import type { ScreenDef, Answers, AnswerVal, FieldDef } from '../types/preferences';

// interface Props {
//   screens:            ScreenDef[];
//   answers:            Answers;
//   answeredCount:        number;
//   totalFields:          number;
//   completenessPercent?: number;
//   dragTargetSection:  string | null;
//   draggingFieldKey?:  string | null;
//   onChange:           (key: string, val: AnswerVal) => void;
//   onDragStart:        (field: FieldDef) => void;
//   onDragMove?:        (pageX: number, pageY: number) => void;
//   onDragEnd?:         () => void;
//   onSectionLayout?:   (key: string, top: number, height: number) => void;
//   onScrollRemeasure?: () => void;
//   boundsRefreshKey?: number;
//   showRequired?:      boolean;
// }

// const EDGE_TRIGGER_PX = 110;
// const AUTO_SCROLL_MIN_STEP = 5;
// const AUTO_SCROLL_MAX_STEP = 28;
// const REMEASURE_INTERVAL_MS = 80;
// const FIELD_SCROLL_TOP_PADDING = 12; // small gap so the field isn't flush against the very top

// export function PreferencesFormScreen({
//   screens,
//   answers,
//   answeredCount,
//   totalFields,
//   completenessPercent,
//   dragTargetSection,
//   draggingFieldKey,
//   onChange,
//   onDragStart,
//   onDragMove,
//   onDragEnd,
//   onSectionLayout,
//   onScrollRemeasure,
//   boundsRefreshKey = 0,
//   showRequired = false,
// }: Readonly<Props>) {
//   const isDragging = Boolean(draggingFieldKey);
//   const [isHandleTouching, setIsHandleTouching] = useState(false);

//   const scrollRef = useRef<ScrollView>(null);
//   const scrollOffsetYRef = useRef(0);
//   const contentHeightRef = useRef(0);
//   const viewportHeightRef = useRef(0);
//   const viewportTopRef = useRef(0);
//   const isDraggingRef = useRef(false);
//   const latestDragPageXRef = useRef(0);
//   const latestDragPageYRef = useRef(0);
//   const autoScrollRafRef = useRef<number | null>(null);
//   const lastRemeasureAtRef = useRef(0);
//   const onScrollRemeasureRef = useRef(onScrollRemeasure);
//   const onDragMoveRef = useRef(onDragMove);

//   useEffect(() => {
//     onScrollRemeasureRef.current = onScrollRemeasure;
//   }, [onScrollRemeasure]);

//   useEffect(() => {
//     onDragMoveRef.current = onDragMove;
//   }, [onDragMove]);

//   useEffect(() => {
//     isDraggingRef.current = isDragging;
//     if (!isDragging) {
//       stopAutoScrollLoop();
//     }
//   }, [isDragging]);

//   useEffect(() => () => stopAutoScrollLoop(), []);

//   const registerBounds = useCallback(
//     (key: string, top: number, height: number) => {
//       onSectionLayout?.(key, top, height);
//     },
//     [onSectionLayout],
//   );

//   const measureViewport = useCallback(() => {
//     const node = scrollRef.current as unknown as View | null;
//     node?.measureInWindow((_x: number, y: number, _w: number, h: number) => {
//       viewportTopRef.current = y;
//       if (h > 0) viewportHeightRef.current = h;
//     });
//   }, []);

//   const requestBoundsRemeasure = useCallback(() => {
//     const now = Date.now();
//     if (now - lastRemeasureAtRef.current < REMEASURE_INTERVAL_MS) return;
//     lastRemeasureAtRef.current = now;
//     onScrollRemeasureRef.current?.();
//   }, []);

//   const stopAutoScrollLoop = () => {
//     if (autoScrollRafRef.current != null) {
//       cancelAnimationFrame(autoScrollRafRef.current);
//       autoScrollRafRef.current = null;
//     }
//   };

//   const tickAutoScroll = useCallback(() => {
//     if (!isDraggingRef.current || Platform.OS === 'web') {
//       autoScrollRafRef.current = null;
//       return;
//     }

//     const viewportHeight = viewportHeightRef.current;
//     if (viewportHeight <= 0) {
//       autoScrollRafRef.current = requestAnimationFrame(tickAutoScroll);
//       return;
//     }

//     const maxOffset = Math.max(0, contentHeightRef.current - viewportHeight);
//     let didScroll = false;

//     if (maxOffset > 0) {
//       const localY = latestDragPageYRef.current - viewportTopRef.current;
//       let scrollDelta = 0;

//       if (localY < EDGE_TRIGGER_PX) {
//         const intensity = 1 - Math.max(0, localY) / EDGE_TRIGGER_PX;
//         scrollDelta = -Math.max(
//           AUTO_SCROLL_MIN_STEP,
//           Math.round(intensity * AUTO_SCROLL_MAX_STEP),
//         );
//       } else if (localY > viewportHeight - EDGE_TRIGGER_PX) {
//         const distFromBottom = viewportHeight - localY;
//         const intensity = 1 - Math.max(0, distFromBottom) / EDGE_TRIGGER_PX;
//         scrollDelta = Math.max(
//           AUTO_SCROLL_MIN_STEP,
//           Math.round(intensity * AUTO_SCROLL_MAX_STEP),
//         );
//       }

//       if (scrollDelta !== 0) {
//         const nextOffset = Math.min(
//           maxOffset,
//           Math.max(0, scrollOffsetYRef.current + scrollDelta),
//         );
//         if (nextOffset !== scrollOffsetYRef.current) {
//           scrollOffsetYRef.current = nextOffset;
//           scrollRef.current?.scrollTo({ y: nextOffset, animated: false });
//           requestBoundsRemeasure();
//           didScroll = true;
//         }
//       }
//     }

//     // Re-hit-test tiers after scroll so drop target stays in sync.
//     if (didScroll) {
//       onDragMoveRef.current?.(
//         latestDragPageXRef.current,
//         latestDragPageYRef.current,
//       );
//     }

//     autoScrollRafRef.current = requestAnimationFrame(tickAutoScroll);
//   }, [requestBoundsRemeasure]);

//   const startAutoScrollLoop = useCallback(() => {
//     if (autoScrollRafRef.current != null) return;
//     measureViewport();
//     autoScrollRafRef.current = requestAnimationFrame(tickAutoScroll);
//   }, [measureViewport, tickAutoScroll]);

//   const handleHandleTouch = useCallback((touching: boolean) => {
//     setIsHandleTouching(touching);
//   }, []);

//   const handleLayout = useCallback(() => {
//     measureViewport();
//   }, [measureViewport]);

//   const handleContentSizeChange = useCallback((_: number, h: number) => {
//     contentHeightRef.current = h;
//   }, []);

//   const handleDragStartWithScroll = useCallback(
//     (field: FieldDef) => {
//       isDraggingRef.current = true;
//       measureViewport();
//       onDragStart(field);
//       startAutoScrollLoop();
//     },
//     [onDragStart, measureViewport, startAutoScrollLoop],
//   );

//   const handleDragMoveWithAutoScroll = useCallback(
//     (pageX: number, pageY: number) => {
//       latestDragPageXRef.current = pageX;
//       latestDragPageYRef.current = pageY;
//       onDragMove?.(pageX, pageY);
//       startAutoScrollLoop();
//     },
//     [onDragMove, startAutoScrollLoop],
//   );

//   const handleDragEndWithCleanup = useCallback(() => {
//     isDraggingRef.current = false;
//     stopAutoScrollLoop();
//     onDragEnd?.();
//   }, [onDragEnd]);

//   const handleScrollSync = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
//     scrollOffsetYRef.current = e.nativeEvent.contentOffset.y;
//     onScrollRemeasureRef.current?.();
//   }, []);

//   /**
//    * Called by a LocationPickerInput (via FieldRow) the instant the user taps
//    * to activate the Area/Municipality/Community field — before the keyboard
//    * opens. Scrolls so that field sits at the top of the visible viewport.
//    */
//   const handleFieldFocusScroll = useCallback((pageY: number) => {
//     const applyScroll = () => {
//       const viewportHeight = viewportHeightRef.current;
//       if (viewportHeight <= 0) return;

//       const maxOffset = Math.max(0, contentHeightRef.current - viewportHeight);
//       const delta = pageY - viewportTopRef.current - FIELD_SCROLL_TOP_PADDING;
//       const nextOffset = Math.min(maxOffset, Math.max(0, scrollOffsetYRef.current + delta));

//       scrollOffsetYRef.current = nextOffset;
//       scrollRef.current?.scrollTo({ y: nextOffset, animated: true });
//     };

//     if (viewportHeightRef.current > 0) {
//       applyScroll();
//     } else {
//       measureViewport();
//       requestAnimationFrame(applyScroll);
//     }
//   }, [measureViewport]);

//   return (
//     <ScrollView
//       ref={scrollRef}
//       contentContainerStyle={S.scroll}
//       showsVerticalScrollIndicator={false}
//       keyboardShouldPersistTaps="always"
//       scrollEventThrottle={16}
//       disableScrollViewPanResponder
//       scrollEnabled={!isDragging && !isHandleTouching}
//       onLayout={handleLayout}
//       onContentSizeChange={handleContentSizeChange}
//       onScroll={handleScrollSync}
//     >
//       <ProgressBar
//         answered={answeredCount}
//         total={totalFields}
//         percent={completenessPercent}
//       />
//       <DragHint />
//       <View style={{ gap: 12 }}>
//         {screens.map(screen => (
//           <CollapsibleSectionCard
//             key={screen.key}
//             screen={screen}
//             answers={answers}
//             onChange={onChange}
//             isDragTarget={dragTargetSection === screen.key}
//             isDimmed={isDragging && dragTargetSection !== screen.key}
//             draggingFieldKey={draggingFieldKey}
//             onDragStart={handleDragStartWithScroll}
//             onDragMove={handleDragMoveWithAutoScroll}
//             onDragEnd={handleDragEndWithCleanup}
//             onHandleTouch={handleHandleTouch}
//             onSectionLayout={registerBounds}
//             boundsRefreshKey={boundsRefreshKey}
//             showRequired={showRequired}
//             onRequestScrollToField={handleFieldFocusScroll}
//           />
//         ))}
//       </View>

//     </ScrollView>
//   );
// }







// import React, { useCallback, useRef, useState, useEffect } from 'react';
// import { ScrollView, View, NativeSyntheticEvent, NativeScrollEvent, Platform } from 'react-native';
// import { screenStyles as S } from '../styles/screenStyles';
// import { ProgressBar, DragHint, CollapsibleSectionCard } from '../components';
// import type { ScreenDef, Answers, AnswerVal, FieldDef } from '../types/preferences';

// interface Props {
//   screens:            ScreenDef[];
//   answers:            Answers;
//   answeredCount:        number;
//   totalFields:          number;
//   completenessPercent?: number;
//   dragTargetSection:  string | null;
//   draggingFieldKey?:  string | null;
//   onChange:           (key: string, val: AnswerVal) => void;
//   onDragStart:        (field: FieldDef) => void;
//   onDragMove?:        (pageX: number, pageY: number) => void;
//   onDragEnd?:         () => void;
//   onSectionLayout?:   (key: string, top: number, height: number) => void;
//   onScrollRemeasure?: () => void;
//   boundsRefreshKey?: number;
//   showRequired?:      boolean;
// }

// const EDGE_TRIGGER_PX = 110;
// const AUTO_SCROLL_MIN_STEP = 5;
// const AUTO_SCROLL_MAX_STEP = 28;
// const REMEASURE_INTERVAL_MS = 80;
// const FIELD_SCROLL_TOP_PADDING = 12; // small gap so the field isn't flush against the very top

// export function PreferencesFormScreen({
//   screens,
//   answers,
//   answeredCount,
//   totalFields,
//   completenessPercent,
//   dragTargetSection,
//   draggingFieldKey,
//   onChange,
//   onDragStart,
//   onDragMove,
//   onDragEnd,
//   onSectionLayout,
//   onScrollRemeasure,
//   boundsRefreshKey = 0,
//   showRequired = false,
// }: Readonly<Props>) {
//   const isDragging = Boolean(draggingFieldKey);
//   const [isHandleTouching, setIsHandleTouching] = useState(false);

//   const scrollRef = useRef<ScrollView>(null);
//   const scrollOffsetYRef = useRef(0);
//   const contentHeightRef = useRef(0);
//   const viewportHeightRef = useRef(0);
//   const viewportTopRef = useRef(0);
//   const isDraggingRef = useRef(false);
//   const latestDragPageXRef = useRef(0);
//   const latestDragPageYRef = useRef(0);
//   const autoScrollRafRef = useRef<number | null>(null);
//   const lastRemeasureAtRef = useRef(0);
//   const onScrollRemeasureRef = useRef(onScrollRemeasure);
//   const onDragMoveRef = useRef(onDragMove);

//   useEffect(() => {
//     onScrollRemeasureRef.current = onScrollRemeasure;
//   }, [onScrollRemeasure]);

//   useEffect(() => {
//     onDragMoveRef.current = onDragMove;
//   }, [onDragMove]);

//   useEffect(() => {
//     isDraggingRef.current = isDragging;
//     if (!isDragging) {
//       stopAutoScrollLoop();
//     }
//   }, [isDragging]);

//   useEffect(() => () => stopAutoScrollLoop(), []);

//   const registerBounds = useCallback(
//     (key: string, top: number, height: number) => {
//       onSectionLayout?.(key, top, height);
//     },
//     [onSectionLayout],
//   );

//   const measureViewport = useCallback(() => {
//     const node = scrollRef.current as unknown as View | null;
//     node?.measureInWindow((_x: number, y: number, _w: number, h: number) => {
//       viewportTopRef.current = y;
//       if (h > 0) viewportHeightRef.current = h;
//     });
//   }, []);

//   const requestBoundsRemeasure = useCallback(() => {
//     const now = Date.now();
//     if (now - lastRemeasureAtRef.current < REMEASURE_INTERVAL_MS) return;
//     lastRemeasureAtRef.current = now;
//     onScrollRemeasureRef.current?.();
//   }, []);

//   const stopAutoScrollLoop = () => {
//     if (autoScrollRafRef.current != null) {
//       cancelAnimationFrame(autoScrollRafRef.current);
//       autoScrollRafRef.current = null;
//     }
//   };

//   const tickAutoScroll = useCallback(() => {
//     if (!isDraggingRef.current || Platform.OS === 'web') {
//       autoScrollRafRef.current = null;
//       return;
//     }

//     const viewportHeight = viewportHeightRef.current;
//     if (viewportHeight <= 0) {
//       autoScrollRafRef.current = requestAnimationFrame(tickAutoScroll);
//       return;
//     }

//     const maxOffset = Math.max(0, contentHeightRef.current - viewportHeight);
//     let didScroll = false;

//     if (maxOffset > 0) {
//       const localY = latestDragPageYRef.current - viewportTopRef.current;
//       let scrollDelta = 0;

//       if (localY < EDGE_TRIGGER_PX) {
//         const intensity = 1 - Math.max(0, localY) / EDGE_TRIGGER_PX;
//         scrollDelta = -Math.max(
//           AUTO_SCROLL_MIN_STEP,
//           Math.round(intensity * AUTO_SCROLL_MAX_STEP),
//         );
//       } else if (localY > viewportHeight - EDGE_TRIGGER_PX) {
//         const distFromBottom = viewportHeight - localY;
//         const intensity = 1 - Math.max(0, distFromBottom) / EDGE_TRIGGER_PX;
//         scrollDelta = Math.max(
//           AUTO_SCROLL_MIN_STEP,
//           Math.round(intensity * AUTO_SCROLL_MAX_STEP),
//         );
//       }

//       if (scrollDelta !== 0) {
//         const nextOffset = Math.min(
//           maxOffset,
//           Math.max(0, scrollOffsetYRef.current + scrollDelta),
//         );
//         if (nextOffset !== scrollOffsetYRef.current) {
//           scrollOffsetYRef.current = nextOffset;
//           scrollRef.current?.scrollTo({ y: nextOffset, animated: false });
//           requestBoundsRemeasure();
//           didScroll = true;
//         }
//       }
//     }

//     // Re-hit-test tiers after scroll so drop target stays in sync.
//     if (didScroll) {
//       onDragMoveRef.current?.(
//         latestDragPageXRef.current,
//         latestDragPageYRef.current,
//       );
//     }

//     autoScrollRafRef.current = requestAnimationFrame(tickAutoScroll);
//   }, [requestBoundsRemeasure]);

//   const startAutoScrollLoop = useCallback(() => {
//     if (autoScrollRafRef.current != null) return;
//     measureViewport();
//     autoScrollRafRef.current = requestAnimationFrame(tickAutoScroll);
//   }, [measureViewport, tickAutoScroll]);

//   const handleHandleTouch = useCallback((touching: boolean) => {
//     setIsHandleTouching(touching);
//   }, []);

//   const handleLayout = useCallback(() => {
//     measureViewport();
//   }, [measureViewport]);

//   const handleContentSizeChange = useCallback((_: number, h: number) => {
//     contentHeightRef.current = h;
//   }, []);

//   const handleDragStartWithScroll = useCallback(
//     (field: FieldDef) => {
//       isDraggingRef.current = true;
//       measureViewport();
//       onDragStart(field);
//       startAutoScrollLoop();
//     },
//     [onDragStart, measureViewport, startAutoScrollLoop],
//   );

//   const handleDragMoveWithAutoScroll = useCallback(
//     (pageX: number, pageY: number) => {
//       latestDragPageXRef.current = pageX;
//       latestDragPageYRef.current = pageY;
//       onDragMove?.(pageX, pageY);
//       startAutoScrollLoop();
//     },
//     [onDragMove, startAutoScrollLoop],
//   );

//   const handleDragEndWithCleanup = useCallback(() => {
//     isDraggingRef.current = false;
//     stopAutoScrollLoop();
//     onDragEnd?.();
//   }, [onDragEnd]);

//   const handleScrollSync = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
//     scrollOffsetYRef.current = e.nativeEvent.contentOffset.y;
//     onScrollRemeasureRef.current?.();
//   }, []);

//   return (
//     <ScrollView
//       ref={scrollRef}
//       contentContainerStyle={S.scroll}
//       showsVerticalScrollIndicator={false}
//       keyboardShouldPersistTaps="always"
//       scrollEventThrottle={16}
//       disableScrollViewPanResponder
//       scrollEnabled={!isDragging && !isHandleTouching}
//       onLayout={handleLayout}
//       onContentSizeChange={handleContentSizeChange}
//       onScroll={handleScrollSync}
//     >
//       <ProgressBar
//         answered={answeredCount}
//         total={totalFields}
//         percent={completenessPercent}
//       />
//       <DragHint />
//       <View style={{ gap: 12 }}>
//         {screens.map(screen => (
//           <CollapsibleSectionCard
//             key={screen.key}
//             screen={screen}
//             answers={answers}
//             onChange={onChange}
//             isDragTarget={dragTargetSection === screen.key}
//             isDimmed={isDragging && dragTargetSection !== screen.key}
//             draggingFieldKey={draggingFieldKey}
//             onDragStart={handleDragStartWithScroll}
//             onDragMove={handleDragMoveWithAutoScroll}
//             onDragEnd={handleDragEndWithCleanup}
//             onHandleTouch={handleHandleTouch}
//             onSectionLayout={registerBounds}
//             boundsRefreshKey={boundsRefreshKey}
//             showRequired={showRequired}
//           />
//         ))}
//       </View>
      
//     </ScrollView>
//   );
// }
