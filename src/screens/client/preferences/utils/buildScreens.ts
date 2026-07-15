import type { PreferencesCatalog, ClientPreferences } from '@/lib/clientApi';
import type { Answers, FieldDef, FieldType, ScreenDef, ValueType } from '../types/preferences';
import { answerFromPreference } from './preferenceHelpers';
import { Colors } from '../constants/theme';

const TIER_ORDER = ['must_have', 'important', 'low_priority', 'not_important'] as const;

const TIER_META: Record<string, { title: string; dot: string; dotColor: string }> = {
  must_have: { title: 'Must Have', dot: '⭐', dotColor: Colors.dot.mustHave },
  important: { title: 'Important', dot: '🔵', dotColor: Colors.dot.important },
  low_priority: { title: 'Low Priority', dot: '⚫', dotColor: Colors.dot.lowPriority },
  not_important: { title: 'Not Important', dot: '⚫', dotColor: Colors.dot.notImportant },
};


const FIELD_UI: Record<string, Pick<FieldDef, 'type' | 'valueType' | 'subLabel' | 'unit'>> = {
  budget_range: {
    type: 'price_range',
    valueType: 'BUDGET_RANGE',
    subLabel: '(Budget & Basics)',
    unit: '$',
  },
  property_type: { type: 'multi', valueType: 'STRING_LIST', subLabel: '(Budget & Basics)' },
  bedrooms: { type: 'single', valueType: 'MIN_PLUS_INT', subLabel: '(Budget & Basics)' },
  area: { type: 'multi_text', valueType: 'STRING_LIST', subLabel: '(Location & Lifestyle)' },
  bathrooms: { type: 'single', valueType: 'MIN_PLUS_DECIMAL', subLabel: '(Budget & Basics)' },
  school_rating: { type: 'range', valueType: 'RANGE', subLabel: '(Interior Features)', unit: '/10' },
  basement: { type: 'multi', valueType: 'STRING_LIST', subLabel: '(Basement & Garage)' },
  parking: { type: 'single', valueType: 'MIN_PLUS_INT', subLabel: '(Basement & Garage)' },
  municipality: { type: 'multi', valueType: 'STRING_LIST', subLabel: '(Location & Lifestyle)' },
  community: { type: 'multi', valueType: 'STRING_LIST', subLabel: '(Location & Lifestyle)' },
  backyard: { type: 'multi', valueType: 'STRING_LIST', subLabel: '(Outdoor & Lot)' },
  lot_front: { type: 'range', valueType: 'RANGE', subLabel: '(Outdoor & Lot)', unit: 'ft' },
  lot_depth: { type: 'range', valueType: 'RANGE', subLabel: '(Outdoor & Lot)', unit: 'ft' },
  age_of_property: { type: 'multi', valueType: 'STRING_LIST', subLabel: '(Property Condition)' },
  community_pref: { type: 'multi', valueType: 'STRING_LIST', subLabel: '(Interior Features)' },
};

function categorySubLabel(category: string): string {
  return category ? `(${category})` : '';
}

function valueTypeFromCatalog(apiType: string): ValueType {
  switch (apiType) {
    case 'MIN_PLUS_INT':
      return 'MIN_PLUS_INT';
    case 'MAX_PLUS_INT':
      return 'MIN_PLUS_INT';
    case 'STRING_LIST':
      return 'STRING_LIST';
    case 'RANGE':
      return 'RANGE';
    default:
      return 'TEXT';
  }
}

function fieldTypeFromValueType(vt: ValueType): FieldType {
  switch (vt) {
    case 'BUDGET_RANGE':
      return 'price_range';
    case 'STRING_LIST':
      return 'multi';
    case 'RANGE':
      return 'range';
    case 'MIN_PLUS_INT':
    case 'MIN_PLUS_DECIMAL':
    case 'MONEY':
    case 'MONEY_MIN':
    case 'MONEY_MAX':
      return 'single';
    default:
      return 'single';
  }
}

