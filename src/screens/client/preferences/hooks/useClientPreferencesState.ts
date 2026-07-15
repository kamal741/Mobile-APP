import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Animated } from 'react-native';
import {
  useClientPreferences,
  useSaveClientPreferences,
  usePreferencesCatalog,
} from '@/lib/clientApi';
import { useAuth } from '@/contexts/AuthContext';
import {
  useAgentClientPreferences,
  useAgentPreferencesCatalog,
  useSaveAgentClientPreferencesSection,
  type AgentClientPreferences,
  type PreferenceTier,
  type SavePreferenceItemPayload,
  type SaveClientPreferencesSectionPayload,
  type PreferenceItemValue,
} from '@/lib/agentApi';
import type { Answers, AnswerVal, RangeVal, ScreenDef, FieldDef } from '../types/preferences';
import {
  hasAnswer,
  countCompleteness,
  buildPreferencesPayload,
  preferencesStateSnapshot,
} from '../utils';
import {
  buildScreensFromCatalog,
  buildScreensFromPreferences,
  hasSavedPreferenceItems,
  fieldMapFromScreens,
  restoreAnswersFromPreferences,
} from '../utils/buildScreens';
// import { INITIAL_SCREENS } from '../data/screenData';
import { INITIAL_SCREENS, MIN_MUST_HAVE_FIELDS } from '../constants';

// ─── Types ────────────────────────────────────────────────────────────────────

export type SectionBounds = { key: string; top: number; bottom: number };
export type DragPosition  = { x: number; y: number };

export interface UseClientPreferencesStateOptions {
  onSubmit?:        (answers: Answers) => void;
  userType?:        'Client' | 'Agent';
  clientProfileId?: string | number;
}

// ─── Agent-path helpers ───────────────────────────────────────────────────────

/**
 * Maps a ScreenDef key (tier key) to a PreferenceTier for the agent endpoint.
 * We use the key directly since INITIAL_SCREENS already uses tier keys.
 */
function tierFromScreenKey(key: string): PreferenceTier {
  if (key === 'must_have')     return 'must_have';
  if (key === 'important')     return 'important';
  if (key === 'low_priority')  return 'low_priority';
  return 'not_important';
}

/**
 * Converts an AnswerVal back into the API value shape for a given field.
 *
 * valueType mapping:
 *   BUDGET_RANGE  → two separate items: min_budget + max_budget
 *                   (handled at call site, not here)
 *   STRING_LIST   → { values: string[] }
 *   MIN_PLUS_INT / MIN_PLUS_DECIMAL → { min: number }
 *   RANGE         → { min: number, max: number }  (from RangeVal { from, to })
 *   MONEY / MONEY_MIN / MONEY_MAX / TEXT → { text: string }
 */
function answerToApiValue(
  raw: AnswerVal,
  valueType: string,
): SavePreferenceItemPayload['value'] {
  switch (valueType) {
    case 'STRING_LIST':
      return { values: Array.isArray(raw) ? raw.map(String) : [String(raw)] };

    case 'MIN_PLUS_INT':
    case 'MIN_PLUS_DECIMAL': {
      const n = typeof raw === 'string' ? parseFloat(raw) : Number(raw);
      return { min: isNaN(n) ? 0 : n };
    }

    case 'RANGE': {
      // RangeVal shape: { from: string; to: string }
      if (typeof raw === 'object' && !Array.isArray(raw) && 'from' in raw) {
        const rv = raw as RangeVal;
        return {
          min: parseFloat(rv.from) || 0,
          max: parseFloat(rv.to)   || 0,
        };
      }
      return {};
    }

    case 'MONEY':
    case 'MONEY_MIN':
    case 'MONEY_MAX':
    case 'TEXT':
    default:
      return { text: String(raw) };
  }
}

/**
 * Builds per-tier save payloads from answers + INITIAL_SCREENS structure.
 *
 * BUDGET_RANGE is a special case: the single UI field `budget_range`
 * (with RangeVal { from, to }) maps to TWO API items: min_budget + max_budget.
 */
