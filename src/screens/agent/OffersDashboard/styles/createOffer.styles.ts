import { StyleSheet } from 'react-native';
import { C, SP, R, FW } from './shared.styles';

export const createOfferStyles = StyleSheet.create({
  // ── Step indicator bar ──────────────────────────────────────────────────
  stepBar: {
    flexDirection: 'row',
    backgroundColor: C.surface,
    paddingHorizontal: SP.base,
    paddingVertical: SP.md,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  stepItem: {
    flex: 1,
    alignItems: 'center',
    gap: SP.xs,
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: R.full,
    borderWidth: 2,
    borderColor: C.border,
    backgroundColor: C.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepActive: {
    borderColor: C.primary,
    backgroundColor: C.primary,
  },
  stepCompleted: {
    borderColor: C.checkGreen,
    backgroundColor: C.checkGreen,
  },
  stepNumber: {
    fontSize: 12,
    fontWeight: FW.semi,
    color: C.textMuted,
  },
  stepNumberActive: {
    color: C.textOnPrimary,
  },
  stepCheckmark: {
    fontSize: 12,
    color: C.textOnPrimary,
    fontWeight: FW.bold,
  },
  stepLabel: {
    fontSize: 10,
    color: C.textMuted,
    fontWeight: FW.medium,
    textAlign: 'center',
  },
  stepLabelActive: {
    color: C.primary,
    fontWeight: FW.semi,
  },
  stepLabelCompleted: {
    color: C.checkGreen,
  },
  stepConnector: {
    position: 'absolute',
    top: 14,
    left: '55%',
    right: '-55%',
    height: 2,
    backgroundColor: C.border,
  },
  stepConnectorDone: {
    backgroundColor: C.checkGreen,
  },

  // ── Step header (icon + title + subtitle) ──────────────────────────────
  stepHeader: {
    alignItems: 'center',
    paddingVertical: SP.xl,
    paddingHorizontal: SP.base,
  },
  stepHeaderIcon:     { fontSize: 36, marginBottom: SP.sm },
  stepHeaderTitle:    { fontSize: 20, fontWeight: FW.bold, color: C.text, marginBottom: SP.xs },
  stepHeaderSubtitle: { fontSize: 14, color: C.textSub, textAlign: 'center' },

  // ── Scroll content ─────────────────────────────────────────────────────
  scrollContent: {
    padding: SP.base,
    paddingBottom: SP.xxl,
  },

  // ── Footer ─────────────────────────────────────────────────────────────
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SP.base,
    paddingVertical: SP.md,
    backgroundColor: C.surface,
    borderTopWidth: 1,
    borderTopColor: C.border,
    gap: SP.sm,
  },
  backButton: {
    paddingHorizontal: SP.base,
    paddingVertical: SP.md,
    borderRadius: R.sm,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
  },
  backButtonText: {
    fontSize: 14,
    color: C.textSub,
    fontWeight: FW.medium,
  },
  nextButton: {
    flex: 1,
    backgroundColor: C.primary,
    borderRadius: R.sm,
    paddingVertical: SP.md,
    alignItems: 'center',
  },
  nextButtonText: {
    color: C.textOnPrimary,
    fontSize: 15,
    fontWeight: FW.semi,
  },
  submitButton: {
    flex: 1,
    backgroundColor: C.checkGreen,
    borderRadius: R.sm,
    paddingVertical: SP.md,
    alignItems: 'center',
  },
  submitButtonText: {
    color: C.textOnPrimary,
    fontSize: 15,
    fontWeight: FW.semi,
  },
  buttonDisabled: {
    opacity: 0.5,
  },

  // ── Price step ─────────────────────────────────────────────────────────
  amountWrapper: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: R.sm,
    backgroundColor: C.surface,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SP.md,
    marginBottom: SP.md,
  },
  amountWrapperFocused: {
    borderColor: C.borderFocus,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  amountWrapperError: {
    borderColor: C.borderError,
  },
  amountPrefix: {
    fontSize: 16,
    color: C.textSub,
    fontWeight: FW.semi,
    marginRight: SP.xs,
  },
  amountInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: FW.bold,
    color: C.text,
    paddingVertical: SP.md,
  },
  notesInput: {
    height: 96,
    textAlignVertical: 'top',
    paddingTop: SP.md,
  },
  errorText: {
    fontSize: 12,
    color: C.borderError,
    marginTop: -SP.sm,
    marginBottom: SP.sm,
  },
  charCount: {
    fontSize: 11,
    color: C.textMuted,
    textAlign: 'right',
    marginTop: -19,
    marginRight: 8,
    marginBottom: SP.sm,
  },

  // ── Review step ────────────────────────────────────────────────────────
  heroCard: {
    backgroundColor: C.surface,
    borderRadius: R.lg,
    padding: SP.xl,
    alignItems: 'center',
    marginBottom: SP.md,
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  heroLabel: {
    fontSize: 12,
    fontWeight: FW.semi,
    color: C.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: SP.xs,
  },
  heroAmount: {
    fontSize: 38,
    fontWeight: FW.bold,
    color: C.text,
    letterSpacing: -1,
    marginBottom: SP.sm,
  },
  reviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: SP.sm,
    borderBottomWidth: 1,
    borderBottomColor: C.divider,
  },
  reviewLabel: {
    fontSize: 13,
    color: C.textSub,
    fontWeight: FW.medium,
    flex: 1,
  },
  reviewValue: {
    fontSize: 13,
    color: C.text,
    fontWeight: FW.semi,
    flex: 2,
    textAlign: 'right',
  },
  notesBlock: {
    fontSize: 14,
    color: C.textSub,
    lineHeight: 22,
    marginTop: SP.xs,
  },

  // ── Property meta tags ─────────────────────────────────────────────────
  propertyMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: SP.xs,
    marginTop: SP.xs,
  },
  propertySpecs: {
    fontSize: 12,
    color: C.textSub,
    fontWeight: FW.medium,
  },
  propertyPrice: {
    fontSize: 12,
    color: C.primary,
    fontWeight: FW.semi,
  },
  propertyResultCount: {
    marginTop: SP.sm,
    marginBottom: SP.sm,
    fontSize: 12,
    textAlign: 'center',
    color: C.textMuted,
  },
  propertyEmptyState: {
    alignItems: 'center',
    paddingVertical: SP.xxl,
  },
  clearPropertyFiltersButton: {
    marginTop: SP.md,
    borderRadius: R.full,
    paddingHorizontal: SP.lg,
    paddingVertical: SP.sm,
    backgroundColor: '#EFF6FF',
  },
  clearPropertyFiltersText: {
    fontSize: 13,
    fontWeight: FW.semi,
    color: C.primary,
  },
  propertyCardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: SP.md,
    paddingTop: SP.sm,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  propertySelectHint: {
    flex: 1,
    marginRight: SP.sm,
    fontSize: 11,
    color: C.textMuted,
  },
  viewPropertyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    backgroundColor: '#EFF6FF',
    borderRadius: R.full,
    paddingHorizontal: SP.md,
    paddingVertical: 6,
  },
  viewPropertyButtonText: {
    fontSize: 12,
    fontWeight: FW.semi,
    color: C.primary,
  },

  // ── Error banner ───────────────────────────────────────────────────────
  errorBanner: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: C.borderError,
    borderRadius: R.sm,
    padding: SP.md,
    marginBottom: SP.md,
  },
  errorBannerText: {
    fontSize: 13,
    color: C.borderError,
    fontWeight: FW.medium,
  },
});