function fieldDefFromCatalogEntry(
  entry: PreferencesCatalog['entries'][number],
  optionLabels: string[],
): FieldDef {
  const ui = FIELD_UI[entry.key];
  const valueType = ui?.valueType ?? valueTypeFromCatalog(entry.valueType);
  const type = ui?.type ?? fieldTypeFromValueType(valueType);
  return {
    key: entry.key,
    label: entry.label,
    subLabel: ui?.subLabel ?? categorySubLabel(entry.category),
    type,
    valueType,
    options: optionLabels.length > 0 ? optionLabels : undefined,
    unit: ui?.unit,
  };
}

function emptyTierShells(): ScreenDef[] {
  return TIER_ORDER.map(key => ({
    key,
    ...TIER_META[key],
    fields: [],
  }));
}

function catalogHasBudgetKeys(catalog: PreferencesCatalog): boolean {
  return catalog.entries.some(e => e.key === 'min_budget' || e.key === 'max_budget');
}

function budgetRangeField(catalog: PreferencesCatalog): FieldDef {
  const minEntry = catalog.entries.find(e => e.key === 'min_budget');
  const subLabel =
    FIELD_UI.budget_range?.subLabel ??
    (minEntry ? categorySubLabel(minEntry.category) : '(Budget & Basics)');
  return {
    key: 'budget_range',
    label: 'Budget Range',
    subLabel,
    type: 'price_range',
    valueType: 'BUDGET_RANGE',
    unit: '$',
  };
}

export function buildScreensFromCatalog(catalog: PreferencesCatalog): ScreenDef[] {
  const optionsByKey = new Map(catalog.entries.map(e => [e.key, e.optionLabels]));
  const shells = emptyTierShells();
  const fieldsByTier = new Map<string, FieldDef[]>();
  TIER_ORDER.forEach(t => fieldsByTier.set(t, []));

  if (catalogHasBudgetKeys(catalog)) {
    const minEntry = catalog.entries.find(e => e.key === 'min_budget');
    const tier = minEntry?.defaultTier ?? 'must_have';
    fieldsByTier.get(tier)!.push(budgetRangeField(catalog));
  }

  for (const entry of catalog.entries) {
    if (entry.key === 'min_budget' || entry.key === 'max_budget') continue;
    const tier = entry.defaultTier;
    if (!fieldsByTier.has(tier)) continue;
    fieldsByTier
      .get(tier)!
      .push(fieldDefFromCatalogEntry(entry, optionsByKey.get(entry.key) ?? []));
  }

  return shells.map(shell => ({
    ...shell,
    fields: fieldsByTier.get(shell.key) ?? [],
  }));
}

export function hasSavedPreferenceItems(preferences: ClientPreferences): boolean {
  if (preferences.completeness.setCount > 0) return true;
  return preferences.sections.some(s => s.items.length > 0);
}

export function fieldMapFromScreens(screens: ScreenDef[]): Map<string, FieldDef> {
  const map = new Map<string, FieldDef>();
  screens.flatMap(s => s.fields).forEach(f => map.set(f.key, f));
  return map;
}

// ─── Shared tier-placement core ───────────────────────────────────────────────

interface PrefsSectionItem {
  key:       string;
  sortOrder?: number;
}

interface PrefsSection {
  tier:  string;
  items: PrefsSectionItem[];
}

/**
 * Core logic shared by both the client and agent paths.
 *
 * Rules (in priority order):
 *  1. If a field has a saved preference entry → place it in the tier the
 *     PREFERENCES RESPONSE dictates, ordered by `sortOrder`.
 *  2. If a field has no saved entry yet → fall back to its catalog default
 *     tier, appended after the saved fields.
 *
 * The catalog is only ever used for field metadata (valueType, options, label).
 * It NEVER controls which section a previously-saved field appears in.
 */