function buildAgentSectionPayloads(
  answers:  Answers,
  screens:  ScreenDef[],
  version:  number,
): Array<{ tier: PreferenceTier; payload: SaveClientPreferencesSectionPayload }> {
  return screens.map((screen) => {
    const tier  = tierFromScreenKey(screen.key);
    const items: SavePreferenceItemPayload[] = [];
    let sortOrder = 0;

    for (const field of screen.fields) {
      const raw = answers[field.key];

      if (field.valueType === 'BUDGET_RANGE') {
        // Split into two separate API items
        const rv = raw as RangeVal | undefined;
        const min = rv?.from ? parseFloat(rv.from) : NaN;
        const max = rv?.to ? parseFloat(rv.to) : NaN;
        items.push({
          key: 'min_budget',
          value: Number.isFinite(min) ? { min } : {},
          source: 'agent',
          sortOrder: sortOrder++,
        });
        items.push({
          key: 'max_budget',
          value: Number.isFinite(max) ? { max } : {},
          source: 'agent',
          sortOrder: sortOrder++,
        });
      } else {
        items.push({
          key:       field.key,
          value:     hasAnswer(raw) ? answerToApiValue(raw as AnswerVal, field.valueType) : {},
          source:    'agent',
          sortOrder: sortOrder++,
        });
      }
    }

    return {
      tier,
      payload: { version, replaceAll: true, items },
    };
  });
}

/**
 * Restores Answers from an AgentClientPreferences response.
 *
 * Accepts the screens built from the agent catalog API so that valueTypes
 * and field definitions come from the live catalog rather than the static
 * INITIAL_SCREENS fallback.
 *
 * Builds a flat map of  key → PreferenceItemValue  from all sections, then
 * converts each API value shape back to the AnswerVal the UI expects.
 */
function restoreAnswersFromAgentPreferences(
  prefs: AgentClientPreferences,
  catalogScreens: ScreenDef[],
): Answers {
  // Flat key → value map across all sections
  const valueMap = new Map<string, PreferenceItemValue & { text?: string }>();
  for (const section of prefs.sections) {
    for (const item of section.items) {
      valueMap.set(item.key, item.value as PreferenceItemValue & { text?: string });
    }
  }

  const answers: Answers = {};

  // Build a flat field list from catalog screens to get correct valueTypes
  const allFields = catalogScreens.flatMap((s) => s.fields);

  for (const field of allFields) {
    if (field.valueType === 'BUDGET_RANGE') {
      // Reconstruct from two API keys: min_budget + max_budget
      const minV = valueMap.get('min_budget');
      const maxV = valueMap.get('max_budget');
      if (minV !== undefined || maxV !== undefined) {
        answers[field.key] = {
          from: String(minV?.min ?? ''),
          to:   String(maxV?.max ?? ''),
        } as RangeVal;
      }
    } else {
      const v = valueMap.get(field.key);
      if (v === undefined) continue;

      switch (field.valueType) {
        case 'STRING_LIST':
          if (v.values && v.values.length > 0) {
            answers[field.key] = v.values;
          }
          break;

        case 'MIN_PLUS_INT':
        case 'MIN_PLUS_DECIMAL':
          if (v.min !== undefined) {
            answers[field.key] = String(v.min);
          }
          break;

        case 'RANGE':
          if (v.min !== undefined || v.max !== undefined) {
            answers[field.key] = {
              from: String(v.min ?? ''),
              to:   String(v.max ?? ''),
            } as RangeVal;
          }
          break;

        case 'MONEY':
        case 'MONEY_MIN':
        case 'MONEY_MAX':
        case 'TEXT':
        default:
          if ((v as any).text !== undefined) {
            answers[field.key] = String((v as any).text);
          }
          break;
      }
    }
  }

  return answers;
}

/**
 * Builds the full screens array for the agent path.
 *
 * Starts from catalogScreens (built from the agent catalog API, which carries
 * correct field types / valueTypes / option labels) and reorders fields within
 * each tier to match the sortOrder from the client preferences API response,
 * so saved preferences are shown in the same order as when they were submitted.
 *
 * Falls back to INITIAL_SCREENS only when no catalog has been fetched yet.
 */
// function buildScreensForAgent(
//   prefs: AgentClientPreferences,
//   catalogScreens: ScreenDef[],
// ): ScreenDef[] {
//   // Build a sortOrder map: key → sortOrder from each section
//   const sortOrderMap = new Map<string, number>();
//   for (const section of prefs.sections) {
//     for (const item of section.items) {
//       sortOrderMap.set(item.key, item.sortOrder);
//     }
//   }

