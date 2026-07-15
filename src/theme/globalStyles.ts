/**
 * @file theme/globalStyles.ts
 * @description Reusable StyleSheet definitions for common UI patterns.
 *              Import and spread into component-level StyleSheets — do not use directly
 *              as a StyleSheet prop (flatten / spread first).
 *
 * Usage:
 *   import { globalStyles } from '@/theme';
 *
 *   // Spread into a component stylesheet
 *   const styles = StyleSheet.create({
 *     wrapper: { ...globalStyles.card, marginBottom: 12 },
 *   });
 *
 *   // Or use directly on a View:
 *   <View style={globalStyles.screenContainer}>
 */

import { StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { colors } from './colors';
import { spacing, inset } from './spacing';
import { radius, border as borderTokens } from './border';
import { shadows } from './shadows';
import { typography } from './typography';

// ─── Layout ────────────────────────────────────────────────────────────────────
export const globalStyles = StyleSheet.create({

  // ── Screen / Safe-area containers ─────────────────────────────────────────
  screenContainer: {
    flex: 1,
    backgroundColor: colors.background.screen,
  } as ViewStyle,

  screenContent: {
    padding: inset.screenHorizontal,
    gap:     inset.sectionGap,
  } as ViewStyle,

  safeContainer: {
    flex: 1,
    backgroundColor: colors.background.screen,
  } as ViewStyle,

  flex1: { flex: 1 } as ViewStyle,

  // ── Cards & Surfaces ───────────────────────────────────────────────────────
  card: {
    backgroundColor: colors.background.surface,
    borderRadius:    radius.card,
    borderWidth:     borderTokens.width.thin,
    borderColor:     colors.border.default,
    padding:         inset.cardPadding,
  } as ViewStyle,

  cardFlat: {
    backgroundColor: colors.background.surface,
    borderRadius:    radius.card,
    padding:         inset.cardPadding,
  } as ViewStyle,

  cardElevated: {
    backgroundColor: colors.background.surface,
    borderRadius:    radius.card,
    padding:         inset.cardPadding,
    ...shadows.card,
  } as ViewStyle,

  /** Card with hidden overflow — use when children clip to rounded corners */
  cardClipped: {
    backgroundColor: colors.background.surface,
    borderRadius:    radius.card,
    borderWidth:     borderTokens.width.thin,
    borderColor:     colors.border.default,
    overflow:        'hidden',
  } as ViewStyle,

  // ── Row / Column Layouts ───────────────────────────────────────────────────
  row: {
    flexDirection: 'row',
    alignItems:    'center',
  } as ViewStyle,

  rowSpaceBetween: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
  } as ViewStyle,

  rowWrap: {
    flexDirection: 'row',
    flexWrap:      'wrap',
  } as ViewStyle,

  col: {
    flexDirection: 'column',
  } as ViewStyle,

  // ── Centering ──────────────────────────────────────────────────────────────
  centered: {
    alignItems:     'center',
    justifyContent: 'center',
  } as ViewStyle,

  centeredFull: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
  } as ViewStyle,

  // ── Dividers ───────────────────────────────────────────────────────────────
  divider: {
    height:          borderTokens.width.thin,
    backgroundColor: colors.border.default,
    marginVertical:  spacing.xl,
  } as ViewStyle,

  dividerLight: {
    height:          borderTokens.width.thin,
    backgroundColor: colors.border.light,
    marginVertical:  spacing.md,
  } as ViewStyle,

  // ── Modal / Bottom Sheet ───────────────────────────────────────────────────
  modalBackdrop: {
    flex:            1,
    backgroundColor: colors.overlay.dark,
    justifyContent:  'flex-end',
  } as ViewStyle,

  modalSheet: {
    backgroundColor:      colors.background.surface,
    borderTopLeftRadius:  radius.modal,
    borderTopRightRadius: radius.modal,
    paddingHorizontal:    inset.modalHorizontal,
    paddingBottom:        inset.modalBottom,
    paddingTop:           spacing.xl,
    maxHeight:            '85%' as any,
    ...shadows.modal,
  } as ViewStyle,

  modalHandle: {
    width:           40,
    height:          4,
    backgroundColor: colors.border.default,
    borderRadius:    radius.hairline,
    alignSelf:       'center',
    marginBottom:    spacing['3xl'],
  } as ViewStyle,

  // ── Buttons ────────────────────────────────────────────────────────────────
  btnBase: {
    borderRadius:    radius.btn,
    alignItems:      'center',
    justifyContent:  'center',
    paddingVertical: spacing['2xl'],
  } as ViewStyle,

  btnPrimary: {
    backgroundColor:   colors.primary.default,
    borderRadius:      radius.btn,
    alignItems:        'center',
    justifyContent:    'center',
    paddingVertical:   spacing['2xl'],
    paddingHorizontal: inset.cardPadding,
  } as ViewStyle,

  btnSecondary: {
    borderWidth:       borderTokens.width.thin,
    borderColor:       colors.border.mid,
    borderRadius:      radius.btn,
    alignItems:        'center',
    justifyContent:    'center',
    paddingVertical:   spacing['2xl'],
    paddingHorizontal: inset.cardPadding,
  } as ViewStyle,

  btnDanger: {
    borderWidth:     borderTokens.width.mid,
    borderColor:     colors.error.default,
    borderRadius:    radius.card,
    alignItems:      'center',
    justifyContent:  'center',
    paddingVertical: spacing['2xl'],
  } as ViewStyle,

  btnSuccess: {
    backgroundColor: colors.success.default,
    borderRadius:    radius.card,
    alignItems:      'center',
    justifyContent:  'center',
    paddingVertical: spacing['2xl'],
  } as ViewStyle,

  // ── Inputs ─────────────────────────────────────────────────────────────────
  inputBase: {
    backgroundColor:   colors.background.subtle,
    borderWidth:       borderTokens.width.thin,
    borderColor:       colors.border.default,
    borderRadius:      radius.btn,
    paddingVertical:   spacing.lg,
    paddingHorizontal: spacing['3xl'],
    fontSize:          14,
    color:             colors.text.primary,
  } as ViewStyle,

  /** Standard form input (white background, used inside cards/modals) */
  formInput: {
    backgroundColor:   colors.background.screen,
    borderWidth:       borderTokens.width.thin,
    borderColor:       colors.border.default,
    borderRadius:      radius.item,
    paddingHorizontal: 14,
    paddingVertical:   12,
    fontSize:          14,
    color:             colors.text.primary,
  } as ViewStyle,

  /** Search input (white bg, full-width, with bottom margin) */
  searchInput: {
    backgroundColor:   colors.background.surface,
    borderWidth:       borderTokens.width.thin,
    borderColor:       colors.border.default,
    borderRadius:      radius.item,
    paddingHorizontal: 14,
    paddingVertical:   12,
    fontSize:          14,
    color:             colors.text.primary,
    marginBottom:      spacing['3xl'],
  } as ViewStyle,

  /** Input row with leading icon */
  inputWithIcon: {
    flexDirection:     'row',
    alignItems:        'center',
    borderWidth:       borderTokens.width.thin,
    borderColor:       colors.border.default,
    borderRadius:      radius.item,
    paddingHorizontal: spacing.xl,
    marginBottom:      spacing['3xl'],
    backgroundColor:   colors.background.surface,
  } as ViewStyle,

  /** Inner TextInput inside inputWithIcon */
  textInput: {
    flex:     1,
    height:   46,
    fontSize: 14,
    color:    colors.text.primary,
  } as ViewStyle,

  inputFocused: {
    borderWidth: borderTokens.width.mid,
    borderColor: colors.border.active,
  } as ViewStyle,

  inputError: {
    borderWidth: borderTokens.width.mid,
    borderColor: colors.error.default,
  } as ViewStyle,

  // ── Select Cards (type / option picker) ───────────────────────────────────
  /** Tappable option card with border */
  selectCard: {
    backgroundColor: colors.background.surface,
    borderWidth:     1.5,
    borderColor:     colors.border.default,
    borderRadius:    radius.card,
    padding:         14,
    marginBottom:    10,
  } as ViewStyle,

  /** Active / selected state for selectCard */
  selectCardActive: {
    borderColor:     colors.border.active,
    backgroundColor: colors.background.selected,
  } as ViewStyle,

  selectCardContent: {
    flexDirection: 'row',
    alignItems:    'center',
  } as ViewStyle,

  selectCardInfo: { flex: 1 } as ViewStyle,

  // ── Badges ─────────────────────────────────────────────────────────────────
  badge: {
    borderRadius:      radius.full,
    minWidth:          22,
    height:            22,
    justifyContent:    'center',
    alignItems:        'center',
    paddingHorizontal: spacing.sm,
  } as ViewStyle,

  badgePrimary: {
    backgroundColor:   colors.primary.default,
    borderRadius:      radius.full,
    minWidth:          22,
    height:            22,
    justifyContent:    'center',
    alignItems:        'center',
    paddingHorizontal: spacing.sm,
  } as ViewStyle,

  badgeDanger: {
    backgroundColor:   colors.error.default,
    borderRadius:      radius.full,
    minWidth:          22,
    height:            22,
    justifyContent:    'center',
    alignItems:        'center',
    paddingHorizontal: spacing.sm,
  } as ViewStyle,

  // Status badge variants
  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical:   spacing.xxs + 1,
    borderRadius:      radius.badge,
  } as ViewStyle,

  statusScheduled:  { backgroundColor: colors.primary.light } as ViewStyle,
  statusRequested:  { backgroundColor: colors.background.subtle } as ViewStyle,
  statusInProgress: { backgroundColor: colors.warning.light } as ViewStyle,
  statusCompleted:  { backgroundColor: colors.success.light } as ViewStyle,
  statusCancelled:  { backgroundColor: colors.error.light } as ViewStyle,

  /** Small type / category badge (e.g. "buyer", "renter") */
  typeBadge: {
    backgroundColor:   colors.background.badge,
    paddingHorizontal: spacing.md,
    paddingVertical:   3,
    borderRadius:      radius.chipSm,
    alignSelf:         'flex-start',
    marginTop:         6,
  } as ViewStyle,

  // ── Avatar Placeholder ─────────────────────────────────────────────────────
  avatarSm: {
    width:           32,
    height:          32,
    borderRadius:    radius.full,
    backgroundColor: colors.primary.light,
    alignItems:      'center',
    justifyContent:  'center',
  } as ViewStyle,

  avatarMd: {
    width:           40,
    height:          40,
    borderRadius:    radius.full,
    backgroundColor: colors.primary.light,
    alignItems:      'center',
    justifyContent:  'center',
  } as ViewStyle,

  avatarLg: {
    width:           56,
    height:          56,
    borderRadius:    radius.full,
    backgroundColor: colors.primary.light,
    alignItems:      'center',
    justifyContent:  'center',
  } as ViewStyle,

  // ── Icon Sizes ─────────────────────────────────────────────────────────────
  iconSm: { width: 16, height: 16 } as ViewStyle,
  iconMd: { width: 22, height: 22 } as ViewStyle,
  iconLg: { width: 32, height: 32 } as ViewStyle,

  // Icon action button (circular)
  iconActionSm: {
    width:          28,
    height:         28,
    borderRadius:   radius.iconBtn,
    alignItems:     'center',
    justifyContent: 'center',
  } as ViewStyle,

  iconActionAccept: {
    width:          28,
    height:         28,
    borderRadius:   radius.iconBtn,
    borderWidth:    borderTokens.width.thick,
    borderColor:    colors.success.default,
    alignItems:     'center',
    justifyContent: 'center',
  } as ViewStyle,

  iconActionReject: {
    width:          28,
    height:         28,
    borderRadius:   radius.iconBtn,
    borderWidth:    borderTokens.width.thick,
    borderColor:    colors.error.default,
    alignItems:     'center',
    justifyContent: 'center',
  } as ViewStyle,

  // ── Tab Bar ────────────────────────────────────────────────────────────────
  tabBar: {
    flexDirection:     'row',
    borderBottomWidth: borderTokens.width.thin,
    borderBottomColor: colors.border.default,
    marginBottom:      spacing['4xl'],
  } as ViewStyle,

  tabItem: {
    flex:              1,
    minHeight:         44,
    paddingHorizontal: spacing.md,
    paddingBottom:     spacing.lg,
    alignItems:        'center',
    justifyContent:    'center',
    position:          'relative',
  } as ViewStyle,

  tabActiveUnderline: {
    position:        'absolute',
    bottom:          0,
    left:            spacing.md,
    right:           spacing.md,
    height:          2,
    backgroundColor: colors.primary.default,
    borderRadius:    radius.hairline,
  } as ViewStyle,

  // ── Empty States ───────────────────────────────────────────────────────────
  emptyState: {
    flex:            1,
    alignItems:      'center',
    justifyContent:  'center',
    paddingVertical: spacing['10xl'],
    gap:             spacing.xl,
  } as ViewStyle,

  // ── Notes / Callout Box ────────────────────────────────────────────────────
  noteBox: {
    backgroundColor: colors.note.bg,
    borderRadius:    radius.btn,
    padding:         spacing.xl,
    borderWidth:     borderTokens.width.thin,
    borderColor:     colors.note.border,
  } as ViewStyle,

  // ── Prop / List Detail Item ────────────────────────────────────────────────
  detailItem: {
    flexDirection:   'row',
    alignItems:      'flex-start',
    backgroundColor: colors.background.subtle,
    borderRadius:    radius.item,
    padding:         spacing.lg,
    borderWidth:     borderTokens.width.thin,
    borderColor:     colors.border.default,
    marginBottom:    spacing.lg,
  } as ViewStyle,

});

