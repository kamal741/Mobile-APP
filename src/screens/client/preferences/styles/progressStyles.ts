import { StyleSheet } from 'react-native';
import { Colors } from '../constants/theme';

export const progressBarStyles = StyleSheet.create({
  progressCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  progressTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLabel:    { fontSize: 14, fontWeight: '600', color: Colors.text },
  progressBadge:    {
    borderRadius: 99,
    borderWidth: 1,
    borderColor: Colors.borderMid,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  progressBadgeTxt: { fontSize: 12, fontWeight: '600', color: Colors.textSub },
  progressTrack:    { height: 6, backgroundColor: Colors.border, borderRadius: 99, overflow: 'hidden' },
  progressFill:     { height: 6, backgroundColor: Colors.primary, borderRadius: 99 },
  progressSub:      { fontSize: 11, color: Colors.textMuted, marginTop: 5 },
});

export const dragHintStyles = StyleSheet.create({
  dragHint: {
    backgroundColor: Colors.primaryLight,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
  },
  dragHintTxt: { fontSize: 12, color: Colors.primary, fontWeight: '500', textAlign: 'center' },
});
