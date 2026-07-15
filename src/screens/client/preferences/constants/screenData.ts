import { Colors } from './theme';
import type { ScreenDef } from '../types/preferences';

// Fields that are numeric for parsing purposes
export const NUMERIC_SINGLE_FIELDS = new Set(['bedrooms', 'bathrooms', 'parking']);

export const MIN_MUST_HAVE_FIELDS = 4;

/**
 * Static screen/field definitions — structure, labels, types only.
 * `options` are intentionally omitted here; they are hydrated at runtime
 * from the `clientPreferencesCatalog` API via `buildScreensFromCatalog`.
 */
export const INITIAL_SCREENS: ScreenDef[] = [
  {
    key: 'must_have',
    title: 'Must Have',
    dot: '⭐',
    dotColor: Colors.dot.mustHave,
    fields: [
      {
        key: 'budget_range', label: 'Budget Range', subLabel: '(Budget & Basics)',
        type: 'price_range', valueType: 'BUDGET_RANGE',
        unit: '$',
      },
      {
        key: 'property_type', label: 'Property Type', subLabel: '(Budget & Basics)',
        type: 'multi', valueType: 'STRING_LIST',
      },
      {
        key: 'bedrooms', label: 'Bedrooms', subLabel: '(Budget & Basics)',
        type: 'single', valueType: 'MIN_PLUS_INT',
      },
      {
        key: 'area', label: 'Area', subLabel: '(Location & Lifestyle)',
        type: 'multi_text', valueType: 'STRING_LIST',
      },
    ],
  },
  {
    key: 'important',
    title: 'Important',
    dot: '🔵',
    dotColor: Colors.dot.important,
    fields: [
      {
        key: 'bathrooms', label: 'Bathrooms', subLabel: '(Budget & Basics)',
        type: 'single', valueType: 'MIN_PLUS_DECIMAL',
      },
      {
        key: 'school_rating', label: 'School Rating', subLabel: '(Interior Features)',
        type: 'range', valueType: 'RANGE',
        unit: '/10',
      },
      {
        key: 'basement', label: 'Basement', subLabel: '(Basement & Garage)',
        type: 'multi', valueType: 'STRING_LIST',
      },
      {
        key: 'parking', label: 'Parking', subLabel: '(Basement & Garage)',
        type: 'single', valueType: 'MIN_PLUS_INT',
      },
      {
        key: 'municipality', label: 'Municipality', subLabel: '(Location & Lifestyle)',
        type: 'multi', valueType: 'STRING_LIST',
      },
      {
        key: 'community', label: 'Community', subLabel: '(Location & Lifestyle)',
        type: 'multi', valueType: 'STRING_LIST',
      },
    ],
  },
  {
    key: 'low_priority',
    title: 'Low Priority',
    dot: '⚫',
    dotColor: Colors.dot.lowPriority,
    fields: [
      {
        key: 'backyard', label: 'Backyard', subLabel: '(Outdoor & Lot)',
        type: 'multi', valueType: 'STRING_LIST',
      },
      {
        key: 'lot_front', label: 'Lot Front', subLabel: '(Outdoor & Lot)',
        type: 'range', valueType: 'RANGE', unit: 'ft',
      },
      {
        key: 'lot_depth', label: 'Lot Depth', subLabel: '(Outdoor & Lot)',
        type: 'range', valueType: 'RANGE', unit: 'ft',
      },
      {
        key: 'age_of_property', label: 'Age of Property', subLabel: '(Property Condition)',
        type: 'multi', valueType: 'STRING_LIST',
      },
    ],
  },
  {
    key: 'not_important',
    title: 'Not Important',
    dot: '⚫',
    dotColor: Colors.dot.notImportant,
    fields: [
      {
        key: 'community_pref', label: 'Community Pref.', subLabel: '(Interior Features)',
        type: 'multi', valueType: 'STRING_LIST',
      },
    ],
  },
];


