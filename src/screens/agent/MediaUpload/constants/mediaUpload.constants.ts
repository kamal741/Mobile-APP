import { Dimensions } from 'react-native';
import { spacing } from '@/theme';

// ─── Screen Dimensions ────────────────────────────────────────────────────────
export const SCREEN_WIDTH = Dimensions.get('window').width;

// ─── Grid Layout ─────────────────────────────────────────────────────────────
export const GRID_COLUMNS = 3;
export const GRID_GAP = spacing.sm;
export const GRID_PADDING = spacing['3xl'];
export const THUMB_SIZE =
  (SCREEN_WIDTH - GRID_PADDING * 2 - GRID_GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS;

// ─── Media Limits ─────────────────────────────────────────────────────────────
export const MAX_PHOTOS = 15;
export const MAX_VIDEOS = 3;
export const MAX_IMAGE_SIZE_MB = 5;
export const MAX_VIDEO_SIZE_MB = 100;

// ─── MIME Type Map ────────────────────────────────────────────────────────────
export const IMAGE_MIME_MAP: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
};

export const VIDEO_MIME_MAP: Record<string, string> = {
  mp4: 'video/mp4',
  mov: 'video/quicktime',
  avi: 'video/x-msvideo',
};

export const ALL_MIME_MAP: Record<string, string> = {
  ...IMAGE_MIME_MAP,
  ...VIDEO_MIME_MAP,
};

// ─── Photo Guidelines ─────────────────────────────────────────────────────────
export const PHOTO_TIPS = [
  {
    id: 1,
    text: 'Shoot in landscape orientation using natural daylight for the best results.',
  },
  {
    id: 2,
    text: 'Start with the exterior, then move room-by-room in a logical order.',
  },
  {
    id: 3,
    text: 'Declutter and stage each space before photographing to maximise appeal.',
  },
  {
    id: 4,
    text: 'Highlight unique features: fireplace, custom cabinetry, and views.',
  },
  {
    id: 5,
    text: 'Add a short walkthrough video — listings with video get 2× more enquiries.',
  },
];

// ─── Upload Stage Labels ──────────────────────────────────────────────────────
export const UPLOAD_STAGE_LABEL: Record<string, string> = {
  idle: '',
  compressing: 'Compressing files…',
  'fetching-urls': 'Preparing upload…',
  uploading: 'Uploading files…',
  confirming: 'Finalising…',
  done: 'All media uploaded successfully',
  error: 'Upload failed. Please try again.',
};
