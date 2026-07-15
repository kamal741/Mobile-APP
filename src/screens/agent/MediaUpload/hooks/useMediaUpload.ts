import { useState, useCallback, MutableRefObject } from 'react';
import { Alert } from 'react-native';
import { PendingAsset, UploadProgress } from '../types/mediaUpload.types';
import { MAX_PHOTOS, MAX_VIDEOS } from '../constants/mediaUpload.constants';
import { uriToBlob } from '../utils/mediaUpload.utils';
import {
  useUploadPropertyMedia,
  useDeletePropertyMedia,
  PropertyMediaItem,
} from '@/lib/agentApi';

interface UseMediaUploadOptions {
  propertyId: string;
  pendingAssets: PendingAsset[];
  pendingPhotos: number;
  pendingVideos: number;
  uploadedPhotoCount: number;
  uploadedVideoCount: number;
  compressedAssetsRef: MutableRefObject<PendingAsset[]>;
  onUploadSuccess: () => void;
  onClearPending: () => void;
}

// ─── useMediaUpload ───────────────────────────────────────────────────────────
export function useMediaUpload({
  propertyId,
  pendingAssets,
  pendingPhotos,
  pendingVideos,
  uploadedPhotoCount,
  uploadedVideoCount,
  compressedAssetsRef,
  onUploadSuccess,
  onClearPending,
}: UseMediaUploadOptions) {
  const [progress, setProgress] = useState<UploadProgress>({
    stage: 'idle',
    current: 0,
    total: 0,
  });

  const uploadMutation = useUploadPropertyMedia(
    propertyId,
    (current, total) => setProgress({ stage: 'uploading', current, total }),
  );

  const handleUpload = useCallback(async () => {
    if (pendingAssets.length === 0) return;

    const totalPhotosAfter = uploadedPhotoCount + pendingPhotos;
    const totalVideosAfter = uploadedVideoCount + pendingVideos;

    if (totalPhotosAfter > MAX_PHOTOS || totalVideosAfter > MAX_VIDEOS) {
      const lines: string[] = [];
      if (totalPhotosAfter > MAX_PHOTOS) {
        const over = totalPhotosAfter - MAX_PHOTOS;
        lines.push(`Photos: ${totalPhotosAfter}/${MAX_PHOTOS} (remove ${over} photo${over !== 1 ? 's' : ''})`);
      }
      if (totalVideosAfter > MAX_VIDEOS) {
        const over = totalVideosAfter - MAX_VIDEOS;
        lines.push(`Videos: ${totalVideosAfter}/${MAX_VIDEOS} (remove ${over} video${over !== 1 ? 's' : ''})`);
      }
      Alert.alert(
        'Upload limit exceeded',
        `This listing has reached its media limit:\n\n${lines.join('\n')}\n\nRemove some files before uploading.`,
      );
      return;
    }

    try {
      setProgress({ stage: 'fetching-urls', current: 0, total: pendingAssets.length });

      const assetsWithBlobs = await Promise.all(
        compressedAssetsRef.current.map(async (asset) => {
          // If compressAllAssets already attached a blob, this branch is skipped
          // entirely and fileSizeMb is whatever compression.service.ts computed.
          // If asset.blob is missing, it means compressAllAssets's uriToBlob call
          // failed earlier (see its catch block warning) and we're re-attempting
          // here against asset.uri — which, for a failed video compression, is
          // still the ORIGINAL picked file, not a compressed one.
          if (asset.blob) {
            console.log(
              '[useMediaUpload] using pre-attached blob for',
              asset.fileName,
              '| fileSizeMb:', asset.fileSizeMb,
            );
            return asset;
          }

          console.warn(
            '[useMediaUpload] NO pre-attached blob for',
            asset.fileName,
            '— re-fetching from uri (this is the fallback path):',
            asset.uri,
          );

          const blob = await uriToBlob(asset.uri, asset.contentType);
          // Derive fileSizeMb from the actual (post-compression) blob so the API
          // payload always reflects the compressed size, not the original pick size.
          const fileSizeMb = Math.max(1, Math.ceil(blob.size / (1024 * 1024)));

          console.log(
            '[useMediaUpload] fallback blob fetched for',
            asset.fileName,
            '| bytes:', blob.size,
            '| recalculated fileSizeMb:', fileSizeMb,
          );

          return { ...asset, blob, fileSizeMb };
        }),
      );

      setProgress({ stage: 'uploading', current: 0, total: assetsWithBlobs.length });

      await uploadMutation.mutateAsync(
        assetsWithBlobs.map(({ blob, contentType, fileName, fileSizeMb }) => ({
          file: blob!,
          contentType,
          fileName,
          fileSizeMb,
        })),
      );

      setProgress({
        stage: 'done',
        current: assetsWithBlobs.length,
        total: assetsWithBlobs.length,
      });
      compressedAssetsRef.current = [];
      onClearPending();
      onUploadSuccess();
    } catch (err) {
      setProgress((p) => ({ ...p, stage: 'error' }));
      Alert.alert(
        'Upload failed',
        (err as Error)?.message ?? 'Something went wrong. Please try again.',
      );
    }
  }, [
    pendingAssets,
    pendingPhotos,
    pendingVideos,
    uploadedPhotoCount,
    uploadedVideoCount,
    compressedAssetsRef,
    uploadMutation,
    onClearPending,
    onUploadSuccess,
  ]);

  return {
    progress,
    isUploading: uploadMutation.isPending,
    handleUpload,
  };
}

