import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '@/theme';
import { PendingAsset } from '../types/mediaUpload.types';
import { MAX_PHOTOS, MAX_VIDEOS } from '../constants/mediaUpload.constants';
import { PickerButton, SectionHeader, SpacerH } from './MediaSharedComponents';
import { PendingTile } from './PendingTile';
import { styles } from '../styles';

interface Props {
  pendingAssets: PendingAsset[];
  pendingPhotos: number;
  pendingVideos: number;
  uploadedPhotoCount: number;
  uploadedVideoCount: number;
  isUploading: boolean;
  onPickPhotos: () => void;
  onPickVideos: () => void;
  onOpenCamera: () => void;
  onRemoveAsset: (uri: string) => void;
  onClearAll: () => void;
}

// ─── AddMediaCard ─────────────────────────────────────────────────────────────
export function AddMediaCard({
  pendingAssets,
  pendingPhotos,
  pendingVideos,
  uploadedPhotoCount,
  uploadedVideoCount,
  isUploading,
  onPickPhotos,
  onPickVideos,
  onOpenCamera,
  onRemoveAsset,
  onClearAll,
}: Props) {
  const totalPhotos = uploadedPhotoCount + pendingPhotos;
  const totalVideos = uploadedVideoCount + pendingVideos;
  const hasPending = pendingAssets.length > 0;

  const subtitle = hasPending
    ? `${pendingPhotos} photo${pendingPhotos !== 1 ? 's' : ''} · ${pendingVideos} video${pendingVideos !== 1 ? 's' : ''} selected`
    : `Up to ${MAX_PHOTOS} photos · ${MAX_VIDEOS} videos`;

  return (
    <View style={styles.card}>
      {/* Card header */}
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.cardTitle}>Add Media</Text>
          <Text style={styles.cardSubtitle}>{subtitle}</Text>
        </View>
        {hasPending && (
          <TouchableOpacity onPress={onClearAll} style={styles.clearBtn}>
            <Ionicons name="trash-outline" size={13} color={colors.error.default} />
            <Text style={styles.clearBtnText}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Picker buttons */}
      <View style={styles.pickerRow}>
        <PickerButton
          icon="image-outline"
          label="Photos"
          sublabel={`JPG · PNG · ${totalPhotos}/${MAX_PHOTOS}`}
          onPress={onPickPhotos}
          disabled={isUploading || totalPhotos >= MAX_PHOTOS}
        />
        <SpacerH size={spacing.md} />
        <PickerButton
          icon="videocam-outline"
          label="Videos"
          sublabel={`MP4 · MOV · ${totalVideos}/${MAX_VIDEOS}`}
          onPress={onPickVideos}
          disabled={isUploading || totalVideos >= MAX_VIDEOS}
        />
        <SpacerH size={spacing.md} />
        <PickerButton
          icon="camera-outline"
          label="Camera"
          sublabel="Photo or Video"
          onPress={onOpenCamera}
          disabled={isUploading || (totalPhotos >= MAX_PHOTOS && totalVideos >= MAX_VIDEOS)}
        />
      </View>

      {/* Pending grid */}
      {hasPending && (
        <View style={styles.gridSection}>
          <SectionHeader
            icon="time-outline"
            label="Pending Upload"
            count={pendingAssets.length}
          />
          <View style={styles.grid}>
            {pendingAssets.map((asset) => (
              <PendingTile key={asset.uri} asset={asset} onRemove={onRemoveAsset} />
            ))}
          </View>
        </View>
      )}

      {/* Tip row — only when nothing is pending */}
      {!hasPending && (
        <View style={styles.tipBox}>
          <Ionicons name="bulb-outline" size={15} color={colors.note.text} />
          <Text style={styles.tipText}>
            Listings with 10+ high-resolution photos receive up to 3× more enquiries.
            Add a walkthrough video to maximise engagement.
          </Text>
        </View>
      )}
    </View>
  );
}
