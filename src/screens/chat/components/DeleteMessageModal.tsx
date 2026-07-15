import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Trash2, X } from 'lucide-react-native';
import { colors, fontSize, fontWeight } from '@/theme';

interface DeleteMessageModalProps {
  visible: boolean;
  preview: string;
  deleting?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function DeleteMessageModal({
  visible,
  preview,
  deleting = false,
  onCancel,
  onConfirm,
}: Readonly<DeleteMessageModalProps>) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={deleting ? undefined : onCancel}
    >
      <Pressable style={styles.backdrop} onPress={deleting ? undefined : onCancel}>
        <Pressable style={styles.card} onPress={() => {}}>
          <View style={styles.iconWrap}>
            <Trash2 size={26} color="#DC2626" />
          </View>

          <TouchableOpacity
            style={styles.closeButton}
            onPress={onCancel}
            disabled={deleting}
            accessibilityRole="button"
            accessibilityLabel="Close delete confirmation"
          >
            <X size={19} color={colors.text.secondary} />
          </TouchableOpacity>

          <Text style={styles.title}>Delete message?</Text>
          <Text style={styles.description}>
            This message will be removed for everyone in the conversation.
          </Text>

          {preview ? (
            <View style={styles.previewCard}>
              <Text style={styles.previewLabel}>MESSAGE</Text>
              <Text style={styles.previewText} numberOfLines={2}>
                {preview}
              </Text>
            </View>
          ) : null}

          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onCancel}
              disabled={deleting}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelButtonText}>Keep message</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.deleteButton, deleting && styles.buttonDisabled]}
              onPress={onConfirm}
              disabled={deleting}
              activeOpacity={0.7}
            >
              {deleting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Trash2 size={17} color="#FFFFFF" />
                  <Text style={styles.deleteButtonText}>Delete</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: 'rgba(15, 23, 42, 0.48)',
  },
  card: {
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    borderRadius: 24,
    padding: 24,
    backgroundColor: colors.background.surface,
    shadowColor: '#0F172A',
    shadowOpacity: 0.2,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  iconWrap: {
    width: 54,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderRadius: 27,
    backgroundColor: '#FEE2E2',
  },
  closeButton: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: colors.background.subtle,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text.primary,
  },
  description: {
    marginTop: 8,
    fontSize: fontSize.sm,
    lineHeight: 20,
    textAlign: 'center',
    color: colors.text.secondary,
  },
  previewCard: {
    width: '100%',
    marginTop: 18,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: colors.border.light,
    backgroundColor: colors.background.subtle,
  },
  previewLabel: {
    marginBottom: 4,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    letterSpacing: 0.8,
    color: colors.text.muted,
  },
  previewText: {
    fontSize: fontSize.sm,
    lineHeight: 19,
    color: colors.text.primary,
  },
  actions: {
    width: '100%',
    flexDirection: 'row',
    gap: 10,
    marginTop: 22,
  },
  cancelButton: {
    minHeight: 48,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.background.surface,
  },
  cancelButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semiBold,
    color: colors.text.primary,
  },
  deleteButton: {
    minHeight: 48,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderRadius: 14,
    backgroundColor: '#DC2626',
  },
  deleteButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: '#FFFFFF',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
});
