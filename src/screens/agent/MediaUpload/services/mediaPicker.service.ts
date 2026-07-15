import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { PendingAsset } from '../types/mediaUpload.types';
import {
  ALL_MIME_MAP,
  IMAGE_MIME_MAP,
  VIDEO_MIME_MAP,
  MAX_PHOTOS,
  MAX_VIDEOS,
} from '../constants/mediaUpload.constants';
import { getFileExtension, buildFileName, toFileSizeMb } from '../utils/mediaUpload.utils';

// ─── Request media library permission ─────────────────────────────────────────
async function requestLibraryPermission(): Promise<boolean> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert('Permission required', 'Please allow media library access in Settings.');
    return false;
  }
  return true;
}

// ─── Request camera permission ────────────────────────────────────────────────
async function requestCameraPermission(): Promise<boolean> {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert('Permission required', 'Please allow camera access in Settings.');
    return false;
  }
  return true;
}

// ─── Map ImagePicker asset → PendingAsset ────────────────────────────────────
function mapPickerAsset(
  asset: ImagePicker.ImagePickerAsset,
  mediaType: 'Images' | 'Videos',
): PendingAsset {
  const ext = getFileExtension(
    asset.fileName ?? asset.uri.split('/').pop() ?? 'file',
    mediaType === 'Images' ? 'jpg' : 'mp4',
  );
  const contentType =
    ALL_MIME_MAP[ext] ?? (mediaType === 'Images' ? 'image/jpeg' : 'video/mp4');
  const fileSizeMb = toFileSizeMb(asset.fileSize);
  const fileName = buildFileName(
    asset.fileName,
    mediaType === 'Images' ? 'photo' : 'video',
    ext,
  );
  const durationMs = mediaType === 'Videos' ? asset.duration ?? null : null;
  return { uri: asset.uri, fileName, contentType, fileSizeMb, durationMs };
}

// ─── Pick from gallery ────────────────────────────────────────────────────────
export async function pickFromLibrary(
  mediaType: 'Images' | 'Videos',
  remaining: number,
): Promise<PendingAsset[]> {
  const isPhoto = mediaType === 'Images';
  const maxAllowed = isPhoto ? MAX_PHOTOS : MAX_VIDEOS;

  if (remaining <= 0) {
    Alert.alert(
      'Limit reached',
      isPhoto
        ? `You can add up to ${MAX_PHOTOS} photos at a time.`
        : `You can add up to ${MAX_VIDEOS} videos at a time.`,
    );
    return [];
  }

  const hasPermission = await requestLibraryPermission();
  if (!hasPermission) return [];

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: isPhoto
      ? ImagePicker.MediaTypeOptions.Images
      : ImagePicker.MediaTypeOptions.Videos,
    allowsMultipleSelection: true,
    quality: 1,
    selectionLimit: remaining,
  });

  if (result.canceled) return [];
  return result.assets.map((a) => mapPickerAsset(a, mediaType));
}

// ─── Capture via camera ───────────────────────────────────────────────────────
export async function capturePhoto(): Promise<PendingAsset | null> {
  const hasPermission = await requestCameraPermission();
  if (!hasPermission) return null;

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 1,
  });
  if (result.canceled) return null;

  const asset = result.assets[0];
  const ext = getFileExtension(
    asset.fileName ?? asset.uri.split('/').pop() ?? 'photo.jpg',
    'jpg',
  );
  const contentType = IMAGE_MIME_MAP[ext] ?? 'image/jpeg';
  return {
    uri: asset.uri,
    fileName: buildFileName(asset.fileName, 'photo', ext),
    contentType,
    fileSizeMb: toFileSizeMb(asset.fileSize),
  };
}

// ─── Capture video via camera ─────────────────────────────────────────────────
export async function captureVideo(): Promise<PendingAsset | null> {
  const hasPermission = await requestCameraPermission();
  if (!hasPermission) return null;

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Videos,
    videoMaxDuration: 120,
  });
  if (result.canceled) return null;

  const asset = result.assets[0];
  const ext = getFileExtension(
    asset.fileName ?? asset.uri.split('/').pop() ?? 'video.mp4',
    'mp4',
  );
  const contentType = VIDEO_MIME_MAP[ext] ?? 'video/mp4';
  return {
    uri: asset.uri,
    fileName: buildFileName(asset.fileName, 'video', ext),
    contentType,
    fileSizeMb: toFileSizeMb(asset.fileSize),
    durationMs: asset.duration ?? null,
  };
}