//   return catalogScreens.map((screen) => {
//     const fields = [...screen.fields].sort((a, b) => {
//       const oa = sortOrderMap.get(a.key) ?? 999;
//       const ob = sortOrderMap.get(b.key) ?? 999;
//       return oa - ob;
//     });
//     return { ...screen, fields };
//   });
// }


function buildScreensForAgent(
  prefs: AgentClientPreferences,
  catalogScreens: ScreenDef[],
): ScreenDef[] {
  // Build a flat map: fieldKey → FieldDef (from catalog, carries valueType + options)
  const catalogFieldMap = new Map<string, FieldDef>();
  for (const screen of catalogScreens) {
    for (const field of screen.fields) {
      catalogFieldMap.set(field.key, field);
    }
  }

  // Build a map: fieldKey → { tier, sortOrder } from preferences response
  const prefsTierMap = new Map<string, { tier: string; sortOrder: number }>();
  for (const section of prefs.sections) {
    for (const item of section.items) {
      prefsTierMap.set(item.key, { tier: section.tier, sortOrder: item.sortOrder });
    }
  }

  // Start with empty buckets for each screen (preserving screen metadata)
  const screenMap = new Map<string, ScreenDef>(
    catalogScreens.map(s => [s.key, { ...s, fields: [] }]),
  );

  // 1. Place fields that appear in prefs into the tier prefs dictates
  const placedKeys = new Set<string>();
  for (const [key, { tier, sortOrder }] of prefsTierMap) {
    const field = catalogFieldMap.get(key);
    if (!field) continue;                         // key not in catalog — skip
    const screen = screenMap.get(tier);
    if (!screen) continue;                        // unknown tier — skip
    screen.fields.push({ ...field, _sortOrder: sortOrder } as any);
    placedKeys.add(key);
  }

  // 2. Fields not in prefs at all → fall back to their catalog default tier
  for (const screen of catalogScreens) {
    for (const field of screen.fields) {
      if (placedKeys.has(field.key)) continue;
      const targetScreen = screenMap.get(screen.key);
      targetScreen?.fields.push({ ...field, _sortOrder: 999 } as any);
    }
  }

  // 3. Sort each tier's fields by sortOrder, then strip the temp property
  return Array.from(screenMap.values()).map(screen => ({
    ...screen,
    fields: screen.fields
      .sort((a, b) => ((a as any)._sortOrder ?? 999) - ((b as any)._sortOrder ?? 999))
      .map(({ _sortOrder, ...f }: any) => f as FieldDef),
  }));
}



// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useClientPreferencesState(
  onSubmitOrOptions?: ((answers: Answers) => void) | UseClientPreferencesStateOptions,
) {
  // ── Normalise overloaded first argument ──────────────────────────────────
  const options: UseClientPreferencesStateOptions =
    typeof onSubmitOrOptions === 'function'
      ? { onSubmit: onSubmitOrOptions }
      : (onSubmitOrOptions ?? {});

  const { onSubmit, userType = 'Client', clientProfileId } = options;
  const isAgent = userType === 'Agent';

  // ── Core state ───────────────────────────────────────────────────────────
  const [answers,           setAnswers]          = useState<Answers>({});
  const [screens,           setScreens]          = useState<ScreenDef[]>([]);
  const [isHydrated,        setIsHydrated]       = useState(false);
  const [baselineSnapshot,  setBaselineSnapshot] = useState('');
  const [isDirty,           setIsDirty]          = useState(false);
  const isDirtyRef      = useRef(false);
  const initializedRef  = useRef(false);

  const [draggingField,     setDraggingField]     = useState<FieldDef | null>(null);
  const [dragTargetSection, setDragTargetSection] = useState<string | null>(null);
  const [currentSectionKey, setCurrentSectionKey] = useState('');
  const dragAnimXY = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;

  const [toast,  setToast]  = useState<string | null>(null);
  const [recommendationNoticeVisible, setRecommendationNoticeVisible] = useState(false);
  const recommendationNoticeCallbackRef = useRef<(() => void) | undefined>(undefined);
  const toastAnim            = useRef(new Animated.Value(0)).current;
  const sectionBoundsRef     = useRef<SectionBounds[]>([]);
  const draggingFieldRef     = useRef<FieldDef | null>(null);
  const currentSectionKeyRef = useRef('');
  const dragTargetSectionRef = useRef<string | null>(null);
  const latestDragYRef       = useRef<number | null>(null);

  useEffect(() => { draggingFieldRef.current     = draggingField;     }, [draggingField]);
  useEffect(() => { currentSectionKeyRef.current = currentSectionKey; }, [currentSectionKey]);
  useEffect(() => { dragTargetSectionRef.current = dragTargetSection; }, [dragTargetSection]);

  // ── Data fetching (all hooks called unconditionally — Rules of Hooks) ────

  const {
    data:      clientPreferences,
    isLoading: clientPrefsLoading,
    isError:   clientPrefsError,
    error:     clientPrefsErr,
  } = useClientPreferences({ enabled: !isAgent });

  const {
    data:      catalog,
    isLoading: catalogLoading,
    isError:   catalogError,
    error:     catalogErr,
  } = usePreferencesCatalog({ enabled: !isAgent });

  const {
    data:      agentCatalog,
    isLoading: agentCatalogLoading,
    isError:   agentCatalogError,
    error:     agentCatalogErr,
  } = useAgentPreferencesCatalog({ enabled: isAgent });

  const {
    data:      agentPreferences,
    isLoading: agentPrefsLoading,
    isError:   agentPrefsError,
    error:     agentPrefsErr,
  } = useAgentClientPreferences(
    clientProfileId ?? '',
    { enabled: isAgent && !!clientProfileId },
  );

  // ── Mutations ─────────────────────────────────────────────────────────────
  const saveClientMutation = useSaveClientPreferences();
  const saveAgentMutation  = useSaveAgentClientPreferencesSection(clientProfileId ?? '');
  const { refreshUser }    = useAuth();

  const isSaving = isAgent
    ? saveAgentMutation.status === 'pending'
    : saveClientMutation.status === 'pending';

  const isLoading = isAgent
    ? agentPrefsLoading || agentCatalogLoading
    : clientPrefsLoading || catalogLoading;

  const isError = isAgent
    ? agentPrefsError || agentCatalogError
    : clientPrefsError || catalogError;

  const error = isAgent
    ? agentPrefsErr ?? agentCatalogErr
    : clientPrefsErr ?? catalogErr;

  // ── Hydration ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (initializedRef.current) return;

    if (isAgent) {
      if (!agentPreferences || !agentCatalog) return;
      initializedRef.current = true;

      // Build screens from the agent catalog API (populates field options from
      // the live catalog rather than static INITIAL_SCREENS).
      const catalogScreens = buildScreensFromCatalog(agentCatalog);

      // If the client has saved preferences, reorder fields within each tier
      // to match the saved sortOrder — mirroring the client-path behaviour.
      const built = hasSavedPreferenceItems(agentPreferences as any)
        ? buildScreensForAgent(agentPreferences, catalogScreens)
        : catalogScreens;

      // Pass catalogScreens so field valueTypes come from the API catalog.
      const restored = restoreAnswersFromAgentPreferences(agentPreferences, catalogScreens);

      setScreens(built);
      setAnswers(restored);
      setBaselineSnapshot(preferencesStateSnapshot(restored, built));
      isDirtyRef.current = false;
      setIsDirty(false);
      setIsHydrated(true);
    } else {
      if (!clientPreferences || !catalog) return;
      initializedRef.current = true;

      const built = hasSavedPreferenceItems(clientPreferences)
        ? buildScreensFromPreferences(clientPreferences, catalog)
        : buildScreensFromCatalog(catalog);

      const fieldMap = fieldMapFromScreens(built);
      const restored = restoreAnswersFromPreferences(clientPreferences, fieldMap);

      setScreens(built);
      setAnswers(restored);
      setBaselineSnapshot(preferencesStateSnapshot(restored, built));
      isDirtyRef.current = false;
      setIsDirty(false);
      setIsHydrated(true);
    }
  }, [isAgent, agentPreferences, agentCatalog, clientPreferences, catalog]);

  // ── Dirty tracking ────────────────────────────────────────────────────────

  const markClean = useCallback(() => {
    isDirtyRef.current = false;
    setIsDirty(false);
  }, []);

  const markDirty = useCallback(() => {
    isDirtyRef.current = true;
    setIsDirty(true);
  }, []);

  const getHasUnsavedChanges = useCallback(() => {
    if (!isHydrated) return false;
    if (isDirtyRef.current) return true;
    return preferencesStateSnapshot(answers, screens) !== baselineSnapshot;
  }, [answers, screens, baselineSnapshot, isHydrated]);

  const hasUnsavedChanges = useMemo(() => {
    if (!isHydrated) return false;
    if (isDirty) return true;
    return preferencesStateSnapshot(answers, screens) !== baselineSnapshot;
  }, [answers, screens, baselineSnapshot, isHydrated, isDirty]);

  // ── Completeness ──────────────────────────────────────────────────────────

  const allFields   = screens.flatMap((s) => s.fields);
  const hasBudgetUi = allFields.some((f) => f.key === 'budget_range');

  const totalFields =
    (isAgent
      ? agentPreferences?.completeness.totalCount
      : (clientPreferences as any)?.completeness?.totalCount ??
        (catalog as any)?.totalCount) ??
    (hasBudgetUi ? allFields.length + 1 : allFields.length);

  const { setCount: answeredCount, percent: completenessPercent } = countCompleteness(
    answers,
    screens,
    totalFields,
  );

  // ── Change handler ────────────────────────────────────────────────────────

  function handleChange(key: string, val: Answers[string]) {
    markDirty();
    setAnswers((prev) => {
      const next = { ...prev, [key]: val };
      if (key === 'area') {
        next.municipality = [];
        next.community = [];
      } else if (key === 'municipality') {
        next.community = [];
      }
      return next;
    });
  }

  // ── Toast ─────────────────────────────────────────────────────────────────

  function showToast(msg: string) {
    setToast(msg);
    toastAnim.setValue(0);
    Animated.sequence([
      Animated.timing(toastAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(1600),
      Animated.timing(toastAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => setToast(null));
  }

  function dismissRecommendationNotice() {
    setRecommendationNoticeVisible(false);
    const callback = recommendationNoticeCallbackRef.current;
    recommendationNoticeCallbackRef.current = undefined;
    callback?.();
  }

  // ── Save ──────────────────────────────────────────────────────────────────

  function handleSavePreferences(onSuccessClose?: () => void) {
    if (isSaving) return;

    if (isAgent) {
      if (!agentPreferences) {
        showToast('Unable to save — preferences not yet loaded.');
        return;
      }

      const version  = agentPreferences.version ?? 0;
      const payloads = buildAgentSectionPayloads(answers, screens, version);

      // Fire sequentially so each response version is consistent
      const saveNext = (index: number) => {
        if (index >= payloads.length) {
          setBaselineSnapshot(preferencesStateSnapshot(answers, screens));
          markClean();
          showToast('Preferences saved successfully');
          onSubmit?.(answers);
          onSuccessClose?.();
          return;
        }
        const { tier, payload } = payloads[index];
        saveAgentMutation.mutate(
          { tier, payload },
          {
            onSuccess: () => saveNext(index + 1),
            onError:   (err: Error) => showToast(`Save failed: ${err.message}`),
          },
        );
      };

      saveNext(0);
    } else {
      if (!clientPreferences) {
        showToast('Unable to save — preferences not yet loaded.');
        return;
      }

      const payload = buildPreferencesPayload(
        answers,
        screens,
        (clientPreferences as any).version ?? 0,
      );

      saveClientMutation.mutate(payload, {
        onSuccess: () => {
          setBaselineSnapshot(preferencesStateSnapshot(answers, screens));
          markClean();
          void refreshUser(); // clear session/me cache so hasAllPreferences is re-fetched
          onSubmit?.(answers);
          recommendationNoticeCallbackRef.current = onSuccessClose;
          setRecommendationNoticeVisible(true);
        },
        onError: (err: Error) => showToast(`Save failed: ${err.message}`),
      });
    }
  }

  // ── Drag & Drop ───────────────────────────────────────────────────────────

  const registerSectionBounds = useCallback(
    (key: string, top: number, height: number) => {
      const entry: SectionBounds = { key, top, bottom: top + height };
      const list = sectionBoundsRef.current;
      const idx  = list.findIndex((b) => b.key === key);
      if (idx >= 0) list[idx] = entry;
      else list.push(entry);
    },
    [],
  );

  function handleDragStart(field: FieldDef, position?: DragPosition) {
    const fromSection = screens.find((s) => s.fields.some((f) => f.key === field.key));
    if (!fromSection) return;
    if (position) dragAnimXY.setValue({ x: position.x, y: position.y });
    draggingFieldRef.current = field;
    currentSectionKeyRef.current = fromSection.key;
    setDraggingField(field);
    setCurrentSectionKey(fromSection.key);
  }

  function handleDragMove(pageX: number, pageY: number) {
    if (!draggingFieldRef.current) return;
    latestDragYRef.current = pageY;
    // Update position via native driver — no React re-render triggered
    dragAnimXY.setValue({ x: pageX, y: pageY });
    const bounds = sectionBoundsRef.current;
    const hit = bounds.find(
      (b) => pageY >= b.top && pageY <= b.bottom,
    );
    let nextTarget = hit?.key ?? null;

    // If pointer is between measured bounds, keep drag usable by snapping
    // to the closest tier instead of dropping with no target.
    if (!nextTarget && bounds.length > 0) {
      const nearest = bounds.reduce((closest, b) => {
        const mid = (b.top + b.bottom) / 2;
        const dist = Math.abs(pageY - mid);
        if (!closest || dist < closest.dist) {
          return { key: b.key, dist };
        }
        return closest;
      }, null as { key: string; dist: number } | null);
      nextTarget = nearest?.key ?? null;
    }

    if (nextTarget !== dragTargetSectionRef.current) {
      setDragTargetSection(nextTarget);
    }
  }

  function clearDragState() {
    draggingFieldRef.current = null;
    dragTargetSectionRef.current = null;
    currentSectionKeyRef.current = '';
    latestDragYRef.current = null;
    setDraggingField(null);
    setDragTargetSection(null);
    setCurrentSectionKey('');
  }

  function moveField(targetSectionKey: string) {
    const field = draggingFieldRef.current;
    const fromKey = currentSectionKeyRef.current;
    if (!field) return;
    if (targetSectionKey === fromKey) { clearDragState(); return; }

    if (fromKey === 'must_have' && targetSectionKey !== 'must_have') {
      const mustHaveCount = screens.find((s) => s.key === 'must_have')?.fields.length ?? 0;
      if (mustHaveCount <= MIN_MUST_HAVE_FIELDS) {
        showToast(`Must Have needs at least ${MIN_MUST_HAVE_FIELDS} preferences`);
        clearDragState();
        return;
      }
    }

    const targetBounds = sectionBoundsRef.current.find((b) => b.key === targetSectionKey);

    let didMove = false;
    setScreens((prev) => {
      if (!prev.some((s) => s.key === targetSectionKey)) {
        return prev;
      }
      didMove = true;
      const next = prev.map((s) => ({
        ...s,
        fields: s.fields.filter((f) => f.key !== field.key),
      }));
      return next.map((s) => {
        if (s.key !== targetSectionKey) return s;

        const targetFields = [...s.fields];
        let insertIndex = targetFields.length;

        if (targetBounds && latestDragYRef.current !== null) {
          const sectionHeight = Math.max(1, targetBounds.bottom - targetBounds.top);
          const ratio = (latestDragYRef.current - targetBounds.top) / sectionHeight;
          const proposedIndex = Math.round(ratio * targetFields.length);
          insertIndex = Math.min(targetFields.length, Math.max(0, proposedIndex));
        }

        targetFields.splice(insertIndex, 0, field);
        return { ...s, fields: targetFields };
      });
    });

    if (!didMove) {
      clearDragState();
      return;
    }

    markDirty();
    const targetTitle =
      screens.find((s) => s.key === targetSectionKey)?.title ?? targetSectionKey;
    showToast(`"${field.label}" moved to ${targetTitle}`);
    clearDragState();
  }

  function handleDragEnd() {
    if (!draggingFieldRef.current) return;
    const target = dragTargetSectionRef.current;
    if (target && target !== currentSectionKeyRef.current) moveField(target);
    else clearDragState();
  }

  // ── Return ────────────────────────────────────────────────────────────────

  return {
    answers,
    screens,
    totalFields,
    answeredCount,
    completenessPercent,
    isLoading,
    isError,
    error,
    isSaving,
    hasUnsavedChanges,
    getHasUnsavedChanges,
    markClean,
    preferences: isAgent ? agentPreferences : clientPreferences,
    catalog:     isAgent ? agentCatalog : catalog,
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
    setDragTargetSection,
    registerSectionBounds,
  };
}
