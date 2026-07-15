import React from 'react';
import { Modal, View, Text, TouchableOpacity } from 'react-native';
import { AlertModalState } from '../screens/agent/TourDashboard/types/tour.types';
// import { alertStyles } from '../../screens/CreateTour/createTour.styles';
import { alertStyles } from '../screens/agent/TourDashboard/screens/createTour.styles';

interface Props {
  modal:        AlertModalState | null;
  onDismiss:    () => void;
}

export function AlertModal({ modal, onDismiss }: Props) {
  if (!modal?.visible) return null;

  return (
    <Modal transparent animationType="fade" visible={modal.visible}>
      <View style={alertStyles.overlay}>
        <View style={alertStyles.box}>
          <Text style={alertStyles.title}>{modal.title}</Text>
          <Text style={alertStyles.message}>{modal.message}</Text>
          <View style={alertStyles.buttonRow}>
            {modal.buttons.map((btn, i) => (
              <TouchableOpacity
                key={i}
                style={[
                  alertStyles.button,
                  btn.style === 'cancel'
                    ? alertStyles.cancelButton
                    : alertStyles.primaryButton,
                ]}
                onPress={() => {
                  onDismiss();
                  btn.onPress?.();
                }}
              >
                <Text
                  style={[
                    alertStyles.buttonText,
                    btn.style === 'cancel'
                      ? alertStyles.cancelButtonText
                      : alertStyles.primaryButtonText,
                  ]}
                >
                  {btn.text}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}
