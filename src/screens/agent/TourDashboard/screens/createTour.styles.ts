import { StyleSheet } from 'react-native';
import { colors, radius, spacing } from '../styles/shared.styles';

export const createTourStyles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: colors.bgPage },
  scrollView:    { flex: 1 },
  scrollContent: { padding: spacing.lg, paddingBottom: spacing.xxxl },

  /* ── Step indicator ── */
  stepIndicator: {
    flexDirection:     'row',
    justifyContent:    'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical:   12,
    backgroundColor:   colors.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  stepItem:   { alignItems: 'center', flex: 1 },
  stepCircle: {
    width: 28, height: 28, borderRadius: radius.pill,
    backgroundColor: colors.border,
    justifyContent: 'center', alignItems: 'center',
  },
  stepCompleted:    { backgroundColor: colors.green },
  stepActive:       { backgroundColor: colors.blue },
  stepCheckmark:    { color: colors.white, fontSize: 14, fontWeight: '700' },
  stepNumber:       { color: colors.textSecondary, fontSize: 12, fontWeight: '600' },
  stepNumberActive: { color: colors.white },
  stepTitle:        { fontSize: 10, color: colors.textMuted, marginTop: spacing.xs },
  stepTitleActive:  { color: colors.blue, fontWeight: '600' },

  /* ── Step header ── */
  stepHeader:         { alignItems: 'center', marginBottom: spacing.xl },
  stepHeaderIcon:     { fontSize: 40, marginBottom: spacing.sm },
  stepHeaderTitle:    { fontSize: 20, fontWeight: '700', color: colors.textPrimary },
  stepHeaderSubtitle: { fontSize: 14, color: colors.textSecondary, marginTop: spacing.xs },

  /* ── Property meta ── */
  propertyMeta:  { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 6 },
  propertySpecs: { fontSize: 12, color: colors.textSecondary },
  propertyPrice: { fontSize: 13, fontWeight: '700', color: colors.green },
  propertyResultCount: {
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
    fontSize: 12,
    textAlign: 'center',
    color: colors.textMuted,
  },
  propertyEmptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  clearPropertyFiltersButton: {
    marginTop: spacing.md,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.bgSelected,
  },
  clearPropertyFiltersText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.blue,
  },
  propertyCardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  propertySelectHint: {
    flex: 1,
    marginRight: spacing.sm,
    fontSize: 11,
    color: colors.textMuted,
  },
  viewPropertyButton: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.bgSelected,
  },
  viewPropertyButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.blue,
  },

  /* ── Selected summary pill ── */
  selectedSummary: {
    backgroundColor: colors.bgSelected,
    padding: spacing.md,
    borderRadius: radius.lg,
    marginTop: spacing.sm,
    alignItems: 'center',
  },
  selectedSummaryText: { fontSize: 14, fontWeight: '600', color: colors.blue },

  /* ── Schedule form ── */
  formCard: { marginTop: 0 },

  dateInput: {
    backgroundColor: colors.bgPage,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateInputValue:       { fontSize: 14, color: colors.textPrimary, flex: 1 },
  dateInputPlaceholder: { fontSize: 14, color: colors.textMuted, flex: 1 },
  dateInputIcon:        { fontSize: 16, marginLeft: spacing.sm },

  textArea: { minHeight: 80, textAlignVertical: 'top' },

  /* ── Property schedule items ── */
  propertyScheduleItem: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: 12,
    backgroundColor: colors.bgCard,
  },
  propertyScheduleListHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  propertyScheduleCount: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.blue,
    backgroundColor: colors.bgSelected,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  propertyScheduleHint: {
    marginTop: spacing.xs,
    fontSize: 12,
    color: colors.textSecondary,
  },
  propertyScheduleHeader:  { flexDirection: 'row', alignItems: 'flex-start' },
  propertyScheduleNumber:  { fontSize: 14, fontWeight: '700', color: colors.blue, marginRight: spacing.sm },
  propertyScheduleCopy: { flex: 1, minWidth: 0 },
  propertyScheduleAddress: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  propertyScheduleMeta: {
    marginTop: spacing.xs,
    fontSize: 12,
    color: colors.textSecondary,
  },
  removeButton:            { fontSize: 18, color: colors.red, fontWeight: '600', paddingLeft: spacing.sm },
  propertyScheduleDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  propertyScheduleTypeChip: {
    backgroundColor: colors.bgSelected,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  propertyScheduleTypeChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.blue,
  },
  propertyScheduleDetailText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  propertySchedulePrice: {
    marginLeft: 'auto',
    fontSize: 13,
    fontWeight: '700',
    color: colors.green,
  },
  propertyScheduleTapHint: {
    marginTop: spacing.sm,
    fontSize: 11,
    color: colors.textMuted,
  },
  propertyScheduleSelectableCard: {
    marginBottom: 12,
  },
  propertyRemoveButton: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  propertyRemoveButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.red,
  },

  /* ── Review step ── */
  reviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  reviewLabel: { fontSize: 14, color: colors.textSecondary },
  reviewValue: {
    fontSize: 14, fontWeight: '600', color: colors.textPrimary,
    textAlign: 'right', flex: 1, marginLeft: spacing.lg,
  },
  reviewPropertyItem: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg,
    padding: spacing.md, marginBottom: 10, backgroundColor: colors.bgMuted,
  },
  reviewPropertyHeader:  { flexDirection: 'row', alignItems: 'center' },
  reviewPropertyNumber:  { fontSize: 14, fontWeight: '700', color: colors.blue, marginRight: 10 },
  reviewPropertyAddress: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  reviewPropertyDetails: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  reviewPropertyTime:    { fontSize: 12, color: colors.blue, marginTop: 6, fontWeight: '500' },

  /* ── Footer navigation ── */
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: colors.bgCard,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  flex1: { flex: 1 },
  backButton:     { paddingHorizontal: spacing.xl, paddingVertical: 12, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border },
  backButtonText: { fontSize: 15, color: colors.textSecondary, fontWeight: '600' },
  nextButton:     { backgroundColor: colors.blue, paddingHorizontal: 28, paddingVertical: 12, borderRadius: radius.lg },
  nextButtonText: { color: colors.white, fontSize: 15, fontWeight: '600' },
  createButton:   { backgroundColor: colors.green, paddingHorizontal: 28, paddingVertical: 12, borderRadius: radius.lg },
  createButtonText: { color: colors.white, fontSize: 15, fontWeight: '600' },
  buttonDisabled: { opacity: 0.5 },
});

export const alertStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  box: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.card,
    padding: spacing.xxl,
    marginHorizontal: 40,
    minWidth: 280,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 10,
  },
  title:       { fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.sm },
  message:     { fontSize: 14, color: colors.textSecondary, lineHeight: 20, marginBottom: spacing.xxl },
  buttonRow:   { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  button:      { paddingHorizontal: spacing.xl, paddingVertical: 10, borderRadius: radius.lg, minWidth: 80, alignItems: 'center' },
  primaryButton: { backgroundColor: colors.blue },
  cancelButton:  { backgroundColor: colors.bgCancelBtn, borderWidth: 1, borderColor: colors.border },
  buttonText:       { fontSize: 14, fontWeight: '600' },
  primaryButtonText: { color: colors.white },
  cancelButtonText:  { color: colors.textBadge },
});
