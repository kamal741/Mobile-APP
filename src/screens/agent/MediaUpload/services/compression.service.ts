import { Platform } from 'react-native';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { PendingAsset } from '../types/mediaUpload.types';
import { uriToBlob } from '../utils/mediaUpload.utils';
import { MAX_IMAGE_SIZE_MB, MAX_VIDEO_SIZE_MB } from '../constants/mediaUpload.constants';

const BYTES_PER_MB = 1024 * 1024;
const BITS_PER_BYTE = 8;

// ─── GCP Upload Standards ─────────────────────────────────────────────────────
// These constants define the maximum output quality we allow before a file is
// uploaded. Keeping them in one place means a single change here propagates to
// every compression path in the app.
//
//  Format   │ Max long edge │ Quality             │ Target size
//  ─────────┼───────────────┼─────────────────────┼────────────────
//  Image    │ 1920 px       │ highest that fits   │ <=5 MB
//  Video    │ 1280 px       │ adaptive bitrate    │ <=100 MB
const COMPRESSION_STANDARDS = {
  image: {
    // Caps the LONG edge so both landscape (width) and portrait (height)
    // photos are bounded. Aspect ratio is always preserved.
    maxLongEdgeCandidates: [1920, 1600, 1280, 1024],
    format: SaveFormat.WEBP,
    // Target below the API cap because image encoder output can vary a little.
    targetSizeMb: MAX_IMAGE_SIZE_MB * 0.95,
    // Try high quality first, then step down only if the output is still too big.
    qualityCandidates: [0.95, 0.9, 0.85, 0.8, 0.72, 0.65, 0.58, 0.5],
  },
  video: {
    // react-native-compressor caps the larger of the two dimensions so a
    // single maxSize value works for both landscape and portrait clips.
    // 1280 → landscape 1280×720, portrait 720×1280.
    maxSize: 1280,
    // Target below the API cap because encoder output can vary a little.
    targetSizeMb: MAX_VIDEO_SIZE_MB * 0.9,
    // Keep short clips high quality, but do not waste time/bandwidth above this.
    maxBitrate: 8_000_000,
    minBitrate: 100_000,
    // Used only when the picker cannot provide duration.
    fallbackBitrate: 3_000_000,
  },
} as const;

// ─── Compress Image → WebP ────────────────────────────────────────────────────
async function compressImage(asset: PendingAsset): Promise<PendingAsset> {
  try {
    const { maxLongEdgeCandidates, format, targetSizeMb, qualityCandidates } =
      COMPRESSION_STANDARDS.image;

    // Probe the original dimensions so we can cap the LONG edge, not just the
    // width. Without this a portrait photo (e.g. 3024×4032) would come out
    // 1920×2560 instead of the correct 1440×1920.
    const probeRef = await ImageManipulator.manipulate(asset.uri).renderAsync();
    const isPortrait = probeRef.height > probeRef.width;

    let selectedResult: Awaited<ReturnType<typeof probeRef.saveAsync>> | null = null;
    let selectedBlob: Blob | null = null;

    for (const maxLongEdgePx of maxLongEdgeCandidates) {
      const resizeDim = isPortrait
        ? { height: maxLongEdgePx }
        : { width: maxLongEdgePx };
      const resultRef = await ImageManipulator.manipulate(asset.uri)
        .resize(resizeDim)
        .renderAsync();

      for (const quality of qualityCandidates) {
        const result = await resultRef.saveAsync({ compress: quality, format });
        const blob = await uriToBlob(result.uri, 'image/webp');
        selectedResult = result;
        selectedBlob = blob;

        if (blob.size / BYTES_PER_MB <= targetSizeMb) {
          break;
        }
      }

      if (selectedBlob && selectedBlob.size / BYTES_PER_MB <= targetSizeMb) {
        break;
      }
    }

    if (!selectedResult || !selectedBlob) {
      return asset;
    }

    const baseName = asset.fileName.replace(/\.[^.]+$/, '');
    return {
      ...asset,
      uri: selectedResult.uri,
      contentType: 'image/webp',
      fileName: `${baseName}.webp`,
      fileSizeMb: Math.max(1, Math.ceil(selectedBlob.size / BYTES_PER_MB)),
      blob: selectedBlob,
    };
  } catch (err) {
    console.warn('[compressImage] compression THREW, using original asset/uri:', err);
    return asset;
  }
}

export async function prepareImageForUpload(asset: PendingAsset): Promise<PendingAsset & { blob: Blob }> {
  const prepared = await compressAsset(asset);
  const blob = prepared.blob ?? await uriToBlob(prepared.uri, prepared.contentType);
  const fileSizeMb = Math.max(1, Math.ceil(blob.size / BYTES_PER_MB));
  return { ...prepared, fileSizeMb, blob };
}

