// ─── Blob from URI ────────────────────────────────────────────────────────────
export async function uriToBlob(uri: string, contentType?: string): Promise<Blob> {
  const res = await fetch(uri);
  const blob = await res.blob();
  if (contentType && blob.type !== contentType) {
    return new Blob([blob], { type: contentType });
  }
  return blob;
}

// ─── Human-readable File Size ─────────────────────────────────────────────────
export function formatBytes(mb: number): string {
  if (mb < 1) return `${Math.round(mb * 1024)} KB`;
  return `${mb.toFixed(1)} MB`;
}

// ─── Adaptive Compression Quality ────────────────────────────────────────────
// Tiers target a final WebP output of ~400–800 KB regardless of source size.
// Quality values are for expo-image-manipulator (0 = smallest, 1 = lossless).
//
//  Source size  │ Quality │ Typical output (1920 px long-edge)
//  ─────────────┼─────────┼────────────────────────────────────
//  > 10 MB      │  0.60   │ ~300–450 KB
//  > 6 MB       │  0.65   │ ~350–500 KB
//  > 3 MB       │  0.72   │ ~450–650 KB
//  > 1 MB       │  0.80   │ ~550–750 KB
//  ≤ 1 MB       │  0.85   │ ~600–800 KB  (already small, keep quality up)
export function getImageCompressionQuality(fileSizeMb: number): number {
  if (fileSizeMb > 10) return 0.6;
  if (fileSizeMb > 6)  return 0.65;
  if (fileSizeMb > 3)  return 0.72;
  if (fileSizeMb > 1)  return 0.8;
  return 0.85;
}

// ─── Extract file extension ───────────────────────────────────────────────────
export function getFileExtension(fileName: string, fallback = 'jpg'): string {
  return (
    fileName.split('.').pop()?.toLowerCase() ?? fallback
  );
}

// ─── Build a unique file name ─────────────────────────────────────────────────
export function buildFileName(
  originalName: string | undefined | null,
  prefix: string,
  ext: string,
): string {
  return originalName ?? `${prefix}_${Date.now()}.${ext}`;
}

// ─── Safely round file size to at least 1 MB ─────────────────────────────────
export function toFileSizeMb(fileSize: number | undefined | null): number {
  if (!fileSize) return 1;
  return Math.max(1, Math.ceil(fileSize / (1024 * 1024)));
}
