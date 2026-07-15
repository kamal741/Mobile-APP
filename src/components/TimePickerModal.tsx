import React from 'react';
import { Modal, View, Text, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface TimePickerModalProps {
  visible: boolean;
  value: string; // "HH:MM" 24-hour format, e.g. "14:30"
  onConfirm: (time: string) => void;
  onDismiss: () => void;
  startHour?: number; // default 0 (12:00 AM)
  endHour?: number; // default 23 (11:30 PM)
  intervalMinutes?: number; // default 30
}

interface TimeSlot {
  label: string; // "10:00 AM"
  value: string; // "10:00"
}

const generateTimeSlots = (
  startHour: number,
  endHour: number,
  intervalMinutes: number
): TimeSlot[] => {
  const slots: TimeSlot[] = [];
  for (let h = startHour; h <= endHour; h++) {
    for (let m = 0; m < 60; m += intervalMinutes) {
      const period = h >= 12 ? 'PM' : 'AM';
      let hour12 = h % 12;
      if (hour12 === 0) hour12 = 12;
      const label = `${hour12}:${m.toString().padStart(2, '0')} ${period}`;
      const value = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
      slots.push({ label, value });
    }
  }
  return slots;
};

export function TimePickerModal({
  visible,
  value,
  onConfirm,
  onDismiss,
  startHour = 0,
  endHour = 23,
  intervalMinutes = 30,
}: TimePickerModalProps) {
  const slots = generateTimeSlots(startHour, endHour, intervalMinutes);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onDismiss}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onDismiss} />
        <SafeAreaView edges={['bottom']} style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Select Tour Time</Text>
            <TouchableOpacity onPress={onDismiss} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={slots}
            keyExtractor={(item) => item.value}
            showsVerticalScrollIndicator={false}
            style={styles.list}
            contentContainerStyle={styles.listContent}
            getItemLayout={(_, index) => ({ length: 48, offset: 48 * index, index })}
            initialScrollIndex={(() => {
              const idx = slots.findIndex((s) => s.value === value);
              return idx > 0 ? idx : 0;
            })()}
            renderItem={({ item }) => {
              const isSelected = item.value === value;
              return (
                <TouchableOpacity
                  style={[styles.slot, isSelected && styles.slotSelected]}
                  onPress={() => onConfirm(item.value)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.slotText, isSelected && styles.slotTextSelected]}>
                    {item.label}
                  </Text>
                  {isSelected && <Text style={styles.checkmark}>✓</Text>}
                </TouchableOpacity>
              );
            }}
          />
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
  },
  sheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '65%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  closeText: {
    fontSize: 18,
    color: '#94a3b8',
  },
  list: {
    paddingHorizontal: 8,
  },
  listContent: {
    paddingVertical: 8,
    paddingBottom: 24,
  },
  slot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    height: 48,
    marginHorizontal: 8,
    marginVertical: 2,
    borderRadius: 8,
  },
  slotSelected: {
    backgroundColor: '#eff6ff',
  },
  slotText: {
    fontSize: 15,
    color: '#1e293b',
  },
  slotTextSelected: {
    color: '#1e40af',
    fontWeight: '600',
  },
  checkmark: {
    fontSize: 16,
    color: '#1e40af',
    fontWeight: '700',
  },
});