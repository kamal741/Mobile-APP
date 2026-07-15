import { StyleSheet } from 'react-native';
import { Colors } from '../constants/theme';

export const sectionCardStyles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1.5,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.subtle,
    gap: 8,
  },
  cardDot:      { width: 10, height: 10, borderRadius: 99 },
  cardTitle:    { fontSize: 15, fontWeight: '700', color: Colors.text, flex: 1 },
  cardBadge:    {
    backgroundColor: Colors.bg,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: Colors.borderMid,
    paddingHorizontal: 8,
    paddingVertical: 1,
  },
  cardBadgeTxt: { fontSize: 11, fontWeight: '600', color: Colors.textSub },
  rowChevron:   { fontSize: 22, color: Colors.textMuted, lineHeight: 24, marginLeft: 2 },

  dropZoneBanner: {
    backgroundColor: Colors.primaryLight,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#bfdbfe',
    alignItems: 'center',
  },
  dropZoneTxt: { fontSize: 13, fontWeight: '600', color: Colors.primary },

  emptySection: {
    paddingVertical: 20,
    alignItems: 'center',
    borderStyle: 'dashed',
    borderWidth: 1.5,
    borderColor: Colors.borderMid,
    margin: 12,
    borderRadius: 8,
  },
  emptySectionTxt: { fontSize: 13, color: Colors.textMuted },
});