// ─── useDeleteMedia ───────────────────────────────────────────────────────────
export function useDeleteMedia(propertyId: string, onDeleteSuccess: () => void) {
  const [deletingIds, setDeletingIds] = useState<Set<number>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<PropertyMediaItem | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const deleteMutation = useDeletePropertyMedia(propertyId);

  const handleDeletePress = useCallback((item: PropertyMediaItem) => {
    setDeleteTarget(item);
    setDeleteDialogOpen(true);
  }, []);

  const handleDeleteCancel = useCallback(() => {
    setDeleteDialogOpen(false);
    setDeleteTarget(null);
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    if (!deleteTarget) return;
    const mediaId = deleteTarget.mediaId;
    setDeletingIds((prev) => new Set(prev).add(mediaId));

    deleteMutation.mutate([mediaId], {
      onSuccess: () => {
        setDeletingIds((prev) => {
          const next = new Set(prev);
          next.delete(mediaId);
          return next;
        });
        setDeleteDialogOpen(false);
        setDeleteTarget(null);
        onDeleteSuccess();
      },
      onError: () => {
        setDeletingIds((prev) => {
          const next = new Set(prev);
          next.delete(mediaId);
          return next;
        });
        setDeleteDialogOpen(false);
        setDeleteTarget(null);
        Alert.alert('Delete failed', 'Could not remove this media. Please try again.');
      },
    });
  }, [deleteTarget, deleteMutation, onDeleteSuccess]);

  return {
    deletingIds,
    deleteTarget,
    deleteDialogOpen,
    isDeletingMutation: deleteMutation.isPending,
    handleDeletePress,
    handleDeleteCancel,
    handleDeleteConfirm,
  };
}






// import { useState, useCallback, MutableRefObject } from 'react';
// import { Alert } from 'react-native';
// import { PendingAsset, UploadProgress } from '../types/mediaUpload.types';
// import { MAX_PHOTOS, MAX_VIDEOS } from '../constants/mediaUpload.constants';
// import { uriToBlob } from '../utils/mediaUpload.utils';
// import {
//   useUploadPropertyMedia,
//   useDeletePropertyMedia,
//   PropertyMediaItem,
// } from '@/lib/agentApi';

// interface UseMediaUploadOptions {
//   propertyId: string;
//   pendingAssets: PendingAsset[];
//   pendingPhotos: number;
//   pendingVideos: number;
//   uploadedPhotoCount: number;
//   uploadedVideoCount: number;
//   compressedAssetsRef: MutableRefObject<PendingAsset[]>;
//   onUploadSuccess: () => void;
//   onClearPending: () => void;
// }

