import { StyleSheet } from 'react-native';
import { colors, spacing, border } from '@/theme';
import { GRID_GAP, THUMB_SIZE } from '../constants/mediaUpload.constants';

export const gridStyles = StyleSheet.create({

  // ── Grid Container ─────────────────────────────────────────────────────────
  gridSection: {
    gap: spacing.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap' as const,
    gap: GRID_GAP,
  },

  // ── Tile Base ──────────────────────────────────────────────────────────────
  gridTile: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: border.radius.item,
    overflow: 'hidden' as const,
    position: 'relative' as const,
    backgroundColor: colors.background.subtle,
  },
  tileDeleting: {
    opacity: 0.5,
  },
  gridThumb: {
    width: '100%',
    height: '100%',
  },

  // ── Tile Overlays ──────────────────────────────────────────────────────────
  tileScrim: {
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    right: 0,
    height: '40%',
    backgroundColor: 'rgba(0,0,0,0.30)',
  },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeTileBtn: {
    position: 'absolute' as const,
    top: 5,
    right: 5,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Tile Badges ────────────────────────────────────────────────────────────
  tileMeta: {
    position: 'absolute' as const,
    bottom: 5,
    left: 5,
    backgroundColor: 'rgba(0,0,0,0.50)',
    borderRadius: border.radius.chipSm,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  tileSizeText: {
    fontSize: 9,
    color: colors.text.inverse,
    fontWeight: '600' as const,
    letterSpacing: 0.2,
  },
  coverBadge: {
    position: 'absolute' as const,
    bottom: 5,
    left: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.primary.default,
    borderRadius: border.radius.chipSm,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  coverBadgeText: {
    fontSize: 9,
    color: colors.text.inverse,
    fontWeight: '700' as const,
    letterSpacing: 0.3,
  },
});
