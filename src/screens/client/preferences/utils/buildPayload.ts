import type { Answers, ScreenDef } from '../types/preferences';
import type { SaveClientPreferencesPayload, ClientPreferencesTier, ClientPreferenceItem } from '@/lib/clientApi';
import { preferenceItemValue } from './preferenceHelpers';

export function buildPreferencesPayload(
  answers: Answers,
  screens: ScreenDef[],
  version: number,
): SaveClientPreferencesPayload {
  let sortOrder = 0;
  const items: ClientPreferenceItem[] = [];

  for (const screen of screens) {
    for (const field of screen.fields) {
      const answer = answers[field.key];

      // ── BUDGET_RANGE: one UI field → two API items (min_budget + max_budget) ──
      if (field.valueType === 'BUDGET_RANGE') {
        // answer is a RangeVal: { from: "500000", to: "800000" }
        const rv = answer as { from?: string; to?: string } | undefined;

        const minVal = parseFloat(rv?.from?.replace(/[^0-9.]/g, '') ?? '');
        const maxVal = parseFloat(rv?.to?.replace(/[^0-9.]/g, '') ?? '');

        items.push({
          key:       'min_budget',
          tier:      screen.key as ClientPreferencesTier,
          value:     !isNaN(minVal) ? { min: minVal } : {},
          source:    'user',
          sortOrder: sortOrder++,
        });
        items.push({
          key:       'max_budget',
          tier:      screen.key as ClientPreferencesTier,
          value:     !isNaN(maxVal) ? { max: maxVal } : {},
          source:    'user',
          sortOrder: sortOrder++,
        });
        continue;
      }

      // ── All other fields ───────────────────────────────────────────────────
      const value = answer !== undefined ? preferenceItemValue(answer, field) : undefined;

      items.push({
        key:       field.key,
        tier:      screen.key as ClientPreferencesTier,
        value:     value ?? {},
        source:    'user',
        sortOrder: sortOrder++,
      });
    }
  }

  return { version, replaceAll: true, items };
}



















// import type { Answers, ScreenDef, ClientPreferenceItem } from '../types/preferences';
// import type { SaveClientPreferencesPayload, ClientPreferencesTier } from '@/lib/clientApi';
// import { preferenceItemValue } from './preferenceHelpers';

// export function buildPreferencesPayload(
//   answers: Answers,
//   screens: ScreenDef[],
//   version: number,
// ): SaveClientPreferencesPayload {
//   let sortOrderCounter = 0;

//   const items = screens.flatMap(screen =>
//     screen.fields
//       .map(field => {
//         const answer = answers[field.key];
//         const value  =
//           answer !== undefined ? preferenceItemValue(answer, field) : undefined;

//         if (!value) return undefined;

//         return {
//           key:       field.key,
//           tier:      screen.key as ClientPreferencesTier,
//           value,
//           source:    'user',
//           sortOrder: sortOrderCounter++,
//         };
//       })
//       .filter((item): item is ClientPreferenceItem => item !== undefined),
//   );

//   return {
//     version,
//     replaceAll: true,
//     items,
//   };
// }