export async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        reject(new Error('Could not read image data.'));
        return;
      }
      resolve(result.split(',')[1] ?? result);
    };
    reader.onerror = () => reject(reader.error ?? new Error('Could not read image data.'));
    reader.readAsDataURL(blob);
  });
}

// ─── Normalise a native file path into a fetch()-able URI ────────────────────
// react-native-compressor sometimes returns a bare filesystem path on Android
// (no "file://" scheme). fetch() cannot resolve that, so uriToBlob() throws,
// and the caller silently falls back to the original, uncompressed asset.
function normalizeFileUri(uri: string): string {
  if (Platform.OS === 'android' && !/^[a-zA-Z]+:\/\//.test(uri)) {
    return `file://${uri}`;
  }
  return uri;
}

function calculateVideoBitrate(asset: PendingAsset): number {
  const { targetSizeMb, minBitrate, maxBitrate, fallbackBitrate } =
    COMPRESSION_STANDARDS.video;
  const durationSeconds =
    asset.durationMs && asset.durationMs > 0 ? asset.durationMs / 1000 : null;

  if (!durationSeconds) {
    return fallbackBitrate;
  }

  const targetBytes = targetSizeMb * BYTES_PER_MB;
  const targetBitrate = Math.floor((targetBytes * BITS_PER_BYTE) / durationSeconds);
  return Math.min(Math.max(targetBitrate, minBitrate), maxBitrate);
}

// ─── Compress Video → H.264 MP4 720p ─────────────────────────────────────────
async function compressVideo(asset: PendingAsset): Promise<PendingAsset> {
  if (Platform.OS === 'web') {
    // react-native-compressor uses native device encoders — it cannot run in a
    // browser. Throw so the caller's catch block surfaces a visible error
    // instead of silently uploading a raw file that could be hundreds of MB.
    throw new Error(
      `Video compression is not supported on web. ` +
      `Please use the mobile app to upload videos. ` +
      `(file: ${asset.fileName}, size: ${asset.fileSizeMb} MB)`,
    );
  }
  try {
    const { Video: VideoCompressor } = await import('react-native-compressor');
    const { maxSize } = COMPRESSION_STANDARDS.video;
    const bitrate = calculateVideoBitrate(asset);
    const rawCompressedUri = await VideoCompressor.compress(asset.uri, {
      compressionMethod: 'manual',
      maxSize,
      bitrate,
    });

    const compressedUri = normalizeFileUri(rawCompressedUri);

    return { ...asset, uri: compressedUri };
  } catch (err) {
    console.warn('[compressVideo] compression THREW, using original asset/uri:', err);
    return asset;
  }
}

// ─── Public: Compress a single asset ─────────────────────────────────────────
export async function compressAsset(asset: PendingAsset): Promise<PendingAsset> {
  if (asset.contentType.startsWith('image/')) {
    if (asset.fileSizeMb <= MAX_IMAGE_SIZE_MB) {
      return asset;
    }
    return compressImage(asset);
  }
  if (asset.contentType.startsWith('video/')) {
    if (asset.fileSizeMb <= MAX_VIDEO_SIZE_MB) {
      return asset;
    }
    return compressVideo(asset);
  }
  return asset;
}

// ─── Public: Compress all pending assets, attach Blob ────────────────────────
export async function compressAllAssets(
  assets: PendingAsset[],
  onCancel: () => boolean,
): Promise<PendingAsset[]> {
  const results: PendingAsset[] = [];
  for (const asset of assets) {
    if (onCancel()) return results;
    const compressed = await compressAsset(asset);
    try {
      const blob = compressed.blob ?? await uriToBlob(compressed.uri, compressed.contentType);
      // Use Math.ceil so sub-MB blobs round up to 1 rather than to 0.
      const sizeMb = Math.max(1, Math.ceil(blob.size / BYTES_PER_MB));

      results.push({ ...compressed, fileSizeMb: sizeMb, blob });
    } catch (err) {
      // Previously this failed silently and pushed `compressed` with its
      // stale (pre-compression) fileSizeMb and no blob attached. That stale
      // asset would later be re-fetched in useMediaUpload's fallback, which
      // can also fail to read the new file and effectively re-uses the
      // original size. Logging this loudly so the failure is visible instead
      // of just showing up as "size never changed" in the payload.
      console.warn(
        '[compressAllAssets] uriToBlob FAILED for',
        compressed.fileName,
        '— falling back to original (uncompressed) asset/size:',
        err,
      );
      results.push(compressed);
    }
  }
  return results;
}
