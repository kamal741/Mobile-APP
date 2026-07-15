import { StyleSheet } from 'react-native';
import { Colors } from '../constants/theme';

export const fieldRowStyles = StyleSheet.create({
  row:       { backgroundColor: Colors.surface },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  rowInner:  { flexDirection: 'row', alignItems: 'center' },

  dragHandle: {
    paddingLeft: 14,
    paddingRight: 6,
    paddingVertical: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dragHandleIcon: { fontSize: 18, color: Colors.textMuted, lineHeight: 20 },

  rowHeader: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 16,
    paddingVertical: 14,
    justifyContent: 'space-between',
  },
  rowLabelWrap: { flexDirection: 'row', alignItems: 'center', flex: 1, flexWrap: 'nowrap' },
  rowLabel:     { fontSize: 14, fontWeight: '600', color: Colors.text },
  rowSubLabel:  { fontSize: 12, color: Colors.textSub, marginLeft: 5 },
  rowRight:     {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    maxWidth: '48%' as any,
    justifyContent: 'flex-end',
  },
  rowValue:   { fontSize: 14, fontWeight: '600', color: Colors.text, textAlign: 'right', flexShrink: 1 },
  rowChevron: { fontSize: 22, color: Colors.textMuted, lineHeight: 24, marginLeft: 2 },

  rowBody: { paddingHorizontal: 16, paddingLeft: 44, paddingBottom: 16 },

  // Price input
  textInput: {
    borderWidth: 1,
    borderColor: Colors.borderMid,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.text,
    backgroundColor: Colors.surface,
  },

  // Range inputs
  rangeRow:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
  flex1:      { flex: 1 },
  rangeInput: {
    borderWidth: 1,
    borderColor: Colors.borderMid,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.text,
    textAlign: 'center',
    backgroundColor: Colors.surface,
  },
  rangeSep:  { fontSize: 15, color: Colors.textMuted, fontWeight: '500' },
  rangeUnit: { fontSize: 12, color: Colors.textSub, width: 24 },

  // Chips
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 99,
    borderWidth: 1.5,
    borderColor: Colors.borderMid,
    backgroundColor: Colors.subtle,
  },
  chipSel:    { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  chipTick:   { fontSize: 11, color: Colors.primary, fontWeight: '700' },
  chipTxt:    { fontSize: 13, fontWeight: '500', color: Colors.textSub },
  chipTxtSel: { color: Colors.primary, fontWeight: '600' },
});