function buildScreensFromPrefsSections(
  prefsSections: PrefsSection[],
  catalogScreens: ScreenDef[],
): ScreenDef[] {
  // -- Flat field metadata map from catalog (key → FieldDef) -----------------
  const fieldMap = fieldMapFromScreens(catalogScreens);

  // -- Maps derived from the preferences response ----------------------------
  // key → tier string (e.g. 'must_have') as saved by the user
  const prefsTierMap  = new Map<string, string>();
  // key → sortOrder for ordering within the tier
  const sortOrderMap  = new Map<string, number>();

  prefsSections.forEach(section => {
    section.items.forEach((item, fallbackIdx) => {
      prefsTierMap.set(item.key, section.tier);
      sortOrderMap.set(item.key, item.sortOrder ?? fallbackIdx);
    });
  });

  // Special-case: treat min_budget + max_budget as a single `budget_range` UI field.
  // The tier is driven by whichever budget key appears in prefs (min takes priority).
  const budgetPrefsTier =
    prefsTierMap.get('min_budget') ?? prefsTierMap.get('max_budget');
  const budgetSortOrder =
    sortOrderMap.get('min_budget') ?? sortOrderMap.get('max_budget');
  const budgetInPrefs = budgetPrefsTier !== undefined;

  if (budgetInPrefs) {
    prefsTierMap.set('budget_range', budgetPrefsTier!);
    sortOrderMap.set('budget_range', budgetSortOrder!);
  }
  // Remove the raw API keys so they don't get processed as standalone fields
  prefsTierMap.delete('min_budget');
  prefsTierMap.delete('max_budget');

  // -- Build one bucket per tier, preserving catalog section order/metadata --
  const screenBuckets = new Map<string, ScreenDef>(
    catalogScreens.map(s => [s.key, { ...s, fields: [] }]),
  );

  // 1. Saved fields → go into whatever tier prefs says
  const placedKeys = new Set<string>();
  for (const [key, tier] of prefsTierMap) {
    const field  = fieldMap.get(key);
    const bucket = screenBuckets.get(tier);
    if (!field || !bucket) continue;           // unknown key or unknown tier → skip
    bucket.fields.push(field);
    placedKeys.add(key);
  }

  // Sort each bucket's saved fields by their saved sortOrder
  for (const bucket of screenBuckets.values()) {
    bucket.fields.sort(
      (a, b) => (sortOrderMap.get(a.key) ?? 999) - (sortOrderMap.get(b.key) ?? 999),
    );
  }

  // 2. Unsaved fields → fall back to catalog default tier, after saved fields
  for (const catalogScreen of catalogScreens) {
    for (const field of catalogScreen.fields) {
      if (placedKeys.has(field.key)) continue;
      screenBuckets.get(catalogScreen.key)?.fields.push(field);
    }
  }

  return Array.from(screenBuckets.values());
}

// ─── Public builders ──────────────────────────────────────────────────────────

/**
 * Client path: tier placement driven by the CLIENT preferences response.
 * Catalog supplies field metadata only.
 */
export function buildScreensFromPreferences(
  preferences: ClientPreferences,
  catalog: PreferencesCatalog,
): ScreenDef[] {
  const catalogScreens = buildScreensFromCatalog(catalog);
  return buildScreensFromPrefsSections(preferences.sections, catalogScreens);
}

/**
 * Agent path: tier placement driven by the AGENT client preferences response.
 * Catalog supplies field metadata only.
 *
 * `agentPreferences` is typed loosely so this file stays free of an
 * `@/lib/agentApi` import — pass the `AgentClientPreferences` value directly.
 */
export function buildScreensFromAgentPreferences(
  agentPreferences: { sections: PrefsSection[] },
  catalogScreens: ScreenDef[],
): ScreenDef[] {
  return buildScreensFromPrefsSections(agentPreferences.sections, catalogScreens);
}

