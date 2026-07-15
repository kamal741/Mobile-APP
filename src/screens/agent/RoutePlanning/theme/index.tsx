import { Platform, StyleSheet } from 'react-native';

// ─── Color Palette ────────────────────────────────────────────────────────────

export const colors = {
  blue: '#1e40af',
  blueLight: '#eff6ff',
  blueBorder: '#bfdbfe',

  textPrimary: '#1e293b',
  textSecondary: '#64748b',
  textMuted: '#94a3b8',

  bg: '#f8fafc',
  white: '#ffffff',
  border: '#e2e8f0',

  warningBg: '#fff7ed',
  warningText: '#c2410c',

  dangerBg: '#fef2f2',
  dangerText: '#dc2626',
  dangerBorder: '#fecaca',

  successGreen: '#16a34a',
  successBg: '#dcfce7',
} as const;

// ─── Shared Shadow Tokens ─────────────────────────────────────────────────────

export const shadow = {
  card: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 6,
    },
    android: { elevation: 4 },
  }),
  modal: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.18,
      shadowRadius: 16,
    },
    android: { elevation: 12 },
  }),
  footer: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.06,
      shadowRadius: 6,
    },
    android: { elevation: 8 },
  }),
} as const;

// ─── Shared / Global Styles ───────────────────────────────────────────────────

export const sharedStyles = StyleSheet.create({
  screenContainer: {
    flex: 1,
  },
  scrollArea: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 10,
  },

  // ── Buttons ──
  btnPrimary: {
    backgroundColor: colors.blue,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  btnPrimaryText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '700' as const,
    textAlign: 'center' as const,
    letterSpacing: 0.3,
  },
  btnSecondary: {
    backgroundColor: colors.white,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.blue,
    paddingVertical: 14,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  btnSecondaryText: {
    color: colors.blue,
    fontSize: 13,
    fontWeight: '700' as const,
    textAlign: 'center' as const,
  },
  btnDanger: {
    backgroundColor: colors.dangerBg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    paddingVertical: 14,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  btnDangerText: {
    color: colors.dangerText,
    fontSize: 14,
    fontWeight: '600' as const,
    textAlign: 'center' as const,
  },
  btnGhost: {
    paddingVertical: 12,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  btnGhostText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '500' as const,
  },

  // ── Property Number Badge ──
  propertyNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.blue,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  propertyNumberText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '700' as const,
  },

  // ── Sticky Footer Shell ──
  stickyFooter: {
    backgroundColor: colors.white,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    ...shadow.footer,
  },
});