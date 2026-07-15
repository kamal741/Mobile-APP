export type FilterRangeConfig = {
  min: number;
  max: number;
  step: number;
  minLabel?: string;
  maxLabel?: string;
  unit?: string;
  tickMarks?: Array<{ value: number; label: string }>;
  formatLabel?: (v: number, isLow: boolean, min: number, max: number) => string;
};

function fmtMoney(v: number): string {
  if (v >= 1_000_000) {
    return `$${(v / 1_000_000).toFixed(v % 1_000_000 === 0 ? 0 : 1)}M`;
  }
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v}`;
}

export const PRICE_FILTER_RANGE_CONFIG: FilterRangeConfig = {
  min: 0,
  max: 4_000_000,
  step: 50_000,
  minLabel: 'Any',
  maxLabel: 'Max',
  tickMarks: [
    { value: 0, label: '$0' },
    { value: 450_000, label: '$450K' },
    { value: 850_000, label: '$850K' },
    { value: 1_800_000, label: '$1.8M' },
    { value: 3_800_000, label: '$3.8M' },
    { value: 4_000_000, label: 'Max' },
  ],
  formatLabel: (v, isLow, min, max) => {
    if (isLow && v <= min) return 'Any';
    if (!isLow && v >= max) return 'Max';
    return fmtMoney(v);
  },
};

export const AREA_FILTER_RANGE_CONFIG: FilterRangeConfig = {
  min: 0,
  max: 10_000,
  step: 100,
  unit: 'sq ft',
  minLabel: 'Any',
  maxLabel: 'Max',
  tickMarks: [
    { value: 0, label: '0' },
    { value: 1_000, label: '1K' },
    { value: 2_500, label: '2.5K' },
    { value: 5_000, label: '5K' },
    { value: 7_500, label: '7.5K' },
    { value: 10_000, label: 'Max' },
  ],
  formatLabel: (v, isLow, min, max) => {
    if (isLow && v <= min) return 'Any';
    if (!isLow && v >= max) return 'Max';
    return `${v.toLocaleString()} sq ft`;
  },
};

export const LOT_DIMENSION_FILTER_RANGE_CONFIG: FilterRangeConfig = {
  min: 0,
  max: 200,
  step: 5,
  unit: 'ft',
  minLabel: 'Any',
  maxLabel: 'Max',
  tickMarks: [
    { value: 0, label: '0' },
    { value: 40, label: '40' },
    { value: 80, label: '80' },
    { value: 120, label: '120' },
    { value: 160, label: '160' },
    { value: 200, label: 'Max' },
  ],
  formatLabel: (v, isLow, min, max) => {
    if (isLow && v <= min) return 'Any';
    if (!isLow && v >= max) return 'Max';
    return `${v} ft`;
  },
};

const CURRENT_YEAR = new Date().getFullYear();

export const YEAR_BUILT_FILTER_RANGE_CONFIG: FilterRangeConfig = {
  min: 1900,
  max: CURRENT_YEAR,
  step: 1,
  minLabel: 'Any',
  maxLabel: String(CURRENT_YEAR),
  tickMarks: [
    { value: 1900, label: '1900' },
    { value: 1950, label: '1950' },
    { value: 1980, label: '1980' },
    { value: 2000, label: '2000' },
    { value: 2015, label: '2015' },
    { value: CURRENT_YEAR, label: String(CURRENT_YEAR) },
  ],
  formatLabel: (v, isLow, min, max) => {
    if (isLow && v <= min) return 'Any';
    if (!isLow && v >= max) return String(max);
    return String(v);
  },
};