export function restoreAnswersFromPreferences(
  preferences: ClientPreferences,
  fieldMap: Map<string, FieldDef>,
): Answers {
  const restored: Answers = {};

  preferences.sections.forEach(section => {
    section.items.forEach(item => {
      if (item.key === 'min_budget' || item.key === 'max_budget') return;
      const field = fieldMap.get(item.key);
      if (!field) return;
      const answer = answerFromPreference(field, item.value);
      if (answer !== undefined) restored[item.key] = answer;
    });
  });

  const minRaw = preferences.sections
    .flatMap(s => s.items)
    .find(i => i.key === 'min_budget')?.value;
  const maxRaw = preferences.sections
    .flatMap(s => s.items)
    .find(i => i.key === 'max_budget')?.value;

  if (minRaw !== undefined || maxRaw !== undefined) {
    const minNum = minRaw?.min !== undefined ? Number(minRaw.min) : NaN;
    const maxNum = maxRaw?.max !== undefined ? Number(maxRaw.max) : NaN;
    if (!Number.isNaN(minNum) || !Number.isNaN(maxNum)) {
      restored.budget_range = {
        from: !Number.isNaN(minNum) ? String(minNum) : '',
        to: !Number.isNaN(maxNum) ? String(maxNum) : '',
      };
    }
  }

  return restored;
}













// import type { PreferencesCatalog, ClientPreferences } from '@/lib/clientApi';
// import type { Answers, FieldDef, FieldType, ScreenDef, ValueType } from '../types/preferences';
// import { answerFromPreference } from './preferenceHelpers';
// import { Colors } from '../constants/theme';

// const TIER_ORDER = ['must_have', 'important', 'low_priority', 'not_important'] as const;

// const TIER_META: Record<string, { title: string; dot: string; dotColor: string }> = {
//   must_have: { title: 'Must Have', dot: '⭐', dotColor: Colors.dot.mustHave },
//   important: { title: 'Important', dot: '🔵', dotColor: Colors.dot.important },
//   low_priority: { title: 'Low Priority', dot: '⚫', dotColor: Colors.dot.lowPriority },
//   not_important: { title: 'Not Important', dot: '⚫', dotColor: Colors.dot.notImportant },
// };


// const FIELD_UI: Record<string, Pick<FieldDef, 'type' | 'valueType' | 'subLabel' | 'unit'>> = {
//   budget_range: {
//     type: 'price_range',
//     valueType: 'BUDGET_RANGE',
//     subLabel: '(Budget & Basics)',
//     unit: '$',
//   },
//   property_type: { type: 'multi', valueType: 'STRING_LIST', subLabel: '(Budget & Basics)' },
//   bedrooms: { type: 'single', valueType: 'MIN_PLUS_INT', subLabel: '(Budget & Basics)' },
//   area: { type: 'multi_text', valueType: 'STRING_LIST', subLabel: '(Location & Lifestyle)' },
//   bathrooms: { type: 'single', valueType: 'MIN_PLUS_DECIMAL', subLabel: '(Budget & Basics)' },
//   school_rating: { type: 'range', valueType: 'RANGE', subLabel: '(Interior Features)', unit: '/10' },
//   basement: { type: 'multi', valueType: 'STRING_LIST', subLabel: '(Basement & Garage)' },
//   parking: { type: 'single', valueType: 'MIN_PLUS_INT', subLabel: '(Basement & Garage)' },
//   municipality: { type: 'multi', valueType: 'STRING_LIST', subLabel: '(Location & Lifestyle)' },
//   community: { type: 'multi', valueType: 'STRING_LIST', subLabel: '(Location & Lifestyle)' },
//   backyard: { type: 'multi', valueType: 'STRING_LIST', subLabel: '(Outdoor & Lot)' },
//   lot_front: { type: 'range', valueType: 'RANGE', subLabel: '(Outdoor & Lot)', unit: 'ft' },
//   lot_depth: { type: 'range', valueType: 'RANGE', subLabel: '(Outdoor & Lot)', unit: 'ft' },
//   age_of_property: { type: 'multi', valueType: 'STRING_LIST', subLabel: '(Property Condition)' },
//   community_pref: { type: 'multi', valueType: 'STRING_LIST', subLabel: '(Interior Features)' },
// };

