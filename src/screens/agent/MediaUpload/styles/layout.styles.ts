import { StyleSheet } from 'react-native';
import { colors, typography, spacing, shadows, border } from '@/theme';

export const layoutStyles = StyleSheet.create({

  // ── Header ─────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing['3xl'],
    paddingVertical: spacing.lg,
    backgroundColor: colors.background.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
    ...shadows.xs,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: border.radius.full,
    backgroundColor: colors.background.subtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    marginLeft: spacing.xl,
  },
  headerTitle: {
    ...typography.h3,
    letterSpacing: -0.2,
  },
  headerSubtitle: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: 2,
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary.hover,
    borderRadius: border.radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.primary.light,
  },
  headerBadgeText: {
    ...typography.captionBold,
    color: colors.primary.default,
  },

  // ── Scroll ─────────────────────────────────────────────────────────────────
  scrollContent: {
    padding: spacing['3xl'],
    gap: spacing['3xl'],
  },

  // ── Card ───────────────────────────────────────────────────────────────────
  card: {
    backgroundColor: colors.background.surface,
    borderRadius: border.radius.card,
    borderWidth: 1,
    borderColor: colors.border.default,
    padding: spacing['3xl'],
    gap: spacing.xl,
    ...shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitle: {
    ...typography.h3,
    letterSpacing: -0.2,
  },
  cardSubtitle: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: 2,
  },

  // ── Stats Row ──────────────────────────────────────────────────────────────
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.surface,
    borderRadius: border.radius.card,
    borderWidth: 1,
    borderColor: colors.border.default,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing['3xl'],
    ...shadows.xs,
  },
  statChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  statValue: {
    ...typography.bodySmall,
    fontWeight: '600' as const,
    color: colors.text.primary,
  },
  statLabel: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  statDivider: {
    width: 1,
    height: 20,
    backgroundColor: colors.border.default,
  },

  // ── Upload Button ──────────────────────────────────────────────────────────
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary.default,
    borderRadius: border.radius.item,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing['3xl'],
    ...shadows.md,
  },
  uploadBtnDisabled: {
    opacity: 0.65,
  },
  uploadBtnText: {
    ...typography.buttonPrimary,
    color: colors.text.inverse,
  },
});
