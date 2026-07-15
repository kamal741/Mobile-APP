import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Property } from '../../types';
import { colors, shadow, sharedStyles } from '../../theme';

interface RemovePropertyModalProps {
  visible: boolean;
  property: Property | null;
  onMoveToNew: () => void;
  onDelete: () => void;
  onCancel: () => void;
  isMoving?: boolean;
  isDeleting?: boolean;
}

const RemovePropertyModal: React.FC<RemovePropertyModalProps> = ({
  visible,
  property,
  onMoveToNew,
  onDelete,
  onCancel,
  isMoving = false,
  isDeleting = false,
}) => {
  const isBusy = isMoving || isDeleting;

  return (
  <Modal
    visible={visible}
    transparent
    animationType="fade"
    onRequestClose={onCancel}
  >
    <View style={styles.overlay}>
      <View style={styles.sheet}>
        <Text style={styles.icon}>❓</Text>
        <Text style={styles.title}>Remove this property?</Text>
        <Text style={styles.body}>
          You can move it to a new showing request, or remove it from this one entirely.
        </Text>

        {property && (
          <View style={styles.propertyDetail}>
            <Text style={styles.detailLabel}>Address</Text>
            <Text style={styles.detailValue}>{property.address}</Text>
          </View>
        )}

        <TouchableOpacity
          style={[sharedStyles.btnPrimary, styles.btn, isBusy && styles.btnDisabled]}
          onPress={onMoveToNew}
          activeOpacity={0.85}
          disabled={isBusy}
        >
          {isMoving ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Text style={sharedStyles.btnPrimaryText}>📝{'  '}Move to New Request</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[sharedStyles.btnDanger, styles.btn, isBusy && styles.btnDisabled]}
          onPress={onDelete}
          activeOpacity={0.85}
          disabled={isBusy}
        >
          {isDeleting ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Text style={sharedStyles.btnDangerText}>🗑️{'  '}Delete from Request</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[sharedStyles.btnGhost, styles.btn, isBusy && styles.btnDisabled]}
          onPress={onCancel}
          activeOpacity={0.7}
          disabled={isBusy}
        >
          <Text style={sharedStyles.btnGhostText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
  );
};

export default RemovePropertyModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  sheet: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    ...shadow.modal,
  },
  icon: {
    fontSize: 40,
    marginBottom: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  body: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  propertyDetail: {
    backgroundColor: colors.bg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    width: '100%',
    marginBottom: 16,
  },
  detailLabel: {
    fontSize: 11,
    color: colors.textMuted,
    textTransform: 'uppercase',
    fontWeight: '600',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  btn: {
    width: '100%',
    marginBottom: 8,
  },
  btnDisabled: {
    opacity: 0.5,
  },
});

