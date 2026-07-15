import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme';
import { PendingAsset } from '../types/mediaUpload.types';
import { formatBytes } from '../utils/mediaUpload.utils';
import { styles } from '../styles';

interface Props {
  asset: PendingAsset;
  onRemove: (uri: string) => void;
}

// ─── PendingTile ──────────────────────────────────────────────────────────────
export function PendingTile({ asset, onRemove }: Props) {
  const isVideo = asset.contentType.startsWith('video/');

  return (
    <View style={styles.gridTile}>
      <Image source={{ uri: asset.uri }} style={styles.gridThumb} resizeMode="cover" />
      <View style={styles.tileScrim} />

      {isVideo && (
        <View style={styles.videoOverlay}>
          <View style={styles.playBadge}>
            <Ionicons name="play" size={14} color={colors.text.inverse} />
          </View>
        </View>
      )}

      <TouchableOpacity
        style={styles.removeTileBtn}
        onPress={() => onRemove(asset.uri)}
        hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
      >
        <Ionicons name="close" size={12} color={colors.text.inverse} />
      </TouchableOpacity>

      <View style={styles.tileMeta}>
        <Text style={styles.tileSizeText}>{formatBytes(asset.fileSizeMb)}</Text>
      </View>
    </View>
  );
}
