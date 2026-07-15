import { StyleSheet } from 'react-native';
import { colors, typography, spacing, shadows, border, textStyles } from '@/theme';

export const componentStyles = StyleSheet.create({

  // ── Progress Banner ────────────────────────────────────────────────────────
  progressBanner: {
    backgroundColor: colors.primary.hover,
    borderRadius: border.radius.item,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.primary.light,
    gap: spacing.md,
  },
  progressBannerError: {
    backgroundColor: colors.error.light,
    borderColor: colors.error.default,
  },
  progressBannerSuccess: {
    backgroundColor: colors.success.light,
    borderColor: colors.success.border,
  },
  progressTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  progressIconWrap: {
    marginRight: spacing.sm,
  },
  progressText: {
    ...typography.bodySmall,
    color: colors.primary.default,
    flex: 1,
  },
  progressCount: {
    ...typography.captionBold,
    color: colors.primary.default,
  },
  progressTrack: {
    height: 4,
    backgroundColor: colors.border.default,
    borderRadius: 2,
    overflow: 'hidden' as const,
  },
  progressFill: {
    height: 4,
    backgroundColor: colors.primary.default,
    borderRadius: 2,
  },

  // ── Picker Buttons ─────────────────────────────────────────────────────────
  pickerRow: {
    flexDirection: 'row',
  },
  pickerBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background.subtle,
    borderRadius: border.radius.item,
    borderWidth: 1.5,
    borderColor: colors.border.default,
    borderStyle: 'dashed' as const,
    paddingVertical: spacing['4xl'],
    gap: spacing.xs,
  },
  pickerIconWrap: {
    width: 40,
    height: 40,
    borderRadius: border.radius.full,
    backgroundColor: colors.primary.hover,
    borderWidth: 1,
    borderColor: colors.primary.light,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  pickerBtnLabel: {
    ...typography.label,
    color: colors.text.primary,
  },
  pickerBtnSub: {
    ...typography.caption,
    color: colors.text.muted,
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.error.light,
    borderRadius: border.radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: (colors.error as any).border ?? colors.error.light,
  },
  clearBtnText: {
    ...typography.captionBold,
    color: colors.error.default,
  },

  // ── Section Header ─────────────────────────────────────────────────────────
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sectionIconWrap: {
    width: 22,
    height: 22,
    borderRadius: border.radius.full,
    backgroundColor: colors.primary.hover,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionLabel: {
    ...textStyles.sectionLabel,
    flex: 1,
  },
  sectionCount: {
    backgroundColor: colors.background.subtle,
    borderRadius: border.radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  sectionCountText: {
    ...typography.caption,
    color: colors.text.secondary,
    fontWeight: '600' as const,
  },

  // ── Tip Box ────────────────────────────────────────────────────────────────
  tipBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.note.bg,
    borderRadius: border.radius.item,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.note.border,
    gap: spacing.sm,
  },
  tipText: {
    ...typography.bodySmall,
    color: colors.note.text,
    flex: 1,
    lineHeight: 18,
  },

  // ── Guidelines Tips List ───────────────────────────────────────────────────
  tipsIconWrap: {
    width: 28,
    height: 28,
    borderRadius: border.radius.full,
    backgroundColor: (colors.warning as any).light ?? colors.background.subtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingTop: spacing.md,
  },
  tipRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: (colors.border as any).subtle ?? colors.border.default,
    paddingBottom: spacing.md,
  },
  tipNumber: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primary.hover,
    borderWidth: 1,
    borderColor: colors.primary.light,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  tipNumberText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: colors.primary.default,
  },
  tipRowText: {
    ...typography.bodySmall,
    flex: 1,
    color: colors.text.secondary,
    lineHeight: 18,
  },

  // ── Empty State ────────────────────────────────────────────────────────────
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing['6xl'],
    gap: spacing.sm,
  },
  emptyIconWrap: {
    width: 56,
    height: 56,
    borderRadius: border.radius.full,
    backgroundColor: colors.background.subtle,
    borderWidth: 1,
    borderColor: colors.border.default,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  emptyTitle: {
    ...typography.h4,
    color: colors.text.secondary,
  },
  emptyBody: {
    ...typography.caption,
    color: colors.text.muted,
    textAlign: 'center' as const,
    maxWidth: 220,
    lineHeight: 18,
  },

  // ── Delete Confirmation Dialog ─────────────────────────────────────────────
  dialogOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing['3xl'],
  },
  dialogBox: {
    width: '100%',
    backgroundColor: colors.background.surface,
    borderRadius: border.radius.card,
    padding: spacing['3xl'],
    alignItems: 'center',
    ...shadows.lg,
  },
  dialogIconWrap: {
    width: 56,
    height: 56,
    borderRadius: border.radius.full,
    backgroundColor: colors.error.light,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  dialogTitle: {
    ...typography.h3,
    marginBottom: spacing.md,
  },
  dialogBody: {
    ...typography.bodySmall,
    color: colors.text.secondary,
    textAlign: 'center' as const,
    marginBottom: spacing['3xl'],
  },
  dialogActions: {
    flexDirection: 'row',
    gap: spacing.md,
    width: '100%',
  },
  dialogBtnCancel: {
    flex: 1,
    paddingVertical: spacing.lg,
    borderRadius: border.radius.item,
    borderWidth: 1,
    borderColor: colors.border.default,
    alignItems: 'center',
  },
  dialogBtnCancelText: {
    ...typography.buttonSecondary,
  },
  dialogBtnDelete: {
    flex: 1,
    paddingVertical: spacing.lg,
    borderRadius: border.radius.item,
    backgroundColor: colors.error.default,
    alignItems: 'center',
  },
  dialogBtnDeleteText: {
    ...typography.buttonPrimary,
    color: '#fff',
  },
});
