import { StyleSheet } from 'react-native';
import { Colors } from '../constants/theme';

export const reviewScreenStyles = StyleSheet.create({
  reviewScroll:     { padding: 12, paddingBottom: 60 },
  reviewHeader:     { alignItems: 'center', paddingVertical: 20, marginBottom: 8 },
  reviewEmoji:      { fontSize: 42, marginBottom: 8 },
  reviewTitle:      { fontSize: 20, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  reviewSub:        { fontSize: 13, color: Colors.textSub, textAlign: 'center' },

  reviewGroup:      { marginBottom: 16 },
  reviewGroupHdr:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8, paddingHorizontal: 2 },
  reviewGroupDot:   { width: 10, height: 10, borderRadius: 99 },
  reviewGroupTitle: { fontSize: 14, fontWeight: '700', color: Colors.text, flex: 1 },
  reviewGroupBadge: { borderWidth: 1, borderRadius: 99, paddingHorizontal: 8, paddingVertical: 1 },
  reviewGroupBadgeTxt: { fontSize: 11, fontWeight: '700' },

  reviewCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  reviewRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 13,
    gap: 12,
  },
  reviewRowBorder:   { borderBottomWidth: 1, borderBottomColor: Colors.border },
  reviewRowLeft:     { flexDirection: 'column', flex: 1, marginRight: 8 },
  reviewRowLabel:    { fontSize: 14, fontWeight: '600', color: Colors.text },
  reviewRowSubLabel: { fontSize: 12, color: '#9ca3af', marginTop: 1, fontWeight: '400' },
  reviewRowValue:    { fontSize: 14, fontWeight: '600', color: Colors.text, maxWidth: '45%' as any, textAlign: 'right' },
  reviewRowValueEmpty: { color: Colors.textMuted, fontWeight: '500', fontStyle: 'italic' },

  submitNote: {
    backgroundColor: Colors.successBg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.successBdr,
    padding: 14,
    marginTop: 8,
  },
  submitNoteTxt: { fontSize: 13, color: '#15803d', lineHeight: 19 },
});
