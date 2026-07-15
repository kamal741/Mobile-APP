import { StyleSheet } from 'react-native';
import { colors } from './shared';

// ─── Schedule Card Styles ──────────────────────────────────────────────────────
export const scheduleStyles = StyleSheet.create({
  scheduleCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    minHeight: 360,
  },
  scheduleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  scheduleTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  newTourBtn: {
    backgroundColor: colors.blue,
    borderRadius: 7,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  newTourBtnText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '600',
  },

  // Tabs
  tabScroll: {
    width: '100%',
  },
  tabScrollContent: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 6,
  },
  tabItem: {
    flex: 1,
    minHeight: 44,
    paddingHorizontal: 8,
    paddingBottom: 10,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  tabLabel: {
    flexShrink: 1,
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '500',
    textAlign: 'center',
  },
  tabLabelActive: {
    color: 'black',
    fontWeight: '700',
  },
  tabUnderline: {
    position: 'absolute',
    bottom: 0,
    left: 8,
    right: 8,
    height: 2,
    backgroundColor: colors.blue,
    borderRadius: 2,
  },
  tabDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginBottom: 16,
  },

  // Route card
  routeListScroll: { maxHeight: 320 },
  routeListContent: { paddingRight: 2 },
  routeCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    backgroundColor: colors.white,
  },
  routeHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  routeInfo: { flex: 1 },
  routeMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 10,
  },
  routeMetaLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  routeMetaValue: {
    fontSize: 13,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  routeActions: { flexDirection: 'row', gap: 8 },
  routePrimaryBtn: {
    backgroundColor: colors.blue,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  routePrimaryBtnText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '700',
  },
  routeSecondaryBtn: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  routeSecondaryBtnText: {
    color: colors.textDark,
    fontSize: 12,
    fontWeight: '600',
  },

  // Status badges
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 5 },
  badgeScheduled: { backgroundColor: colors.blueLight },
  badgeRequested: { backgroundColor: colors.slate },
  badgeInProgress: { backgroundColor: colors.amberLight },
  badgeCompleted: { backgroundColor: colors.greenLight },
  badgeCancelled: { backgroundColor: colors.redLight },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    color: colors.textDark,
  },

  // Empty state
  emptyScheduleWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 56,
    gap: 12,
  },
  emptyCalIcon: { fontSize: 40, opacity: 0.3 },
  emptyScheduleText: { fontSize: 14, color: colors.textMuted },
  scheduleTourBtn: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 7,
    paddingVertical: 8,
    paddingHorizontal: 20,
    marginTop: 4,
  },
  scheduleTourBtnText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '500',
  },

  // Tour address/client text (reused in route card)
  tourAddress: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  tourClient: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
});