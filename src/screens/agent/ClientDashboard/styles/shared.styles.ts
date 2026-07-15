import { StyleSheet } from 'react-native';

/** Design tokens shared across the entire Clients feature. */
export const colors = {
  // Backgrounds
  bgPage:    '#f8fafc',
  bgCard:    '#fff',
  bgMuted:   '#f1f5f9',
  bgHover:   '#eff6ff',

  // Borders
  border:    '#e2e8f0',
  borderLight: '#f1f5f9',

  // Text
  textPrimary:   '#0f172a',
  textSecondary: '#1e293b',
  textMuted:     '#64748b',
  textDisabled:  '#94a3b8',
  textBody:      '#374151',
  textInverted:  '#fff',

  // Brand
  brand:         '#1e40af',
  brandLight:    '#2563eb',

  // Semantics
  success:    '#16a34a',
  successBg:  '#f0fdf4',
  successBorder: '#bbf7d0',
  danger:     '#ef4444',
  purple:     '#9333ea',
  purpleBg:   '#faf5ff',
  purpleBorder: '#e9d5ff',
} as const;

export const radius = {
  sm: 4,
  md: 8,
  lg: 10,
  xl: 12,
  pill: 21,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
} as const;

/** Reusable style fragments — import and spread inside component stylesheets. */
export const sharedStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
    backgroundColor: colors.bgCard,
  },
  textInput: {
    flex: 1,
    height: 46,
    fontSize: 14,
    color: colors.textSecondary,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
});
 