// function categorySubLabel(category: string): string {
//   return category ? `(${category})` : '';
// }

// function valueTypeFromCatalog(apiType: string): ValueType {
//   switch (apiType) {
//     case 'MIN_PLUS_INT':
//       return 'MIN_PLUS_INT';
//     case 'MAX_PLUS_INT':
//       return 'MIN_PLUS_INT';
//     case 'STRING_LIST':
//       return 'STRING_LIST';
//     case 'RANGE':
//       return 'RANGE';
//     default:
//       return 'TEXT';
//   }
// }

// function fieldTypeFromValueType(vt: ValueType): FieldType {
//   switch (vt) {
//     case 'BUDGET_RANGE':
//       return 'price_range';
//     case 'STRING_LIST':
//       return 'multi';
//     case 'RANGE':
//       return 'range';
//     case 'MIN_PLUS_INT':
//     case 'MIN_PLUS_DECIMAL':
//     case 'MONEY':
//     case 'MONEY_MIN':
//     case 'MONEY_MAX':
//       return 'single';
//     default:
//       return 'single';
//   }
// }

// function fieldDefFromCatalogEntry(
//   entry: PreferencesCatalog['entries'][number],
//   optionLabels: string[],
// ): FieldDef {
//   const ui = FIELD_UI[entry.key];
//   const valueType = ui?.valueType ?? valueTypeFromCatalog(entry.valueType);
//   const type = ui?.type ?? fieldTypeFromValueType(valueType);
//   return {
//     key: entry.key,
//     label: entry.label,
//     subLabel: ui?.subLabel ?? categorySubLabel(entry.category),
//     type,
//     valueType,
//     options: optionLabels.length > 0 ? optionLabels : undefined,
//     unit: ui?.unit,
//   };
// }

// function emptyTierShells(): ScreenDef[] {
//   return TIER_ORDER.map(key => ({
//     key,
//     ...TIER_META[key],
//     fields: [],
//   }));
// }

// function catalogHasBudgetKeys(catalog: PreferencesCatalog): boolean {
//   return catalog.entries.some(e => e.key === 'min_budget' || e.key === 'max_budget');
// }

// function budgetRangeField(catalog: PreferencesCatalog): FieldDef {
//   const minEntry = catalog.entries.find(e => e.key === 'min_budget');
//   const subLabel =
//     FIELD_UI.budget_range?.subLabel ??
//     (minEntry ? categorySubLabel(minEntry.category) : '(Budget & Basics)');
//   return {
//     key: 'budget_range',
//     label: 'Budget Range',
//     subLabel,
//     type: 'price_range',
//     valueType: 'BUDGET_RANGE',
//     unit: '$',
//   };
// }

// export function buildScreensFromCatalog(catalog: PreferencesCatalog): ScreenDef[] {
//   const optionsByKey = new Map(catalog.entries.map(e => [e.key, e.optionLabels]));
//   const shells = emptyTierShells();
//   const fieldsByTier = new Map<string, FieldDef[]>();
//   TIER_ORDER.forEach(t => fieldsByTier.set(t, []));

//   if (catalogHasBudgetKeys(catalog)) {
//     const minEntry = catalog.entries.find(e => e.key === 'min_budget');
//     const tier = minEntry?.defaultTier ?? 'must_have';
//     fieldsByTier.get(tier)!.push(budgetRangeField(catalog));
//   }

//   for (const entry of catalog.entries) {
//     if (entry.key === 'min_budget' || entry.key === 'max_budget') continue;
//     const tier = entry.defaultTier;
//     if (!fieldsByTier.has(tier)) continue;
//     fieldsByTier
//       .get(tier)!
//       .push(fieldDefFromCatalogEntry(entry, optionsByKey.get(entry.key) ?? []));
//   }

