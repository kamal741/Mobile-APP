import React from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';
import { moveModalStyles as S } from '../styles/moveModalStyles';
import type { FieldDef, ScreenDef } from '../types/preferences';

interface Props {
  visible:           boolean;
  field:             FieldDef | null;
  currentSectionKey: string;
  screens:           ScreenDef[];
  onMove:            (targetSectionKey: string) => void;
  onClose:           () => void;
}

export function MoveFieldModal({
  visible,
  field,
  currentSectionKey,
  screens,
  onMove,
  onClose,
}: Props) {
  if (!field) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={S.modalOverlay} activeOpacity={1} onPress={onClose}>
        <View style={S.modalCard}>
          <Text style={S.modalTitle}>Move "{field.label}" to…</Text>
          <Text style={S.modalSub}>Select the priority section</Text>

          {screens.map(s => {
            const isCurrent = s.key === currentSectionKey;
            return (
              <TouchableOpacity
                key={s.key}
                style={[S.modalOption, isCurrent && S.modalOptionCurrent]}
                activeOpacity={isCurrent ? 1 : 0.7}
                onPress={() => {
                  if (!isCurrent) { onMove(s.key); onClose(); }
                }}
              >
                <View style={[S.modalDot, { backgroundColor: s.dotColor }]} />
                <Text style={[S.modalOptionTxt, isCurrent && S.modalOptionTxtCurrent]}>
                  {s.dot} {s.title}
                </Text>
                {isCurrent && <Text style={S.modalCurrentBadge}>Current</Text>}
              </TouchableOpacity>
            );
          })}

          <TouchableOpacity style={S.modalCancel} onPress={onClose}>
            <Text style={S.modalCancelTxt}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}
