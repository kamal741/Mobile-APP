import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '@/theme';
import { UploadProgress, UploadStage } from '../types/mediaUpload.types';
import { styles } from '../styles';

// ─── Stage label map ──────────────────────────────────────────────────────────
const STAGE_LABEL: Record<UploadStage, (p: UploadProgress) => string> = {
  idle: () => '',
  compressing: (p) => `Compressing ${p.current} of ${p.total}…`,
  'fetching-urls': () => 'Preparing upload…',
  uploading: (p) => `Uploading ${p.current} of ${p.total}`,
  confirming: () => 'Finalising…',
  done: () => 'All media uploaded successfully',
  error: () => 'Upload failed. Please try again.',
};

interface Props {
  progress: UploadProgress;
}

// ─── ProgressBanner ───────────────────────────────────────────────────────────
export function ProgressBanner({ progress }: Props) {
  if (progress.stage === 'idle') return null;

  const isError = progress.stage === 'error';
  const isDone = progress.stage === 'done';
  const isWorking = !['idle', 'done', 'error'].includes(progress.stage);
  const pct = progress.total > 0 ? progress.current / progress.total : 0;
  const label = STAGE_LABEL[progress.stage](progress);

  return (
    <View
      style={[
        styles.progressBanner,
        isError && styles.progressBannerError,
        isDone && styles.progressBannerSuccess,
      ]}
    >
      <View style={styles.progressTop}>
        <View style={styles.progressLabelRow}>
          {isWorking && (
            <ActivityIndicator
              size="small"
              color={colors.primary.default}
              style={{ marginRight: spacing.sm }}
            />
          )}
          {isDone && (
            <View style={styles.progressIconWrap}>
              <Ionicons name="checkmark-circle" size={16} color={colors.success.default} />
            </View>
          )}
          {isError && (
            <View style={styles.progressIconWrap}>
              <Ionicons name="alert-circle" size={16} color={colors.error.default} />
            </View>
          )}
          <Text
            style={[
              styles.progressText,
              isError && { color: colors.error.default },
              isDone && { color: colors.success.default },
            ]}
          >
            {label}
          </Text>
        </View>
        {isWorking && (
          <Text style={styles.progressCount}>{Math.round(pct * 100)}%</Text>
        )}
      </View>

      {isWorking && (
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${Math.round(pct * 100)}%` }]} />
        </View>
      )}
    </View>
  );
}
