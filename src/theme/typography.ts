/**
 * @file theme/typography.ts
 * @description Full typography system extracted from existing stylesheets.
 *              Every text variant is pre-composed and ready for use via StyleSheet.
 *
 * Usage:
 *   import { typography } from '@/theme';
 *   <Text style={typography.heading1}>Hello</Text>
 */

import { TextStyle } from 'react-native';
import { colors } from './colors';

// ─── Font Family ───────────────────────────────────────────────────────────────
// Swap with your custom font names here if needed (e.g., 'Inter', 'Sora').
// React Native will fall back to system font if the name is not registered.
export const fontFamily = {
  regular:  undefined,  // system default
  medium:   undefined,
  semiBold: undefined,
  bold:     undefined,
  extraBold: undefined,
} as const;

// ─── Font Size Scale (from existing styles) ────────────────────────────────────
export const fontSize = {
  tiny:   10,   // badge text, uppercase labels
  xs:     11,   // caption, meta, tab text, secondary labels
  sm:     12,   // small body, card meta
  base:   13,   // default body
  md:     14,   // body copy, modal detail
  lg:     15,   // button text, prominent body
  xl:     16,   // card titles, pending title
  '2xl':  18,   // modal title, schedule title
  '3xl':  24,   // section headings
  '4xl':  32,   // screen titles
  hero:   44,   // large hero numbers (e.g., tour count)
} as const;

// ─── Font Weight Scale ─────────────────────────────────────────────────────────
export const fontWeight = {
  regular:   '400' as TextStyle['fontWeight'],
  medium:    '500' as TextStyle['fontWeight'],
  semiBold:  '600' as TextStyle['fontWeight'],
  bold:      '700' as TextStyle['fontWeight'],
  extraBold: '800' as TextStyle['fontWeight'],
} as const;

// ─── Line Height Scale ─────────────────────────────────────────────────────────
export const lineHeight = {
  tight:   16,
  snug:    20,
  normal:  24,
  relaxed: 28,
  loose:   32,
  hero:    52,
} as const;

// ─── Letter Spacing ────────────────────────────────────────────────────────────
export const letterSpacing = {
  none:  0,
  tight: -0.3,
  wide:  0.5,
  wider: 0.8,   // section labels, uppercase badges
} as const;

