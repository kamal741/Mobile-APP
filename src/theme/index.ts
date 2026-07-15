/**
 * @file theme/index.ts
 * @description Single entry point for the entire design system.
 *              Import everything you need from '@/theme' — never import individual files.
 *
 * ─── Quick Reference ─────────────────────────────────────────────────────────
 *
 * import { theme, colors, typography, spacing, shadows, border, globalStyles } from '@/theme';
 *
 * // Color token
 * color: colors.text.primary
 * color: theme.colors.text.primary          // identical
 *
 * // Typography
 * style={typography.h2}
 * style={theme.typography.h2}
 *
 * // Spacing value
 * padding: spacing.md                       // → 8
 * gap:     theme.spacing['3xl']             // → 16
 *
 * // Spacing helper (returns style object)
 * style={padX('3xl')}                       // → { paddingHorizontal: 16 }
 *
 * // Shadow
 * style={[styles.card, shadows.card]}
 *
 * // Border token
 * borderRadius: border.radius.card          // → 12
 * borderWidth:  border.width.thin           // → 1
 *
 * // Pre-composed border shorthands
 * style={[styles.panel, border.card]}       // adds borderWidth + borderColor + borderRadius
 *
 * // Global component style
 * <View style={globalStyles.card}>
 * <View style={[globalStyles.card, { marginBottom: spacing.xl }]}>
 *
 * // Text-only styles (not in StyleSheet.create)
 * <Text style={textStyles.fieldLabel}>Name</Text>
 *
 * // Domain types
 * import type { Client, Property, AlertModalState } from '@/theme';
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ── Token exports ──────────────────────────────────────────────────────────────
export { colors }                        from './colors';
export { typography, fontSize, fontWeight, lineHeight, letterSpacing } from './typography';
export { spacing, space, inset, pad, padXY, padX, padY, mar, marB, marT, gap } from './spacing';
export { shadows }                       from './shadows';
export { border, radius, borderWidth, borderRadius } from './border';

// ── Global StyleSheet export ───────────────────────────────────────────────────
export { globalStyles, textStyles }      from './globalStyles';

// ── Type exports ───────────────────────────────────────────────────────────────
export type { Colors }       from './colors';
export type { Typography }   from './typography';
export type { Spacing }      from './spacing';
export type { Shadows }      from './shadows';
export type { Border }       from './border';
export type { GlobalStyles } from './globalStyles';

// Domain types
export type {
  PageDto,
  ClientType,
  FilterType,
  Client,
  AddClientPayload,
  ClientHistorySummary,
  ClientHistory,
  ClientProfileStats,
  ProfileMenuItem,
  AgentClientApiItem,
  Property,
  SelectedProperty,
  AlertButton,
  AlertModalState,
} from './types';

// ─── Composed Theme Object ────────────────────────────────────────────────────
// Use this when you need to pass the entire theme to a context or styled-component system.
import { colors }      from './colors';
import { typography }  from './typography';
import { spacing }     from './spacing';
import { shadows }     from './shadows';
import { border }      from './border';
import { globalStyles } from './globalStyles';

export const theme = {
  colors,
  typography,
  spacing,
  shadows,
  border,
  globalStyles,
} as const;

export type Theme = typeof theme;

// ─── ThemeContext helper (optional) ───────────────────────────────────────────
// Uncomment if you add React context-based theming (e.g. dark mode):
//
// import React, { createContext, useContext } from 'react';
// const ThemeContext = createContext<Theme>(theme);
// export const ThemeProvider = ThemeContext.Provider;
// export const useTheme = () => useContext(ThemeContext);
