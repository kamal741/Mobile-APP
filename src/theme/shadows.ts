/**
 * @file theme/shadows.ts
 * @description Cross-platform shadow tokens (iOS shadowXxx + Android elevation).
 *              The existing stylesheets use borders instead of shadows — these tokens
 *              introduce a layered elevation system for future use.
 *
 * Usage:
 *   import { shadows } from '@/theme';
 *   style={[styles.card, shadows.card]}
 *
 * ⚠️  React Native applies shadows differently per platform:
 *     • iOS  — shadowColor / shadowOffset / shadowOpacity / shadowRadius
 *     • Android — elevation (casts a system shadow)
 *     Both are included in every token so you can spread safely on either platform.
 */

import { ViewStyle } from 'react-native';
import { colors } from './colors';

type Shadow = Pick<
  ViewStyle,
  'shadowColor' | 'shadowOffset' | 'shadowOpacity' | 'shadowRadius' | 'elevation'
>;

// ─── Shadow Definitions ────────────────────────────────────────────────────────
export const shadows = {

  /** No shadow — explicit reset */
  none: {
    shadowColor:   'transparent',
    shadowOffset:  { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius:  0,
    elevation:     0,
  } satisfies Shadow,

  /** Very subtle lift — used for bordered list items that need slight depth */
  xs: {
    shadowColor:   colors.palette.slate800,
    shadowOffset:  { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius:  2,
    elevation:     1,
  } satisfies Shadow,

  /** Small shadow — standard cards and panels (replaces border-only approach) */
  sm: {
    shadowColor:   colors.palette.slate800,
    shadowOffset:  { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius:  4,
    elevation:     2,
  } satisfies Shadow,

  /** Card shadow — primary card elevation (most used) */
  card: {
    shadowColor:   colors.palette.slate800,
    shadowOffset:  { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius:  6,
    elevation:     3,
  } satisfies Shadow,

  /** Medium shadow — elevated panels, dropdowns, popovers */
  md: {
    shadowColor:   colors.palette.slate800,
    shadowOffset:  { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius:  8,
    elevation:     5,
  } satisfies Shadow,

  /** Large shadow — floating action buttons, bottom sheets pre-open */
  lg: {
    shadowColor:   colors.palette.slate800,
    shadowOffset:  { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius:  12,
    elevation:     8,
  } satisfies Shadow,

  /** Modal / overlay shadow — bottom sheets, full-screen overlays */
  modal: {
    shadowColor:   colors.palette.slate900,
    shadowOffset:  { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius:  16,
    elevation:     16,
  } satisfies Shadow,

  /** Floating card — hero stats card, drawer handles */
  floating: {
    shadowColor:   colors.palette.blue800,
    shadowOffset:  { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius:  20,
    elevation:     12,
  } satisfies Shadow,

} as const;

export type Shadows = typeof shadows;
