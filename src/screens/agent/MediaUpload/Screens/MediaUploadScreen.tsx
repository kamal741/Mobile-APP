/**
 * @file MediaUploadScreen.tsx
 * @description Property media upload screen for agents.
 *
 * Upload flow (in order):
 *  1. Agent picks images/videos via ImagePicker (gallery) or Camera
 *  2. On "Upload All" tap:
 *     a. Fetch pre-signed GCS URLs for all compressed pending files
 *     b. PUT each uploadUrl — upload binary to GCS (no auth header)
 *     c. POST …/media/confirm — bulk-confirm all mediaIds → status APPROVED
 *  3. Confirmed items appear in the "Uploaded Media" section via GET …/media
 *
 * Props: route.params.propertyId (string | number)
 *
 * Compression strategy (eager, runs at selection time):
 *  - Images : expo-image-manipulator → WebP, 1920px cap, adaptive quality
 *  - Videos : react-native-compressor → H.264 MP4, 720p max, 1.8 Mbps
 */

import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, globalStyles } from '@/theme';
import { usePropertyMedia } from '@/lib/agentApi';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';

import { usePendingAssets } from '../hooks/usePendingAssets';
import { useCompressedAssets } from '../hooks/useCompressedAssets';
import { useMediaUpload, useDeleteMedia } from '../hooks/useMediaUpload';

import { ProgressBanner } from '../components/ProgressBanner';
import { AddMediaCard } from '../components/AddMediaCard';
import { UploadedMediaCard } from '../components/UploadedMediaCard';
import { GuidelinesCard } from '../components/GuidelinesCard';
import { DeleteConfirmDialog } from '../components/DeleteConfirmDialog';
import { StatChip } from '../components/MediaSharedComponents';

import { styles } from '../styles';

type Props = NativeStackScreenProps<RootStackParamList, 'MediaUpload'>;

// ─── MediaUploadScreen ────────────────────────────────────────────────────────
export default function MediaUploadScreen({ route, navigation }: Props) {
  const propertyId = String(route.params?.propertyId);
  const propertyAddress = (route.params as any)?.propertyAddress as string | undefined;

  // ── Remote data ────────────────────────────────────────────────────────────
  const {
    data: mediaData,
    isLoading: mediaLoading,
    refetch: refetchMedia,
  } = usePropertyMedia(propertyId);

  const uploadedImages = mediaData?.images ?? [];
  const uploadedVideos = mediaData?.videos ?? [];
  const totalUploaded = uploadedImages.length + uploadedVideos.length;

  // ── Pending assets ─────────────────────────────────────────────────────────
  const {
    pendingAssets,
    pendingPhotos,
    pendingVideos,
    removeAsset,
    clearAll,
    pickPhotos,
    pickVideos,
    openCamera,
    setPendingAssets,
  } = usePendingAssets({
    uploadedPhotoCount: uploadedImages.length,
    uploadedVideoCount: uploadedVideos.length,
  });

  // ── Eager compression ──────────────────────────────────────────────────────
  const { isCompressing, compressedAssetsRef } = useCompressedAssets(pendingAssets);

  // ── Upload flow ────────────────────────────────────────────────────────────
  const { progress, isUploading, handleUpload } = useMediaUpload({
    propertyId,
    pendingAssets,
    pendingPhotos,
    pendingVideos,
    uploadedPhotoCount: uploadedImages.length,
    uploadedVideoCount: uploadedVideos.length,
    compressedAssetsRef,
    onUploadSuccess: refetchMedia,
    onClearPending: clearAll,
  });

  // ── Delete media ───────────────────────────────────────────────────────────
  const {
    deletingIds,
    deleteTarget,
    deleteDialogOpen,
    isDeletingMutation,
    handleDeletePress,
    handleDeleteCancel,
    handleDeleteConfirm,
  } = useDeleteMedia(propertyId, refetchMedia);

  const isBusy = isUploading || isCompressing;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={globalStyles.safeContainer} edges={['top', 'bottom']}>

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={navigation.goBack}
          hitSlop={{ top: 10, left: 10, bottom: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={20} color={colors.text.primary} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Property Media</Text>
          {propertyAddress ? (
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {propertyAddress}
            </Text>
          ) : null}
        </View>

        <View style={styles.headerBadge}>
          <Ionicons name="images-outline" size={13} color={colors.primary.default} />
          <Text style={styles.headerBadgeText}>{totalUploaded}</Text>
        </View>
      </View>

      <ScrollView
        style={globalStyles.flex1}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Progress Banner */}
        <ProgressBanner progress={progress} />

        {/* Stats Row */}
        {totalUploaded > 0 && (
          <View style={styles.statsRow}>
            <StatChip icon="image-outline" value={uploadedImages.length} label="Photos" />
            <View style={styles.statDivider} />
            <StatChip icon="videocam-outline" value={uploadedVideos.length} label="Videos" />
            <View style={styles.statDivider} />
            <StatChip icon="folder-outline" value={totalUploaded} label="Total" />
          </View>
        )}

        {/* Add Media Card */}
        <AddMediaCard
          pendingAssets={pendingAssets}
          pendingPhotos={pendingPhotos}
          pendingVideos={pendingVideos}
          uploadedPhotoCount={uploadedImages.length}
          uploadedVideoCount={uploadedVideos.length}
          isUploading={isBusy}
          onPickPhotos={pickPhotos}
          onPickVideos={pickVideos}
          onOpenCamera={openCamera}
          onRemoveAsset={removeAsset}
          onClearAll={clearAll}
        />

        {/* Upload Button */}
        {pendingAssets.length > 0 && (
          <TouchableOpacity
            style={[styles.uploadBtn, isBusy && styles.uploadBtnDisabled]}
            onPress={handleUpload}
            disabled={isBusy}
            activeOpacity={0.85}
          >
            {isBusy ? (
              <>
                <ActivityIndicator
                  size="small"
                  color={colors.text.inverse}
                  style={{ marginRight: spacing.sm }}
                />
                <Text style={styles.uploadBtnText}>
                  {isCompressing ? 'Compressing…' : 'Uploading…'}
                </Text>
              </>
            ) : (
              <>
                <Ionicons
                  name="cloud-upload-outline"
                  size={18}
                  color={colors.text.inverse}
                  style={{ marginRight: spacing.sm }}
                />
                <Text style={styles.uploadBtnText}>
                  Upload {pendingAssets.length}{' '}
                  {pendingAssets.length === 1 ? 'File' : 'Files'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {/* Uploaded Media Card */}
        <UploadedMediaCard
          uploadedImages={uploadedImages}
          uploadedVideos={uploadedVideos}
          deletingIds={deletingIds}
          mediaLoading={mediaLoading}
          onDeletePress={handleDeletePress}
        />

        {/* Guidelines Card */}
        <GuidelinesCard />

        <View style={{ height: spacing['8xl'] }} />
      </ScrollView>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        visible={deleteDialogOpen}
        deleteTarget={deleteTarget}
        isDeletingMutation={isDeletingMutation}
        onCancel={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
      />
    </SafeAreaView>
  );
}
