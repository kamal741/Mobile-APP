import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Colors } from '../constants/theme';

interface Props {
  visible:   boolean;
  isSaving?: boolean;
  onStay:    () => void;
  onDiscard: () => void;
  onSave:    () => void;
}

export function UnsavedChangesModal({
  visible,
  isSaving = false,
  onStay,
  onDiscard,
  onSave,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onStay}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Unsaved changes</Text>
          <Text style={styles.message}>
            You have unsaved preference changes. Save them before leaving?
          </Text>

          <TouchableOpacity style={styles.saveBtn} onPress={onSave} disabled={isSaving}>
            {isSaving ? (
              <ActivityIndicator color={Colors.textInverse} />
            ) : (
              <Text style={styles.saveBtnTxt}>Save</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.discardBtn} onPress={onDiscard} disabled={isSaving}>
            <Text style={styles.discardBtnTxt}>Discard changes</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.stayBtn} onPress={onStay} disabled={isSaving}>
            <Text style={styles.stayBtnTxt}>Stay</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: Colors.textSub,
    lineHeight: 20,
    marginBottom: 20,
  },
  saveBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    marginBottom: 10,
  },
  saveBtnTxt: {
    color: Colors.textInverse,
    fontSize: 15,
    fontWeight: '700',
  },
  discardBtn: {
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FC8181',
    backgroundColor: '#FFF5F5',
    marginBottom: 10,
  },
  discardBtnTxt: {
    color: '#C53030',
    fontSize: 15,
    fontWeight: '600',
  },
  stayBtn: {
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderMid,
  },
  stayBtnTxt: {
    color: Colors.textSub,
    fontSize: 15,
    fontWeight: '600',
  },
});