// // ─── useMediaUpload ───────────────────────────────────────────────────────────
// export function useMediaUpload({
//   propertyId,
//   pendingAssets,
//   pendingPhotos,
//   pendingVideos,
//   uploadedPhotoCount,
//   uploadedVideoCount,
//   compressedAssetsRef,
//   onUploadSuccess,
//   onClearPending,
// }: UseMediaUploadOptions) {
//   const [progress, setProgress] = useState<UploadProgress>({
//     stage: 'idle',
//     current: 0,
//     total: 0,
//   });

//   const uploadMutation = useUploadPropertyMedia(
//     propertyId,
//     (current, total) => setProgress({ stage: 'uploading', current, total }),
//   );

//   const handleUpload = useCallback(async () => {
//     if (pendingAssets.length === 0) return;

//     const totalPhotosAfter = uploadedPhotoCount + pendingPhotos;
//     const totalVideosAfter = uploadedVideoCount + pendingVideos;

//     if (totalPhotosAfter > MAX_PHOTOS || totalVideosAfter > MAX_VIDEOS) {
//       const lines: string[] = [];
//       if (totalPhotosAfter > MAX_PHOTOS) {
//         const over = totalPhotosAfter - MAX_PHOTOS;
//         lines.push(`Photos: ${totalPhotosAfter}/${MAX_PHOTOS} (remove ${over} photo${over !== 1 ? 's' : ''})`);
//       }
//       if (totalVideosAfter > MAX_VIDEOS) {
//         const over = totalVideosAfter - MAX_VIDEOS;
//         lines.push(`Videos: ${totalVideosAfter}/${MAX_VIDEOS} (remove ${over} video${over !== 1 ? 's' : ''})`);
//       }
//       Alert.alert(
//         'Upload limit exceeded',
//         `This listing has reached its media limit:\n\n${lines.join('\n')}\n\nRemove some files before uploading.`,
//       );
//       return;
//     }

//     try {
//       setProgress({ stage: 'fetching-urls', current: 0, total: pendingAssets.length });

//       const assetsWithBlobs = await Promise.all(
//         compressedAssetsRef.current.map(async (asset) => {
//           const blob = asset.blob ?? (await uriToBlob(asset.uri, asset.contentType));
//           // Derive fileSizeMb from the actual (post-compression) blob so the API
//           // payload always reflects the compressed size, not the original pick size.
//           const fileSizeMb = Math.max(1, Math.ceil(blob.size / (1024 * 1024)));
//           return { ...asset, blob, fileSizeMb };
//         }),
//       );

//       setProgress({ stage: 'uploading', current: 0, total: assetsWithBlobs.length });

//       await uploadMutation.mutateAsync(
//         assetsWithBlobs.map(({ blob, contentType, fileName, fileSizeMb }) => ({
//           file: blob!,
//           contentType,
//           fileName,
//           fileSizeMb,
//         })),
//       );

//       setProgress({
//         stage: 'done',
//         current: assetsWithBlobs.length,
//         total: assetsWithBlobs.length,
//       });
//       compressedAssetsRef.current = [];
//       onClearPending();
//       onUploadSuccess();
//     } catch (err) {
//       setProgress((p) => ({ ...p, stage: 'error' }));
//       Alert.alert(
//         'Upload failed',
//         (err as Error)?.message ?? 'Something went wrong. Please try again.',
//       );
//     }
//   }, [
//     pendingAssets,
//     pendingPhotos,
//     pendingVideos,
//     uploadedPhotoCount,
//     uploadedVideoCount,
//     compressedAssetsRef,
//     uploadMutation,
//     onClearPending,
//     onUploadSuccess,
//   ]);

//   return {
//     progress,
//     isUploading: uploadMutation.isPending,
//     handleUpload,
//   };
// }

// // ─── useDeleteMedia ───────────────────────────────────────────────────────────
// export function useDeleteMedia(propertyId: string, onDeleteSuccess: () => void) {
//   const [deletingIds, setDeletingIds] = useState<Set<number>>(new Set());
//   const [deleteTarget, setDeleteTarget] = useState<PropertyMediaItem | null>(null);
//   const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

