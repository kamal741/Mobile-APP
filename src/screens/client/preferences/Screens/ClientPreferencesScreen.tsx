import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NavigationAction } from '@react-navigation/native';
import { screenStyles as S } from '../styles/screenStyles';
import { useClientPreferencesState } from '../hooks/useClientPreferencesState';
import {
  PreferencesHeader,
  BottomNavBar,
  Toast,
  ReviewBottomSheet,
  DragGhost,
  UnsavedChangesModal,
  RecommendationProcessingModal,
} from '../components';
import { PreferencesFormScreen } from './PreferencesFormScreen';
import { hasAnswer } from '../utils/preferenceHelpers';
import {
  useUpdateAgentClientPreferences,
  type UpdateAgentClientPreferencesPayload,
  type UpdatePreferenceItemPayload,
  type PreferenceTier,
} from '@/lib/agentApi';
import type { Answers } from '../types/preferences';
import { ClientFooter } from '../../components/ClientFooter';
import { MIN_MUST_HAVE_FIELDS } from '../constants';

// ─── Props ────────────────────────────────────────────────────────────────────

export interface ClientPreferencesScreenProps {
  onSubmit?: (answers: Answers) => void;
  onBack?:   () => void;
  /** 'Client' (default) — uses the client JWT hooks.
   *  'Agent'            — uses the agent JWT hooks to edit on behalf of a client. */
  userType?:        'Client' | 'Agent';
  /** Required when userType === 'Agent'. The profile ID of the client being edited. */
  clientProfileId?: string | number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Derives the tier for a field key by finding which screen section it currently
 * lives in. Screen keys are tier keys (e.g. 'must_have') — no title matching needed.
 * Falls back to 'must_have' if the key cannot be found in any screen.
 */
function resolveTier(
  fieldKey: string,
  screens: import('../types/preferences').ScreenDef[],
): PreferenceTier {
  const VALID_TIERS = new Set<string>(['must_have', 'important', 'low_priority', 'not_important']);
  for (const screen of screens) {
    if (!screen.fields.some(f => f.key === fieldKey)) continue;
    if (VALID_TIERS.has(screen.key)) return screen.key as PreferenceTier;
  }
  return 'must_have';
}

/**
 * Converts the flat `answers` map into the `items[]` array expected by
 * PUT /api/client/v1/agent/clients/:clientProfileId/preferences
 *
 * Special case — `budget_range`:
 *   The UI stores budget as a single RangeVal { from, to } under the key
 *   `budget_range`, but the API requires two separate items:
 *     • key: 'min_budget', value: { min: number }
 *     • key: 'max_budget', value: { max: number }
 *   Both inherit the tier of whichever screen contains `budget_range`.
 */
function buildAgentPreferencesItems(
  answers: Answers,
  screens: import('../types/preferences').ScreenDef[],
): UpdatePreferenceItemPayload[] {
  const items: UpdatePreferenceItemPayload[] = [];
  let sortOrder = 0;

  for (const [key, raw] of Object.entries(answers)) {
    if (raw === undefined || raw === null || raw === '') continue;

    // ── budget_range → split into min_budget + max_budget ───────────────────
    if (key === 'budget_range') {
      const rv = raw as { from?: string; to?: string };
      const tier = resolveTier(key, screens);

      const minVal = parseFloat(rv.from ?? '');
      const maxVal = parseFloat(rv.to ?? '');

      if (!isNaN(minVal)) {
        items.push({
          key:       'min_budget',
          tier,
          value:     { min: minVal },
          source:    'user',
          sortOrder: sortOrder++,
        });
      }
      if (!isNaN(maxVal)) {
        items.push({
          key:       'max_budget',
          tier,
          value:     { max: maxVal },
          source:    'user',
          sortOrder: sortOrder++,
        });
      }
      continue;
    }

    // ── All other fields ─────────────────────────────────────────────────────
    let value: UpdatePreferenceItemPayload['value'];

    if (Array.isArray(raw)) {
      // Multi-select → { values: string[] }
      value = { values: raw as string[] };
    } else if (
      raw !== null &&
      typeof raw === 'object' &&
      ('from' in raw || 'to' in raw)
    ) {
      // RangeVal { from, to } → { min, max }
      const rv = raw as { from?: string; to?: string };
      value = {
        min: parseFloat(rv.from ?? '') || 0,
        max: parseFloat(rv.to   ?? '') || 0,
      };
    } else if (
      raw !== null &&
      typeof raw === 'object' &&
      ('min' in raw || 'max' in raw)
    ) {
      // Already shaped as { min?, max? }
      value = raw as { min?: number; max?: number };
    } else if (typeof raw === 'string') {
      // Single-select / MIN_PLUS_INT stored as string → { min: number }
      const n = parseFloat(raw);
      value = isNaN(n) ? { values: [raw] } : { min: n };
    } else if (typeof raw === 'number') {
      value = { min: raw };
    } else {
      value = { values: [String(raw)] };
    }

    items.push({
      key,
      tier:      resolveTier(key, screens),
      value,
      source:    'user',
      sortOrder: sortOrder++,
    });
  }

  return items;
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export function ClientPreferencesScreen({
  onSubmit,
  onBack,
  userType:        propUserType,
  clientProfileId: propClientProfileId,
}: ClientPreferencesScreenProps) {
  const navigation = useNavigation();

  // Support both direct props (embedded usage) and route params (stack navigator usage)
  const route           = useRoute<any>();
  const userType        = propUserType        ?? (route.params?.userType        as 'Client' | 'Agent') ?? 'Client';
  const clientProfileId = propClientProfileId ?? route.params?.clientProfileId;

  const isAgentMode = userType === 'Agent';

  const [reviewSheetVisible,  setReviewSheetVisible]  = useState(false);
  const [showRequired,        setShowRequired]        = useState(false);
  const [boundsRefreshKey,    setBoundsRefreshKey]    = useState(0);
  const [unsavedModalVisible, setUnsavedModalVisible] = useState(false);

  const allowLeaveRef       = useRef(false);
  const pendingLeaveRef     = useRef<(() => void) | null>(null);
  const pendingNavActionRef = useRef<NavigationAction | null>(null);

  // ── Agent mutation ─────────────────────────────────────────────────────────
  // Instantiated unconditionally (hooks must not be called conditionally) but
  // only invoked when isAgentMode === true.
  const agentUpdateMutation = useUpdateAgentClientPreferences(clientProfileId ?? '');

  const {
    answers,
    screens,
    totalFields,
    answeredCount,
    completenessPercent,
    isLoading,
    isError,
    error,
    isSaving,
    getHasUnsavedChanges,
    markClean,
    toastAnim,
    toast,
    recommendationNoticeVisible,
    draggingField,
    dragTargetSection,
    dragAnimXY,
    handleChange,
    handleSavePreferences,
    dismissRecommendationNotice,
    handleDragStart,
    handleDragMove,
    handleDragEnd,
    registerSectionBounds,
  } = useClientPreferencesState({ onSubmit, userType, clientProfileId });

  // ── Agent-aware save ───────────────────────────────────────────────────────
  /**
   * When userType is 'Agent', replaces the default handleSavePreferences with a
   * call to PUT …/preferences via useUpdateAgentClientPreferences.
   *
   * The hook's `version` comes from the cached GET response already stored in
   * React Query under agentQueryKeys.clientPreferences(clientProfileId).
   * If for any reason the cached version is unavailable we default to 0 —
   * the server will respond with a 409 if the version is stale.
   */
  const handleAgentSave = useCallback(
    (onSuccess?: () => void) => {
      if (!clientProfileId) {
        console.warn('[ClientPreferencesScreen] Agent mode requires clientProfileId');
        return;
      }

      const items = buildAgentPreferencesItems(answers, screens);

      // TODO: pass the real version once useClientPreferencesState (or a sibling
      // useAgentClientPreferences call) exposes it. Defaulting to 0 is safe —
      // the server returns 409 on a stale version, which surfaces in onError below.
      // const version = 0;

      // const version = (agentPreferencesData?.version ?? 0) + 1;

      const payload: UpdateAgentClientPreferencesPayload = {
        replaceAll: true,
        items,
      };

      agentUpdateMutation.mutate(payload, {
        onSuccess: (data) => {
          onSubmit?.(answers);
          onSuccess?.();
        },
        onError: (err) => {
          console.error('[ClientPreferencesScreen] Agent save failed:', err.message);
        },
      });
    },
    [agentUpdateMutation, answers, screens, clientProfileId, onSubmit],
  );

  // Unified save — delegates to agent or client path based on mode
  const activeSave = isAgentMode ? handleAgentSave : handleSavePreferences;
  // Combined isSaving covers both the hook's internal state and the mutation
  const activeisSaving = isSaving || (isAgentMode && agentUpdateMutation.isPending);

  // ── Required field guard ───────────────────────────────────────────────────

  const mustHaveFields = screens.find(s => s.key === 'must_have')?.fields ?? [];
  const hasTooFewMustHave = mustHaveFields.length < MIN_MUST_HAVE_FIELDS;
  const hasUnansweredMustHave = mustHaveFields.some(f => !hasAnswer(answers[f.key]));
  const hasUnmetRequired = hasTooFewMustHave || hasUnansweredMustHave;
  const blockedMessage = hasTooFewMustHave
    ? `Add at least ${MIN_MUST_HAVE_FIELDS} preferences to Must Have`
    : 'Fill in all Must Have fields to continue';

  useEffect(() => {
    if (showRequired && !hasUnmetRequired) setShowRequired(false);
  }, [hasUnmetRequired, showRequired]);

  // ── Callbacks ──────────────────────────────────────────────────────────────

  const handleReview = useCallback(() => {
    if (hasUnmetRequired) { setShowRequired(true); return; }
    setShowRequired(false);
    setReviewSheetVisible(true);
  }, [hasUnmetRequired]);

  const handleScrollRemeasure = useCallback(() => {
    setBoundsRefreshKey(k => k + 1);
  }, []);

  // const handleSubmitFromSheet = useCallback(() => {
  //   activeSave(() => setReviewSheetVisible(false));
  // }, [activeSave]);







const handleSubmitFromSheet = useCallback(() => {
  activeSave(() => {
    markClean();
    allowLeaveRef.current = true; // ← lets the navigator back freely after submit
    setReviewSheetVisible(false);
  });
}, [activeSave, markClean]);

  const leaveScreen = useCallback(() => {
    setReviewSheetVisible(false);
    setUnsavedModalVisible(false);
    if (onBack) { onBack(); return; }
    if (navigation.canGoBack()) navigation.goBack();
  }, [onBack, navigation]);

  const completeLeave = useCallback(() => {
    allowLeaveRef.current = true;
    const action = pendingNavActionRef.current;
    const leave  = pendingLeaveRef.current;
    pendingNavActionRef.current = null;
    pendingLeaveRef.current     = null;
    setUnsavedModalVisible(false);
    if (action)      navigation.dispatch(action);
    else if (leave)  leave();
    else             leaveScreen();
  }, [navigation, leaveScreen]);

  const openUnsavedModal = useCallback((leave: () => void, navAction?: NavigationAction) => {
    pendingLeaveRef.current     = leave;
    pendingNavActionRef.current = navAction ?? null;
    setUnsavedModalVisible(true);
  }, []);

  const tryLeave = useCallback(
    (leave: () => void, navAction?: NavigationAction) => {
      if (allowLeaveRef.current || !getHasUnsavedChanges()) {
        if (navAction) { allowLeaveRef.current = true; navigation.dispatch(navAction); }
        else leave();
        return;
      }
      openUnsavedModal(leave, navAction);
    },
    [getHasUnsavedChanges, navigation, openUnsavedModal],
  );

  const handleCancel = useCallback(() => tryLeave(leaveScreen), [tryLeave, leaveScreen]);

  const handleStay = useCallback(() => {
    pendingLeaveRef.current     = null;
    pendingNavActionRef.current = null;
    setUnsavedModalVisible(false);
  }, []);

  const handleDiscard = useCallback(() => { markClean(); completeLeave(); }, [markClean, completeLeave]);

  const handleSaveAndLeave = useCallback(() => {
    if (hasUnmetRequired) {
      setUnsavedModalVisible(false);
      setShowRequired(true);
      return;
    }
    activeSave(() => { markClean(); completeLeave(); });
  }, [activeSave, markClean, completeLeave, hasUnmetRequired]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', e => {
      if (allowLeaveRef.current || activeisSaving) return;
      if (!getHasUnsavedChanges()) return;
      e.preventDefault();
      openUnsavedModal(() => {}, e.data.action);
    });
    return unsubscribe;
  }, [navigation, activeisSaving, getHasUnsavedChanges, openUnsavedModal]);

  // ── Render guards ──────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <SafeAreaView style={S.safe}>
        <View style={S.centered}>
          <Text style={S.loadingText}>Loading house preferences…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView style={S.safe}>
        <View style={S.centered}>
          <Text style={S.errorText}>Unable to load preferences.</Text>
          <Text style={S.errorSub}>{error?.message ?? 'Please try again.'}</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Main render ────────────────────────────────────────────────────────────

  return (
    <>
      {/* <PreferencesHeader answered={answeredCount} totalFields={totalFields} /> */}

      <View style={S.content}>
        <PreferencesFormScreen
          screens={screens}
          answers={answers}
          answeredCount={answeredCount}
          totalFields={totalFields}
          completenessPercent={completenessPercent}
          dragTargetSection={dragTargetSection}
          draggingFieldKey={draggingField?.key ?? null}
          onChange={handleChange}
          onDragStart={handleDragStart}
          onDragMove={handleDragMove}
          onDragEnd={handleDragEnd}
          onSectionLayout={registerSectionBounds}
          onScrollRemeasure={handleScrollRemeasure}
          boundsRefreshKey={boundsRefreshKey}
          showRequired={showRequired}
        />
      </View>

      <BottomNavBar
        isSaving={activeisSaving}
        onCancel={handleCancel}
        onReview={handleReview}
        hasUnmetRequired={hasUnmetRequired}
        blockedMessage={blockedMessage}
      />

      {draggingField && (
        <View style={styles.ghostOverlay} pointerEvents="none">
          <DragGhost field={draggingField} dragAnimXY={dragAnimXY} />
        </View>
      )}

      <ReviewBottomSheet
        visible={reviewSheetVisible}
        screens={screens}
        answers={answers}
        isSaving={activeisSaving}
        onClose={() => setReviewSheetVisible(false)}
        onSubmit={handleSubmitFromSheet}
      />

      <UnsavedChangesModal
        visible={unsavedModalVisible}
        isSaving={activeisSaving}
        onStay={handleStay}
        onDiscard={handleDiscard}
        onSave={handleSaveAndLeave}
      />

      <RecommendationProcessingModal
        visible={recommendationNoticeVisible}
        onClose={dismissRecommendationNotice}
      />

      <Toast message={toast} animValue={toastAnim} />
      {/* <ClientFooter active="dashboard" /> */}
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screenRoot: {
    overflow: 'visible',
  },
  ghostOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex:    1000,
    elevation: 1000,
  },
});

export default ClientPreferencesScreen;