// ─── Composed Typography Variants ─────────────────────────────────────────────
// Each variant is a complete TextStyle object — just spread onto a <Text> style.
export const typography = {

  // ── Display / Hero ──────────────────────────────────────────────────────────
  heroNumber: {
    fontSize:   fontSize.hero,
    fontWeight: fontWeight.extraBold,
    color:      colors.success.default,
    lineHeight: lineHeight.hero,
  } satisfies TextStyle,

  // ── Headings ────────────────────────────────────────────────────────────────
  appTitle: {
    fontSize:   fontSize['4xl'],
    fontWeight: fontWeight.extraBold,
    color:      colors.text.primary,
    lineHeight: lineHeight.loose,
  } satisfies TextStyle,

  screenTitle: {
    fontSize:   fontSize['3xl'],
    fontWeight: fontWeight.bold,
    color:      colors.text.primary,
    lineHeight: lineHeight.relaxed,
  } satisfies TextStyle,

  h1: {
    fontSize:   fontSize['2xl'],
    fontWeight: fontWeight.bold,
    color:      colors.text.primary,
    lineHeight: lineHeight.relaxed,
  } satisfies TextStyle,

  h2: {
    fontSize:   fontSize.xl,
    fontWeight: fontWeight.bold,
    color:      colors.text.primary,
    lineHeight: lineHeight.normal,
  } satisfies TextStyle,

  h3: {
    fontSize:   fontSize.lg,
    fontWeight: fontWeight.bold,
    color:      colors.text.primary,
    lineHeight: lineHeight.normal,
  } satisfies TextStyle,

  h4: {
    fontSize:   fontSize.md,
    fontWeight: fontWeight.bold,
    color:      colors.text.primary,
    lineHeight: lineHeight.snug,
  } satisfies TextStyle,

  sectionTitle: {
    fontSize:      fontSize.xs,
    fontWeight:    fontWeight.bold,
    color:         colors.text.muted,
    letterSpacing: letterSpacing.wider,
    textTransform: 'uppercase' as TextStyle['textTransform'],
    lineHeight:    lineHeight.tight,
  } satisfies TextStyle,

  // ── Subheadings ─────────────────────────────────────────────────────────────
  subheading: {
    fontSize:   fontSize.md,
    fontWeight: fontWeight.semiBold,
    color:      colors.text.secondary,
    lineHeight: lineHeight.snug,
  } satisfies TextStyle,

  // ── Body ────────────────────────────────────────────────────────────────────
  bodyRegular: {
    fontSize:   fontSize.md,
    fontWeight: fontWeight.regular,
    color:      colors.text.primary,
    lineHeight: lineHeight.normal,
  } satisfies TextStyle,

  bodyMedium: {
    fontSize:   fontSize.md,
    fontWeight: fontWeight.medium,
    color:      colors.text.primary,
    lineHeight: lineHeight.normal,
  } satisfies TextStyle,

  bodyBold: {
    fontSize:   fontSize.md,
    fontWeight: fontWeight.bold,
    color:      colors.text.primary,
    lineHeight: lineHeight.normal,
  } satisfies TextStyle,

  bodySmall: {
    fontSize:   fontSize.sm,
    fontWeight: fontWeight.regular,
    color:      colors.text.secondary,
    lineHeight: lineHeight.snug,
  } satisfies TextStyle,

  // ── Button Text ─────────────────────────────────────────────────────────────
  buttonPrimary: {
    fontSize:   fontSize.lg,
    fontWeight: fontWeight.semiBold,
    color:      colors.text.inverse,
    lineHeight: lineHeight.snug,
  } satisfies TextStyle,

  buttonSecondary: {
    fontSize:   fontSize.lg,
    fontWeight: fontWeight.semiBold,
    color:      colors.primary.default,
    lineHeight: lineHeight.snug,
  } satisfies TextStyle,

  buttonSmall: {
    fontSize:   fontSize.sm,
    fontWeight: fontWeight.bold,
    color:      colors.text.inverse,
    lineHeight: lineHeight.snug,
  } satisfies TextStyle,

  // ── Tab & Navigation ────────────────────────────────────────────────────────
  tabLabel: {
    fontSize:   fontSize.xs,
    fontWeight: fontWeight.medium,
    color:      colors.text.muted,
    lineHeight: lineHeight.tight,
    textAlign:  'center' as TextStyle['textAlign'],
  } satisfies TextStyle,

  tabLabelActive: {
    fontSize:   fontSize.xs,
    fontWeight: fontWeight.bold,
    color:      colors.text.primary,
    lineHeight: lineHeight.tight,
    textAlign:  'center' as TextStyle['textAlign'],
  } satisfies TextStyle,

  // ── Label / Meta ────────────────────────────────────────────────────────────
  label: {
    fontSize:   fontSize.sm,
    fontWeight: fontWeight.semiBold,
    color:      colors.text.primary,
    lineHeight: lineHeight.snug,
  } satisfies TextStyle,

  labelMuted: {
    fontSize:   fontSize.xs,
    fontWeight: fontWeight.regular,
    color:      colors.text.muted,
    lineHeight: lineHeight.tight,
  } satisfies TextStyle,

  // ── Caption & Tiny ──────────────────────────────────────────────────────────
  caption: {
    fontSize:   fontSize.xs,
    fontWeight: fontWeight.regular,
    color:      colors.text.secondary,
    lineHeight: lineHeight.tight,
  } satisfies TextStyle,

  captionBold: {
    fontSize:   fontSize.xs,
    fontWeight: fontWeight.semiBold,
    color:      colors.text.secondary,
    lineHeight: lineHeight.tight,
  } satisfies TextStyle,

  tiny: {
    fontSize:      fontSize.tiny,
    fontWeight:    fontWeight.bold,
    color:         colors.text.dark,
    letterSpacing: letterSpacing.wide,
    textTransform: 'uppercase' as TextStyle['textTransform'],
    lineHeight:    lineHeight.tight,
  } satisfies TextStyle,

  // ── Utility ─────────────────────────────────────────────────────────────────
  placeholder: {
    fontSize:    fontSize.md,
    fontWeight:  fontWeight.regular,
    color:       colors.text.muted,
    fontStyle:   'italic' as TextStyle['fontStyle'],
    lineHeight:  lineHeight.snug,
  } satisfies TextStyle,

  timestamp: {
    fontSize:   fontSize.xs,
    fontWeight: fontWeight.regular,
    color:      colors.text.muted,
    lineHeight: lineHeight.tight,
    textAlign:  'center' as TextStyle['textAlign'],
  } satisfies TextStyle,

} as const;

export type Typography = typeof typography;