//   return shells.map(shell => ({
//     ...shell,
//     fields: fieldsByTier.get(shell.key) ?? [],
//   }));
// }

// export function hasSavedPreferenceItems(preferences: ClientPreferences): boolean {
//   if (preferences.completeness.setCount > 0) return true;
//   return preferences.sections.some(s => s.items.length > 0);
// }

// export function fieldMapFromScreens(screens: ScreenDef[]): Map<string, FieldDef> {
//   const map = new Map<string, FieldDef>();
//   screens.flatMap(s => s.fields).forEach(f => map.set(f.key, f));
//   return map;
// }

// /** Saved tiers/order merged with full catalog field list. */
// export function buildScreensFromPreferences(
//   preferences: ClientPreferences,
//   catalog: PreferencesCatalog,
// ): ScreenDef[] {
//   const catalogScreens = buildScreensFromCatalog(catalog);
//   const fieldMap = fieldMapFromScreens(catalogScreens);

//   const apiTierForKey = new Map<string, string>();
//   const apiKeyOrder = new Map<string, number>();

//   preferences.sections.forEach(section => {
//     section.items.forEach((item, idx) => {
//       apiTierForKey.set(item.key, section.tier);
//       apiKeyOrder.set(item.key, item.sortOrder ?? idx);
//     });
//   });

//   const budgetSeen =
//     apiTierForKey.has('min_budget') || apiTierForKey.has('max_budget');

//   return catalogScreens.map(screen => {
//     const apiFields = [...fieldMap.values()]
//       .filter(f => {
//         if (f.key === 'budget_range') {
//           return (
//             budgetSeen &&
//             (apiTierForKey.get('min_budget') ?? apiTierForKey.get('max_budget')) ===
//               screen.key
//           );
//         }
//         return apiTierForKey.get(f.key) === screen.key;
//       })
//       .sort((a, b) => {
//         const orderA =
//           a.key === 'budget_range'
//             ? (apiKeyOrder.get('min_budget') ?? 0)
//             : (apiKeyOrder.get(a.key) ?? 0);
//         const orderB =
//           b.key === 'budget_range'
//             ? (apiKeyOrder.get('min_budget') ?? 0)
//             : (apiKeyOrder.get(b.key) ?? 0);
//         return orderA - orderB;
//       });

//     const unseenFields = screen.fields.filter(f => {
//       if (f.key === 'budget_range') return !budgetSeen;
//       return !apiTierForKey.has(f.key);
//     });

//     return { ...screen, fields: [...apiFields, ...unseenFields] };
//   });
// }

// export function restoreAnswersFromPreferences(
//   preferences: ClientPreferences,
//   fieldMap: Map<string, FieldDef>,
// ): Answers {
//   const restored: Answers = {};

//   preferences.sections.forEach(section => {
//     section.items.forEach(item => {
//       if (item.key === 'min_budget' || item.key === 'max_budget') return;
//       const field = fieldMap.get(item.key);
//       if (!field) return;
//       const answer = answerFromPreference(field, item.value);
//       if (answer !== undefined) restored[item.key] = answer;
//     });
//   });

//   const minRaw = preferences.sections
//     .flatMap(s => s.items)
//     .find(i => i.key === 'min_budget')?.value;
//   const maxRaw = preferences.sections
//     .flatMap(s => s.items)
//     .find(i => i.key === 'max_budget')?.value;

//   if (minRaw !== undefined || maxRaw !== undefined) {
//     const minNum = minRaw?.min !== undefined ? Number(minRaw.min) : NaN;
//     const maxNum = maxRaw?.max !== undefined ? Number(maxRaw.max) : NaN;
//     if (!Number.isNaN(minNum) || !Number.isNaN(maxNum)) {
//       restored.budget_range = {
//         from: !Number.isNaN(minNum) ? String(minNum) : '',
//         to: !Number.isNaN(maxNum) ? String(maxNum) : '',
//       };
//     }
//   }

//   return restored;
// }
