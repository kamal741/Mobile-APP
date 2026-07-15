// ─── Field / Screen Definitions ───────────────────────────────────────────────
export type FieldType  =
  | 'single'
  | 'multi'
  | 'multi_text'
  | 'price_input'
  | 'price_range'
  | 'range';
export type ValueType  =
  | 'MONEY'
  | 'MONEY_MIN'
  | 'MONEY_MAX'
  | 'BUDGET_RANGE'     // Single UI field → emits min_budget + max_budget API items
  | 'STRING_LIST'
  | 'MIN_PLUS_INT'
  | 'MIN_PLUS_DECIMAL'
  | 'RANGE'
  | 'TEXT';

export interface FieldDef {
  key:       string;
  label:     string;
  subLabel:  string;
  type:      FieldType;
  valueType: ValueType;
  options?:  string[];
  unit?:     string;
}

export interface ScreenDef {
  key:      string;
  title:    string;
  dotColor: string;
  dot:      string;
  fields:   FieldDef[];
}

// ─── Answer Value Types ───────────────────────────────────────────────────────
export type RangeVal   = { from: string; to: string };
export type AnswerVal  = string | string[] | RangeVal;
export type Answers    = Record<string, AnswerVal>;

// ─── API Payload Types ────────────────────────────────────────────────────────
export interface ClientPreferenceItem {
  key:       string;
  tier:      string;
  value:     Record<string, unknown>;
  source:    string;
  sortOrder: number;
}

// ─── Screen Props ─────────────────────────────────────────────────────────────
export interface ClientPreferencesScreenProps {
  onSubmit?: (answers: Answers) => void;
  onBack?:   () => void;
}