//   const deleteMutation = useDeletePropertyMedia(propertyId);

//   const handleDeletePress = useCallback((item: PropertyMediaItem) => {
//     setDeleteTarget(item);
//     setDeleteDialogOpen(true);
//   }, []);

//   const handleDeleteCancel = useCallback(() => {
//     setDeleteDialogOpen(false);
//     setDeleteTarget(null);
//   }, []);

//   const handleDeleteConfirm = useCallback(() => {
//     if (!deleteTarget) return;
//     const mediaId = deleteTarget.mediaId;
//     setDeletingIds((prev) => new Set(prev).add(mediaId));

//     deleteMutation.mutate([mediaId], {
//       onSuccess: () => {
//         setDeletingIds((prev) => {
//           const next = new Set(prev);
//           next.delete(mediaId);
//           return next;
//         });
//         setDeleteDialogOpen(false);
//         setDeleteTarget(null);
//         onDeleteSuccess();
//       },
//       onError: () => {
//         setDeletingIds((prev) => {
//           const next = new Set(prev);
//           next.delete(mediaId);
//           return next;
//         });
//         setDeleteDialogOpen(false);
//         setDeleteTarget(null);
//         Alert.alert('Delete failed', 'Could not remove this media. Please try again.');
//       },
//     });
//   }, [deleteTarget, deleteMutation, onDeleteSuccess]);

//   return {
//     deletingIds,
//     deleteTarget,
//     deleteDialogOpen,
//     isDeletingMutation: deleteMutation.isPending,
//     handleDeletePress,
//     handleDeleteCancel,
//     handleDeleteConfirm,
//   };
// }






// import { useState, useCallback, MutableRefObject } from 'react';
// import { Alert } from 'react-native';
// import { PendingAsset, UploadProgress } from '../types/mediaUpload.types';
// import { MAX_PHOTOS, MAX_VIDEOS } from '../constants/mediaUpload.constants';
// import { uriToBlob } from '../utils/mediaUpload.utils';
// import {
//   useUploadPropertyMedia,
//   useDeletePropertyMedia,
//   PropertyMediaItem,
// } from '@/lib/agentApi';

// interface UseMediaUploadOptions {
//   propertyId: string;
//   pendingAssets: PendingAsset[];
//   pendingPhotos: number;
//   pendingVideos: number;
//   uploadedPhotoCount: number;
//   uploadedVideoCount: number;
//   compressedAssetsRef: MutableRefObject<PendingAsset[]>;
//   onUploadSuccess: () => void;
//   onClearPending: () => void;
// }

// // ─── useMediaUpload ───────────────────────────────────────────────────────────
// export function useMediaUpload({
//   propertyId,
//   pendingAssets,
//   pendingPhotos,
//   pendingVideos,
//   uploadedPhotoCount,
//   uploadedVideoCount,
//   compressedAssetsRef,
//   onUploadSuccess,
//   onClearPending,
// }: UseMediaUploadOptions) {
//   const [progress, setProgress] = useState<UploadProgress>({
//     stage: 'idle',
//     current: 0,
//     total: 0,
//   });

//   const uploadMutation = useUploadPropertyMedia(
//     propertyId,
//     (current, total) => setProgress({ stage: 'uploading', current, total }),
//   );

//   const handleUpload = useCallback(async () => {
//     if (pendingAssets.length === 0) return;

//     const totalPhotosAfter = uploadedPhotoCount + pendingPhotos;
//     const totalVideosAfter = uploadedVideoCount + pendingVideos;

