import { StyleSheet } from 'react-native';

// ─── Design Tokens ─────────────────────────────────────────────────────────────
export const colors = {
  bg: '#f8fafc',
  white: '#ffffff',
  border: '#e2e8f0',
  borderLight: '#f1f5f9',
  textPrimary: '#1e293b',
  textSecondary: '#64748b',
  textMuted: '#94a3b8',
  textDark: '#334155',
  blue: '#1e40af',
  blueMid: '#2563eb',
  green: '#16a34a',
  greenLight: '#dcfce7',
  amber: '#f59e0b',
  amberLight: '#fef3c7',
  red: '#ef4444',
  redLight: '#fee2e2',
  blueLight: '#dbeafe',
  slate: '#f1f5f9',
  overlay: 'rgba(0,0,0,0.4)',
};

// ─── Shared / Layout Styles ────────────────────────────────────────────────────
export const layoutStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    padding: 16,
    gap: 14,
  },
  colStack: {
    flexDirection: 'column',
  },
  fullWidth: {
    flex: undefined,
    width: '100%',
  },
  topRow: {
    flexDirection: 'row',
    gap: 12,
  },
  bottomRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginBottom: 12,
  },
});

// ─── Card Shared Styles ────────────────────────────────────────────────────────
export const cardStyles = StyleSheet.create({
  topCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  cardLabelLight: {
    fontWeight: '400',
    fontSize: 11,
    color: colors.textMuted,
  },
  heroNumber: {
    fontSize: 44,
    fontWeight: '800',
    color: colors.green,
    lineHeight: 52,
  },
  heroSub: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: 14,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    gap: 8,
  },
  metaIcon: {
    width: 22,
    textAlign: 'center',
  },
  metaLabel: {
    flex: 1,
    fontSize: 13,
    color: colors.textSecondary,
  },
  metaValue: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  metaValueBlue: {
    color: colors.blueMid,
  },
  metaValueRed: {
    color: colors.red,
  },
});