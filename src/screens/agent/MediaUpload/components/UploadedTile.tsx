import React from 'react';
import { View, Text, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme';
import { PropertyMediaItem } from '@/lib/agentApi';
import { styles } from '../styles';

interface Props {
  item: PropertyMediaItem;
  onDeletePress: (item: PropertyMediaItem) => void;
  isDeleting: boolean;
}

// ─── UploadedTile ─────────────────────────────────────────────────────────────
export function UploadedTile({ item, onDeletePress, isDeleting }: Props) {
  const isVideo = item.mediaType === 'VIDEO';

  return (
    <View style={[styles.gridTile, isDeleting && styles.tileDeleting]}>
      <Image source={{ uri: item.fileUrl }} style={styles.gridThumb} resizeMode="cover" />
      <View style={styles.tileScrim} />

      {isVideo && (
        <View style={styles.videoOverlay}>
          <View style={styles.playBadge}>
            <Ionicons name="play" size={14} color={colors.text.inverse} />
          </View>
        </View>
      )}

      {item.isCover && (
        <View style={styles.coverBadge}>
          <Ionicons name="star" size={8} color="#fff" />
          <Text style={styles.coverBadgeText}>Cover</Text>
        </View>
      )}

      <TouchableOpacity
        style={styles.removeTileBtn}
        onPress={() => onDeletePress(item)}
        disabled={isDeleting}
        hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
      >
        {isDeleting ? (
          <ActivityIndicator
            size="small"
            color={colors.text.inverse}
            style={{ width: 12, height: 12 }}
          />
        ) : (
          <Ionicons name="trash-outline" size={12} color={colors.text.inverse} />
        )}
      </TouchableOpacity>
    </View>
  );
}
