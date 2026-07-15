import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { PendingAsset } from '../types/mediaUpload.types';
import { MAX_PHOTOS, MAX_VIDEOS } from '../constants/mediaUpload.constants';
import { pickFromLibrary, capturePhoto, captureVideo } from '../services/mediaPicker.service';

interface UsePendingAssetsOptions {
  uploadedPhotoCount: number;
  uploadedVideoCount: number;
}

// ─── usePendingAssets ─────────────────────────────────────────────────────────
export function usePendingAssets({
  uploadedPhotoCount,
  uploadedVideoCount,
}: UsePendingAssetsOptions) {
  const [pendingAssets, setPendingAssets] = useState<PendingAsset[]>([]);

  const pendingPhotos = pendingAssets.filter((a) =>
    a.contentType.startsWith('image/'),
  ).length;
  const pendingVideos = pendingAssets.filter((a) =>
    a.contentType.startsWith('video/'),
  ).length;

  const addAssets = useCallback((newAssets: PendingAsset[]) => {
    setPendingAssets((prev) => {
      const existing = new Set(prev.map((a) => a.uri));
      return [...prev, ...newAssets.filter((a) => !existing.has(a.uri))];
    });
  }, []);

  const removeAsset = useCallback((uri: string) => {
    setPendingAssets((prev) => prev.filter((a) => a.uri !== uri));
  }, []);

  const clearAll = useCallback(() => setPendingAssets([]), []);

  const pickPhotos = useCallback(async () => {
    const remaining = MAX_PHOTOS - (uploadedPhotoCount + pendingPhotos);
    const assets = await pickFromLibrary('Images', remaining);
    if (assets.length) addAssets(assets);
  }, [uploadedPhotoCount, pendingPhotos, addAssets]);

  const pickVideos = useCallback(async () => {
    const remaining = MAX_VIDEOS - (uploadedVideoCount + pendingVideos);
    const assets = await pickFromLibrary('Videos', remaining);
    if (assets.length) addAssets(assets);
  }, [uploadedVideoCount, pendingVideos, addAssets]);

  const openCamera = useCallback(async () => {
    const canPhoto = uploadedPhotoCount + pendingPhotos < MAX_PHOTOS;
    const canVideo = uploadedVideoCount + pendingVideos < MAX_VIDEOS;

    if (!canPhoto && !canVideo) {
      Alert.alert('Limit reached', 'You have reached the maximum for both photos and videos.');
      return;
    }

    const options = [
      canPhoto
        ? {
            text: 'Photo',
            onPress: async () => {
              const asset = await capturePhoto();
              if (asset) addAssets([asset]);
            },
          }
        : null,
      canVideo
        ? {
            text: 'Video',
            onPress: async () => {
              const asset = await captureVideo();
              if (asset) addAssets([asset]);
            },
          }
        : null,
      { text: 'Cancel', style: 'cancel' as const },
    ].filter(Boolean) as any[];

    Alert.alert('Camera', 'What would you like to capture?', options);
  }, [uploadedPhotoCount, uploadedVideoCount, pendingPhotos, pendingVideos, addAssets]);

  return {
    pendingAssets,
    pendingPhotos,
    pendingVideos,
    removeAsset,
    clearAll,
    pickPhotos,
    pickVideos,
    openCamera,
    setPendingAssets,
  };
}
