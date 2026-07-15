/**
 * @file theme/border.ts
 * @description Border radius and border width tokens extracted from existing stylesheets.
 *
 * Usage:
 *   import { border } from '@/theme';
 *   borderRadius: border.radius.card     // → 12
 *   borderWidth:  border.width.thin      // → 1
 */

import { colors } from './colors';

// ─── Border Radius ─────────────────────────────────────────────────────────────
export const borderRadius = {
  none:   0,
  xs:     2,    // accent bar, thin pill
  sm:     4,    // small chips, tight badges (shared.styles sm)
  md:     5,    // status badges
  lg:     7,    // small buttons, tags
  xl:     8,    // route buttons, note box / shared.styles md
  '2xl':  10,   // prop detail items, route cards / shared.styles lg
  '3xl':  12,   // cards, panels, pending panel, icon circles (large) / shared.styles xl
  '4xl':  14,   // circle icons (28px / 2) / shared.styles pill
  modal:  20,   // bottom sheet top corners
  pill:   21,   // fully rounded pill (client shared.styles pill)
  circle: 9999, // fully circular (avatar, badges)
} as const;

// Semantic aliases — use these in components
export const radius = {
  /** 2    */ hairline: borderRadius.xs,
  /** 4    */ chipSm:   borderRadius.sm,    // small chips / tight badges
  /** 5    */ badge:    borderRadius.md,
  /** 7    */ btnSm:    borderRadius.lg,
  /** 8    */ btn:      borderRadius.xl,
  /** 10   */ item:     borderRadius['2xl'],
  /** 12   */ card:     borderRadius['3xl'],
  /** 14   */ iconBtn:  borderRadius['4xl'],
  /** 20   */ modal:    borderRadius.modal,
  /** 21   */ pill:     borderRadius.pill,  // fully rounded pill buttons / avatars
  /** 9999 */ full:     borderRadius.circle,
} as const;

// ─── Border Widths ─────────────────────────────────────────────────────────────
export const borderWidth = {
  hairline: 0,   // no border (use 0 explicitly)
  thin:     1,   // standard card / input border
  mid:      1.5, // accent borders (reject button)
  thick:    2,   // icon action buttons (accept / reject circle)
} as const;

// ─── Pre-composed Border Shorthands ───────────────────────────────────────────
// These return a full style object and can be spread directly onto a component.
export const border = {
  radius,
  width: borderWidth,

  /** Standard card border — thin, default border color */
  card: {
    borderWidth: borderWidth.thin,
    borderColor: colors.border.default,
    borderRadius: radius.card,
  },

  /** Subtle item border — thin, light border color */
  item: {
    borderWidth: borderWidth.thin,
    borderColor: colors.border.default,
    borderRadius: radius.item,
  },

  /** Accent / emphasis border — mid-weight, primary color */
  accent: {
    borderWidth: borderWidth.mid,
    borderColor: colors.primary.default,
    borderRadius: radius.card,
  },

  /** Active / focused border — thin, primary color (inputs, select cards) */
  active: {
    borderWidth: borderWidth.thin,
    borderColor: colors.border.active,
  },

  /** Error/reject border — mid-weight, error color */
  danger: {
    borderWidth: borderWidth.mid,
    borderColor: colors.error.default,
    borderRadius: radius.card,
  },

  /** Bottom separator used in list items */
  separator: {
    borderBottomWidth: borderWidth.thin,
    borderBottomColor: colors.border.light,
  },

  /** Divider line (full-width horizontal rule) */
  divider: {
    height: borderWidth.thin,
    backgroundColor: colors.border.default,
  },

  /** Modal bottom sheet top radius only */
  modalSheet: {
    borderTopLeftRadius:  radius.modal,
    borderTopRightRadius: radius.modal,
  },
} as const;

export type Border = typeof border;
