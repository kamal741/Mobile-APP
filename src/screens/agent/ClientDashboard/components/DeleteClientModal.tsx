import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { colors, spacing } from '../styles/shared.styles';

interface Props {
  visible:      boolean;
  clientName:   string;
  isDeleting:   boolean;
  onConfirm:    () => void;
  onCancel:     () => void;
}

export function DeleteClientModal({
  visible,
  clientName,
  isDeleting,
  onConfirm,
  onCancel,
}: Props) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.content}>
          <Text style={styles.title}>Delete Client</Text>
          <Text style={styles.message}>
            Are you sure you want to delete {clientName}? This action cannot be undone.
          </Text>
          <View style={styles.buttons}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={onConfirm}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <ActivityIndicator size="small" color={colors.textInverted} />
              ) : (
                <Text style={styles.deleteText}>Delete</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  content: {
    backgroundColor: colors.bgCard,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  message: {
    fontSize: 15,
    color: '#475569',
    lineHeight: 22,
    marginBottom: 24,
  },
  buttons:   { flexDirection: 'row', gap: spacing.md },
  cancelBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: spacing.sm + 2,
    backgroundColor: colors.bgMuted,
    alignItems: 'center',
  },
  cancelText: { fontSize: 15, fontWeight: '600', color: '#475569' },
  deleteBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: spacing.sm + 2,
    backgroundColor: '#dc2626',
    alignItems: 'center',
  },
  deleteText: { fontSize: 15, fontWeight: '600', color: colors.textInverted },
});
