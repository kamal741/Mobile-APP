import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, shadow, sharedStyles } from '../../theme';

interface ErrorModalProps {
  visible: boolean;
  onAddProperty: () => void;
  onTryAgain: () => void;
  onClose: () => void;
}

const ErrorModal: React.FC<ErrorModalProps> = ({
  visible,
  onAddProperty,
  onTryAgain,
  onClose,
}) => (
  <Modal
    visible={visible}
    transparent
    animationType="fade"
    onRequestClose={onClose}
  >
    <View style={styles.overlay}>
      <View style={styles.sheet}>
        <Text style={styles.icon}>⚠️</Text>
        <Text style={styles.title}>Couldn't calculate a route</Text>
        <Text style={styles.body}>Try again or add a property to continue.</Text>

        <View style={styles.btnRow}>
          <TouchableOpacity
            style={[sharedStyles.btnSecondary, styles.btn]}
            onPress={onAddProperty}
            activeOpacity={0.8}
          >
            <Text style={sharedStyles.btnSecondaryText}>Add Property</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[sharedStyles.btnPrimary, styles.btn]}
            onPress={onTryAgain}
            activeOpacity={0.85}
          >
            <Text style={sharedStyles.btnPrimaryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>
);

export default ErrorModal;

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
    fontSize: 44,
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
    marginBottom: 20,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  btn: {
    flex: 1,
  },
});