//     if (totalPhotosAfter > MAX_PHOTOS || totalVideosAfter > MAX_VIDEOS) {
//       const lines: string[] = [];
//       if (totalPhotosAfter > MAX_PHOTOS) {
//         const over = totalPhotosAfter - MAX_PHOTOS;
//         lines.push(`Photos: ${totalPhotosAfter}/${MAX_PHOTOS} (remove ${over} photo${over !== 1 ? 's' : ''})`);
//       }
//       if (totalVideosAfter > MAX_VIDEOS) {
//         const over = totalVideosAfter - MAX_VIDEOS;
//         lines.push(`Videos: ${totalVideosAfter}/${MAX_VIDEOS} (remove ${over} video${over !== 1 ? 's' : ''})`);
//       }
//       Alert.alert(
//         'Upload limit exceeded',
//         `This listing has reached its media limit:\n\n${lines.join('\n')}\n\nRemove some files before uploading.`,
//       );
//       return;
//     }

//     try {
//       setProgress({ stage: 'fetching-urls', current: 0, total: pendingAssets.length });

//       const assetsWithBlobs = await Promise.all(
//         compressedAssetsRef.current.map(async (asset) => ({
//           ...asset,
//           blob: asset.blob ?? (await uriToBlob(asset.uri, asset.contentType)),
//         })),
//       );

//       setProgress({ stage: 'uploading', current: 0, total: assetsWithBlobs.length });

//       await uploadMutation.mutateAsync(
//         assetsWithBlobs.map(({ blob, contentType, fileName, fileSizeMb }) => ({
//           file: blob!,
//           contentType,
//           fileName,
//           fileSizeMb,
//         })),
//       );

//       setProgress({
//         stage: 'done',
//         current: assetsWithBlobs.length,
//         total: assetsWithBlobs.length,
//       });
//       compressedAssetsRef.current = [];
//       onClearPending();
//       onUploadSuccess();
//     } catch (err) {
//       setProgress((p) => ({ ...p, stage: 'error' }));
//       Alert.alert(
//         'Upload failed',
//         (err as Error)?.message ?? 'Something went wrong. Please try again.',
//       );
//     }
//   }, [
//     pendingAssets,
//     pendingPhotos,
//     pendingVideos,
//     uploadedPhotoCount,
//     uploadedVideoCount,
//     compressedAssetsRef,
//     uploadMutation,
//     onClearPending,
//     onUploadSuccess,
//   ]);

//   return {
//     progress,
//     isUploading: uploadMutation.isPending,
//     handleUpload,
//   };
// }

// // ─── useDeleteMedia ───────────────────────────────────────────────────────────
// export function useDeleteMedia(propertyId: string, onDeleteSuccess: () => void) {
//   const [deletingIds, setDeletingIds] = useState<Set<number>>(new Set());
//   const [deleteTarget, setDeleteTarget] = useState<PropertyMediaItem | null>(null);
//   const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

//   const deleteMutation = useDeletePropertyMedia(propertyId);

//   const handleDeletePress = useCallback((item: PropertyMediaItem) => {
//     setDeleteTarget(item);
//     setDeleteDialogOpen(true);
//   }, []);

//   const handleDeleteCancel = useCallback(() => {
//     setDeleteDialogOpen(false);
//     setDeleteTarget(null);
//   }, []);

//   const handleDeleteConfirm = useCallback(() => {
//     if (!deleteTarget) return;
//     const mediaId = deleteTarget.mediaId;
//     setDeletingIds((prev) => new Set(prev).add(mediaId));

//     deleteMutation.mutate([mediaId], {
//       onSuccess: () => {
//         setDeletingIds((prev) => {
//           const next = new Set(prev);
//           next.delete(mediaId);
//           return next;
//         });
//         setDeleteDialogOpen(false);
//         setDeleteTarget(null);
//         onDeleteSuccess();
//       },
//       onError: () => {
//         setDeletingIds((prev) => {
//           const next = new Set(prev);
//           next.delete(mediaId);
//           return next;
//         });
//         setDeleteDialogOpen(false);
//         setDeleteTarget(null);
//         Alert.alert('Delete failed', 'Could not remove this media. Please try again.');
//       },
//     });
//   }, [deleteTarget, deleteMutation, onDeleteSuccess]);

//   return {
//     deletingIds,
//     deleteTarget,
//     deleteDialogOpen,
//     isDeletingMutation: deleteMutation.isPending,
//     handleDeletePress,
//     handleDeleteCancel,
//     handleDeleteConfirm,
//   };
// }
