import React from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  View,
  Text,
} from 'react-native';
import { modalStyles } from '../styles/modal';
import type { RequestDetail, ShowingRequest } from '../types';
import { RequestDetailBody } from './RequestDetailBody';
import type { UseMutationResult } from '@tanstack/react-query';

// ─── Props ─────────────────────────────────────────────────────────────────────
interface Props {
  visible: boolean;
  requestDetail?: RequestDetail;
  requestDetailLoading: boolean;
  selectedRequestListData?: ShowingRequest;
  updateRequestStatus: UseMutationResult<
    unknown,
    unknown,
    { requestId: string; status: string }
  >;
  onClose: () => void;
}

// ─── RequestDetailModal ────────────────────────────────────────────────────────
export function RequestDetailModal({
  visible,
  requestDetail,
  requestDetailLoading,
  selectedRequestListData,
  updateRequestStatus,
  onClose,
}: Props) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={modalStyles.modalBackdrop} onPress={onClose}>
        <Pressable style={modalStyles.modalSheet} onPress={() => {}}>
          <View style={modalStyles.modalHandle} />
          <Text style={modalStyles.modalTitle}>Request Details</Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            <RequestDetailBody
              requestDetail={requestDetail}
              requestDetailLoading={requestDetailLoading}
              selectedRequestListData={selectedRequestListData}
              updateRequestStatus={updateRequestStatus}
              onClose={onClose}
            />
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}