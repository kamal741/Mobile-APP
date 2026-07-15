import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Sparkles } from 'lucide-react-native';
import { Colors } from '../constants/theme';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function RecommendationProcessingModal({ visible, onClose }: Readonly<Props>) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <Sparkles size={24} color={Colors.primary} />
          </View>
          <Text style={styles.title}>Building your recommendations</Text>
          <Text style={styles.message}>
            We're calculating your recommendations now. This may take a little time, and
            we'll notify you when they're ready.
          </Text>
          <TouchableOpacity style={styles.button} activeOpacity={0.8} onPress={onClose}>
            <Text style={styles.buttonText}>Got it</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
  },
  card: {
    width: '100%',
    maxWidth: 360,
    padding: 22,
    borderRadius: 12,
    backgroundColor: Colors.surface,
  },
  iconWrap: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderRadius: 24,
    backgroundColor: '#E8F5F0',
  },
  title: {
    marginBottom: 8,
    color: Colors.text,
    fontSize: 19,
    fontWeight: '700',
  },
  message: {
    marginBottom: 22,
    color: Colors.textSub,
    fontSize: 14,
    lineHeight: 21,
  },
  button: {
    alignItems: 'center',
    paddingVertical: 13,
    borderRadius: 8,
    backgroundColor: Colors.primary,
  },
  buttonText: {
    color: Colors.textInverse,
    fontSize: 15,
    fontWeight: '700',
  },
});
