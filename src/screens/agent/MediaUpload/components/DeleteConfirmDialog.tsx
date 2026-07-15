import React from 'react';
import {
  Modal,
  Pressable,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PropertyMediaItem } from '@/lib/agentApi';
import { styles } from '../styles';

interface Props {
  visible: boolean;
  deleteTarget: PropertyMediaItem | null;
  isDeletingMutation: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

// ─── DeleteConfirmDialog ──────────────────────────────────────────────────────
export function DeleteConfirmDialog({
  visible,
  deleteTarget,
  isDeletingMutation,
  onCancel,
  onConfirm,
}: Props) {
  const mediaLabel = deleteTarget?.mediaType === 'VIDEO' ? 'video' : 'photo';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <Pressable style={styles.dialogOverlay} onPress={onCancel}>
        <Pressable style={styles.dialogBox} onPress={() => {}}>
          <View style={styles.dialogIconWrap}>
            <Ionicons name="trash-outline" size={28} color={undefined} />
          </View>
          <Text style={styles.dialogTitle}>Delete Media?</Text>
          <Text style={styles.dialogBody}>
            This will permanently remove this {mediaLabel} from the property. This action
            cannot be undone.
          </Text>
          <View style={styles.dialogActions}>
            <TouchableOpacity
              style={styles.dialogBtnCancel}
              onPress={onCancel}
              disabled={isDeletingMutation}
            >
              <Text style={styles.dialogBtnCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.dialogBtnDelete, isDeletingMutation && { opacity: 0.6 }]}
              onPress={onConfirm}
              disabled={isDeletingMutation}
            >
              {isDeletingMutation ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.dialogBtnDeleteText}>Delete</Text>
              )}
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
