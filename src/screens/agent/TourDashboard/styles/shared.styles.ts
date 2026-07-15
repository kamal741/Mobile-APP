import { StyleSheet } from 'react-native';

/** Design tokens — reference these in all feature style files */
export const colors = {
  bgPage:        '#f8fafc',
  bgCard:        '#fff',
  bgMuted:       '#fafafa',
  bgSelected:    '#eff6ff',
  bgBadge:       '#f1f5f9',
  bgCancelBtn:   '#f1f5f9',

  border:        '#e2e8f0',
  borderActive:  '#1e40af',

  textPrimary:   '#1e293b',
  textSecondary: '#64748b',
  textMuted:     '#94a3b8',
  textBadge:     '#475569',

  blue:          '#1e40af',
  green:         '#16a34a',
  red:           '#ef4444',
  white:         '#fff',
} as const;

export const radius = {
  sm: 6,
  md: 8,
  lg: 10,
  xl: 12,
  pill: 14,
  card: 16,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

/** Reusable style fragments shared across multiple screens */
export const sharedStyles = StyleSheet.create({
  flex1: { flex: 1 },

  searchInput: {
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },

  emptyText: {
    textAlign: 'center',
    color: colors.textMuted,
    paddingVertical: spacing.xl,
  },

  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },

  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 6,
  },

  formInput: {
    backgroundColor: colors.bgPage,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.textPrimary,
  },

  typeBadge: {
    backgroundColor: colors.bgBadge,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.sm,
    alignSelf: 'flex-start',
    marginTop: 6,
  },

  typeBadgeText: {
    fontSize: 11,
    color: colors.textBadge,
    fontWeight: '500',
    textTransform: 'capitalize',
  },

  selectCard: {
    backgroundColor: colors.bgCard,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.xl,
    padding: 14,
    marginBottom: 10,
  },

  selectCardActive: {
    borderColor: colors.borderActive,
    backgroundColor: colors.bgSelected,
  },

  selectCardContent: { flexDirection: 'row', alignItems: 'center' },
  selectCardInfo:    { flex: 1 },

  selectCardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },

  selectCardSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },

  checkIcon: {
    fontSize: 20,
    color: colors.blue,
    fontWeight: '700',
    marginLeft: 12,
  },
});
