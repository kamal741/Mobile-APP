import { StyleSheet } from 'react-native';
import { colors } from './shared';

// ─── Pending Requests Panel ────────────────────────────────────────────────────
export const pendingStyles = StyleSheet.create({
  pendingPanel: {
    flex: 1,
    width: 240,
    minHeight: 400,
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  pendingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  pendingTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  pendingHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pendingCountBadge: {
    backgroundColor: colors.red,
    borderRadius: 10,
    minWidth: 22,
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  pendingCountText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '800',
  },
  refreshIconBtn: { padding: 4 },
  noPendingText: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: 24,
  },

  // ─── Scroll wrapper — gives ScrollView a bounded flex container ───────────────
  requestsScrollWrapper: {
    flex: 1,                  // ← fills space below the header
  },
  requestsScroll: {
    flex: 1,
  },
  requestsScrollContent: {
    paddingRight: 2,
    paddingBottom: 8,
    marginRight: 6,           // ← hides scrollbar gap on Android
  },

  // ─── Request items ───────────────────────────────────────────────────────────
  requestItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    gap: 8,
  },
  requestAccent: {
    width: 3,
    height: 48,
    backgroundColor: colors.amber,
    borderRadius: 2,
  },
  requestBody: { flex: 1 },
  requestId: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  requestClient: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  requestDate: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  requestActionIcons: { flexDirection: 'row', gap: 6 },
  iconAccept: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.green,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconAcceptText: {
    color: colors.green,
    fontSize: 13,
    fontWeight: '700',
  },
  iconReject: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.red,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconRejectText: {
    color: colors.red,
    fontSize: 12,
    fontWeight: '700',
  },
});