// ─── Standalone text styles (not in StyleSheet.create — compose with TextStyle) ─
// These mirror the typography token shapes for one-off overrides.
export const textStyles = {
  /** Field / form label */
  fieldLabel: {
    fontSize:   14,
    fontWeight: '600' as const,
    color:      colors.text.primary,
    marginBottom: 6,
  } as TextStyle,

  /** Section label above a list group */
  sectionLabel: {
    fontSize:    14,
    fontWeight:  '600' as const,
    color:       colors.text.secondary,
    marginBottom: 8,
    marginLeft:   4,
  } as TextStyle,

  /** Placeholder / empty state message */
  emptyText: {
    textAlign:     'center' as const,
    color:         colors.text.muted,
    paddingVertical: 20,
  } as TextStyle,

  /** Type badge label text ("buyer", "renter") */
  typeBadgeText: {
    fontSize:      11,
    color:         colors.text.badge,
    fontWeight:    '500' as const,
    textTransform: 'capitalize' as const,
  } as TextStyle,

  /** Select card primary label */
  selectCardTitle: {
    fontSize:   15,
    fontWeight: '600' as const,
    color:      colors.text.primary,
  } as TextStyle,

  /** Select card secondary label */
  selectCardSubtitle: {
    fontSize:  13,
    color:     colors.text.secondary,
    marginTop: 2,
  } as TextStyle,

  /** Checkmark icon inside a select card */
  checkIcon: {
    fontSize:   20,
    color:      colors.primary.default,
    fontWeight: '700' as const,
    marginLeft: 12,
  } as TextStyle,
};

export type GlobalStyles = typeof globalStyles;
