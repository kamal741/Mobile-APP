import type { AnswerVal, Answers, FieldDef, RangeVal, ScreenDef } from '../types/preferences';

// ─── Number Parser ────────────────────────────────────────────────────────────
export function parseNumber(value: unknown): number | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  if (typeof value === 'string') {
    const cleaned = value.replace(/[^0-9.-]/g, '').trim();
    if (cleaned.length === 0) return undefined;
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

// ─── Currency formatter ───────────────────────────────────────────────────────
function formatCurrency(raw: string): string {
  const n = parseNumber(raw);
  if (n === undefined) return raw;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

// ─── Answer Formatter ─────────────────────────────────────────────────────────
export function formatAnswer(val: AnswerVal | undefined, valueType?: string): string {
  if (!val) return '';
  if (typeof val === 'string') return val;
  if (Array.isArray(val)) return val.length > 0 ? val.join(', ') : '';
  const r = val as RangeVal;
  // Budget range: show as $500K – $900K
  if (valueType === 'BUDGET_RANGE') {
    const from = r.from ? formatCurrency(r.from) : '..';
    const to   = r.to   ? formatCurrency(r.to)   : '..';
    return `${from} – ${to}`;
  }
  if (r.from || r.to) return `${r.from || '..'}–${r.to || '..'}`;
  return '';
}

// ─── Answer Presence Check ────────────────────────────────────────────────────
export function hasAnswer(val: AnswerVal | undefined): boolean {
  if (!val) return false;
  if (typeof val === 'string') return val.trim().length > 0;
  if (Array.isArray(val)) return val.length > 0;
  const r = val as RangeVal;
  return !!(r.from || r.to);
}

/** Matches API completeness: min_budget and max_budget count separately. */
export function countCompleteness(
  answers: Answers,
  screens: ScreenDef[],
  totalCount: number,
): { setCount: number; totalCount: number; percent: number } {
  let setCount = 0;

  for (const screen of screens) {
    for (const field of screen.fields) {
      if (field.valueType === 'BUDGET_RANGE' || field.key === 'budget_range') {
        const br = answers.budget_range as RangeVal | undefined;
        if (br?.from?.trim()) setCount++;
        if (br?.to?.trim()) setCount++;
      } else if (hasAnswer(answers[field.key])) {
        setCount++;
      }
    }
  }

  const percent =
    totalCount > 0 ? Math.min(100, Math.round((setCount / totalCount) * 100)) : 0;

  return { setCount, totalCount, percent };
}

// ─── API Value Builder ────────────────────────────────────────────────────────
export function preferenceItemValue(
  answer: AnswerVal,
  field: FieldDef,
): Record<string, unknown> | undefined {
  switch (field.valueType) {

    case 'MONEY_MIN': {
      const min = parseNumber(answer);
      return min !== undefined ? { min } : undefined;
    }
    case 'MONEY_MAX': {
      const max = parseNumber(answer);
      return max !== undefined ? { max } : undefined;
    }
    case 'MONEY': {
      const amount = parseNumber(answer);
      return amount !== undefined ? { amount } : undefined;
    }
    case 'STRING_LIST': {
      const arr = Array.isArray(answer)
        ? answer
        : typeof answer === 'string' ? [answer] : [];
      return arr.length > 0 ? { values: arr } : undefined;
    }
    case 'MIN_PLUS_INT':
    case 'MIN_PLUS_DECIMAL': {
      const raw = typeof answer === 'string' ? answer.replace(/\+$/, '') : answer;
      const min = parseNumber(raw);
      return min !== undefined ? { min } : undefined;
    }
    case 'RANGE': {
      const rv = answer as RangeVal;
      const payload: Record<string, unknown> = {};
      const min = parseNumber(rv.from);
      const max = parseNumber(rv.to);
      if (min !== undefined) payload.min = min;
      if (max !== undefined) payload.max = max;
      return Object.keys(payload).length > 0 ? payload : undefined;
    }
    case 'TEXT': {
      return typeof answer === 'string' && answer.trim()
        ? { text: answer }
        : undefined;
    }
    default:
      return undefined;
  }
}

// ─── Restore Answer from API GET response ────────────────────────────────────
export function answerFromPreference(
  field: FieldDef,
  value: unknown,
): AnswerVal | undefined {
  if (value == null) return undefined;

  if (field.type === 'price_range') {
    const num = parseNumber(
      (value as any).min ?? (value as any).max ?? (value as any).amount ?? value,
    );
    return num !== undefined ? String(num) : undefined;
  }

  if (field.type === 'price_input') {
    const amount = parseNumber(
      (value as any).min ?? (value as any).max ?? (value as any).amount ?? value,
    );
    return amount !== undefined ? String(amount) : undefined;
  }

  if (field.type === 'range') {
    const min = parseNumber((value as any).min ?? (value as any).from);
    const max = parseNumber((value as any).max ?? (value as any).to);
    return {
      from: min !== undefined ? String(min) : '',
      to:   max !== undefined ? String(max) : '',
    };
  }

  if (field.type === 'multi' || field.type === 'multi_text') {
    if (Array.isArray(value)) return value.map(String);
    if (typeof value === 'string') return [value];
    if (typeof value === 'object') {
      const arr = (value as any).values ?? (value as any).options ?? (value as any).selected;
      if (Array.isArray(arr)) return arr.map(String);
      if (typeof arr === 'string') return [arr];
    }
    return undefined;
  }

  if (field.type === 'single') {
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return String(value);
    if (typeof value === 'object') {
      const num = parseNumber((value as any).min ?? (value as any).value);
      if (num !== undefined) return String(num);
      const selected = (value as any).selected ?? (value as any).option ?? (value as any).label ?? (value as any).text;
      return typeof selected === 'string' ? selected : undefined;
    }
  }

  return undefined;
}

