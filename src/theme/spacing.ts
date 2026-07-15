/**
 * @file theme/spacing.ts
 * @description 8-point spacing system with semantic aliases and layout helpers.
 *              All values extracted and reconciled from existing stylesheets.
 *
 * Usage:
 *   import { spacing, padding, margin } from '@/theme';
 *   paddingHorizontal: spacing.md         // → 16
 *   ...padding.x('md')                    // → { paddingHorizontal: 16 }
 */

// ─── Base 8-point Scale ────────────────────────────────────────────────────────
export const spacing = {
  none:   0,
  xxs:    2,   // accent bar width, tiny gaps
  xs:     4,   // icon padding, tight gaps
  sm:     6,   // badge padding, small gaps
  md:     8,   // standard gap unit
  lg:     10,  // list item padding, component gaps
  xl:     12,  // inner component padding
  '2xl':  14,  // section gaps
  '3xl':  16,  // screen horizontal padding
  '4xl':  18,  // card padding
  '5xl':  20,  // modal horizontal padding
  '6xl':  24,  // section vertical spacing  (also aliased as xxl)
  '7xl':  28,  // avatar / icon sizes
  '8xl':  36,  // modal bottom padding
  '9xl':  48,  // empty state vertical padding
  '10xl': 56,  // large empty state padding

  // ── Friendly short aliases (from shared.styles files) ─────────────────────
  // These map the simple xs/sm/md/lg/xl/xxl/xxxl names used in feature
  // style files onto the same underlying values so both naming conventions work.
  /** 4  — same as xs   */ feXs:   4,
  /** 8  — same as md   */ feSm:   8,
  /** 12 — same as xl   */ feMd:   12,
  /** 16 — same as 3xl  */ feLg:   16,
  /** 20 — same as 5xl  */ feXl:   20,
  /** 24 — same as 6xl  */ feXxl:  24,
  /** 32               */ feXxxl: 32,
} as const;

// Semantic aliases — use these in components for readability
export const space = {
  /** 0  */ none:    spacing.none,
  /** 2  */ hairline: spacing.xxs,
  /** 4  */ xs:      spacing.xs,
  /** 6  */ sm:      spacing.sm,
  /** 8  */ md:      spacing.md,
  /** 10 */ lg:      spacing.lg,
  /** 12 */ xl:      spacing.xl,
  /** 14 */ '2xl':   spacing['2xl'],
  /** 16 */ '3xl':   spacing['3xl'],
  /** 18 */ '4xl':   spacing['4xl'],
  /** 20 */ '5xl':   spacing['5xl'],
  /** 24 */ '6xl':   spacing['6xl'],
  /** 28 */ '7xl':   spacing['7xl'],
  /** 36 */ '8xl':   spacing['8xl'],
  /** 48 */ '9xl':   spacing['9xl'],
  /** 56 */ '10xl':  spacing['10xl'],
} as const;

// ─── Semantic Spatial Tokens ───────────────────────────────────────────────────
// Map common use-cases to a spacing value so you never guess.
export const inset = {
  screenHorizontal: spacing['3xl'],  // 16 — standard screen side padding
  cardPadding:      spacing['4xl'],  // 18 — inside card / panel
  modalHorizontal:  spacing['5xl'],  // 20 — modal paddingHorizontal
  modalBottom:      spacing['8xl'],  // 36 — modal paddingBottom
  sectionGap:       spacing['2xl'],  // 14 — gap between major sections
  componentGap:     spacing.xl,      // 12 — gap between sibling components
  itemGap:          spacing.md,      // 8  — gap between list items / icons
  tightGap:         spacing.sm,      // 6  — tight icon/badge gaps
} as const;

// ─── Shorthand Helper Factories ────────────────────────────────────────────────
type SpacingKey = keyof typeof spacing;

/** Returns { padding: value } */
export const pad = (key: SpacingKey) => ({ padding: spacing[key] });

/** Returns { paddingVertical, paddingHorizontal } */
export const padXY = (yKey: SpacingKey, xKey: SpacingKey) => ({
  paddingVertical:   spacing[yKey],
  paddingHorizontal: spacing[xKey],
});

/** Returns { paddingHorizontal: value } */
export const padX = (key: SpacingKey) => ({ paddingHorizontal: spacing[key] });

/** Returns { paddingVertical: value } */
export const padY = (key: SpacingKey) => ({ paddingVertical: spacing[key] });

/** Returns { margin: value } */
export const mar = (key: SpacingKey) => ({ margin: spacing[key] });

/** Returns { marginBottom: value } */
export const marB = (key: SpacingKey) => ({ marginBottom: spacing[key] });

/** Returns { marginTop: value } */
export const marT = (key: SpacingKey) => ({ marginTop: spacing[key] });

/** Returns { gap: value } */
export const gap = (key: SpacingKey) => ({ gap: spacing[key] });

export type Spacing = typeof spacing;
