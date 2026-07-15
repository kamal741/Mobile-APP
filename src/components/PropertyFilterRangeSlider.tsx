import { RangeInput } from '../screens/client/preferences/components/RangeInput';
import type { RangeVal } from '../screens/client/preferences/types/preferences';
import type { FilterRangeConfig } from './propertyFilterRangeConfigs';

export type { FilterRangeConfig } from './propertyFilterRangeConfigs';

type Props = {
  config: FilterRangeConfig;
  minValue: string;
  maxValue: string;
  onChange: (min: string, max: string) => void;
  /** When true, only the low thumb is used (maps to minValue). */
  minOnly?: boolean;
};

function toRangeValue(minValue: string, maxValue: string, config: FilterRangeConfig): RangeVal {
  return {
    from: minValue.trim() || String(config.min),
    to: maxValue.trim() || String(config.max),
  };
}

function fromRangeValue(
  val: RangeVal,
  config: FilterRangeConfig,
  minOnly: boolean,
): { min: string; max: string } {
  const fromNum = parseFloat(val.from);
  const toNum = parseFloat(val.to);

  const min =
    val.from.trim() === '' || Number.isNaN(fromNum) || fromNum <= config.min
      ? ''
      : val.from;
  const max =
    minOnly || val.to.trim() === '' || Number.isNaN(toNum) || toNum >= config.max
      ? ''
      : val.to;

  return { min, max };
}

export function PropertyFilterRangeSlider({
  config,
  minValue,
  maxValue,
  onChange,
  minOnly = false,
}: Props) {
  const rangeVal = toRangeValue(minValue, maxValue, config);

  const handleChange = (val: RangeVal) => {
    const next = fromRangeValue(val, config, minOnly);
    onChange(next.min, next.max);
  };

  return (
    <RangeInput
      value={rangeVal}
      onChange={handleChange}
      min={config.min}
      max={config.max}
      step={config.step}
      minLabel={config.minLabel ?? 'Any'}
      maxLabel={config.maxLabel ?? 'Max'}
      unit={config.unit}
      tickMarks={config.tickMarks}
      formatLabel={config.formatLabel}
    />
  );
}
