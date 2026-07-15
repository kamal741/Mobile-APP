// ─── Upload Stage ─────────────────────────────────────────────────────────────
export type UploadStage =
  | 'idle'
  | 'compressing'
  | 'fetching-urls'
  | 'uploading'
  | 'confirming'
  | 'done'
  | 'error';

// ─── Upload Progress ──────────────────────────────────────────────────────────
export interface UploadProgress {
  stage: UploadStage;
  current: number;
  total: number;
}

// ─── Pending Asset ────────────────────────────────────────────────────────────
export interface PendingAsset {
  uri: string;
  fileName: string;
  contentType: string;
  fileSizeMb: number;
  durationMs?: number | null;
  blob?: Blob;
}
