import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '@/theme';
import { PropertyMediaItem } from '@/lib/agentApi';
import { SectionHeader } from './MediaSharedComponents';
import { UploadedTile } from './UploadedTile';
import { styles } from '../styles';

interface Props {
  uploadedImages: PropertyMediaItem[];
  uploadedVideos: PropertyMediaItem[];
  deletingIds: Set<number>;
  mediaLoading: boolean;
  onDeletePress: (item: PropertyMediaItem) => void;
}

// ─── UploadedMediaCard ────────────────────────────────────────────────────────
export function UploadedMediaCard({
  uploadedImages,
  uploadedVideos,
  deletingIds,
  mediaLoading,
  onDeletePress,
}: Props) {
  const totalUploaded = uploadedImages.length + uploadedVideos.length;

  const subtitle = mediaLoading
    ? 'Loading…'
    : totalUploaded === 0
    ? 'No media uploaded yet'
    : `${uploadedImages.length} photo${uploadedImages.length !== 1 ? 's' : ''} · ${uploadedVideos.length} video${uploadedVideos.length !== 1 ? 's' : ''}`;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.cardTitle}>Uploaded Media</Text>
          <Text style={styles.cardSubtitle}>{subtitle}</Text>
        </View>
        {mediaLoading && <ActivityIndicator size="small" color={colors.primary.default} />}
      </View>

      {/* Photos grid */}
      {uploadedImages.length > 0 && (
        <View style={styles.gridSection}>
          <SectionHeader icon="image-outline" label="Photos" count={uploadedImages.length} />
          <View style={styles.grid}>
            {uploadedImages.map((item) => (
              <UploadedTile
                key={item.mediaId}
                item={item}
                onDeletePress={onDeletePress}
                isDeleting={deletingIds.has(item.mediaId)}
              />
            ))}
          </View>
        </View>
      )}

      {/* Videos grid */}
      {uploadedVideos.length > 0 && (
        <View
          style={[
            styles.gridSection,
            uploadedImages.length > 0 && { marginTop: spacing['3xl'] },
          ]}
        >
          <SectionHeader
            icon="videocam-outline"
            label="Videos"
            count={uploadedVideos.length}
          />
          <View style={styles.grid}>
            {uploadedVideos.map((item) => (
              <UploadedTile
                key={item.mediaId}
                item={item}
                onDeletePress={onDeletePress}
                isDeleting={deletingIds.has(item.mediaId)}
              />
            ))}
          </View>
        </View>
      )}

      {/* Empty state */}
      {!mediaLoading && totalUploaded === 0 && (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="images-outline" size={28} color={colors.text.muted} />
          </View>
          <Text style={styles.emptyTitle}>No media yet</Text>
          <Text style={styles.emptyBody}>
            Add photos and videos above to showcase this listing to buyers.
          </Text>
        </View>
      )}
    </View>
  );
}
