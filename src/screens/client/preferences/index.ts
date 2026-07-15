// ─── Screens ─────────────────────────────────────────────────────────────────
export { ClientPreferencesScreen } from './Screens';

// ─── Components (re-exported for external reuse) ──────────────────────────────
export {
  ProgressBar,
  DragHint,
  ChipSelector,
  RangeInput,
  FieldRow,
  CollapsibleSectionCard,
  MoveFieldModal,
  PreferencesHeader,
  BottomNavBar,
  Toast,
} from './components';

// ─── Hooks ────────────────────────────────────────────────────────────────────
export { useClientPreferencesState } from './hooks';

// ─── Types ────────────────────────────────────────────────────────────────────
export type {
  FieldType,
  ValueType,
  FieldDef,
  ScreenDef,
  RangeVal,
  AnswerVal,
  Answers,
  ClientPreferenceItem,
  ClientPreferencesScreenProps,
} from './types';

// ─── Constants ────────────────────────────────────────────────────────────────
export { Colors, INITIAL_SCREENS, NUMERIC_SINGLE_FIELDS } from './constants';

// ─── Utils ────────────────────────────────────────────────────────────────────
export {
  parseNumber,
  formatAnswer,
  hasAnswer,
  preferenceItemValue,
  answerFromPreference,
  buildPreferencesPayload,
} from './utils';