import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../../components/Card';
import { SelectedProperty } from '../../types/tour.types';
// import { createTourStyles as s } from '../../screens/CreateTour/createTour.styles';
import { createTourStyles as s } from '../../screens/createTour.styles';
import { sharedStyles as ss } from '../../styles/shared.styles';
import { StepHeader } from './StepHeader';
import { formatPrice, formatTourDate } from '../../utils/tourValidation.utils';
import { DateTimePickerModal } from '@/components/DateTimePickerModal';

interface Props {
  selectedProperties:     SelectedProperty[];
  scheduledDate:          string;
  startTime:              string;
  notes:                  string;
  onShowDatePicker:       () => void;
  onScheduledDateChange:  (date: string) => void;
  onStartTimeChange:      (time: string) => void;
  onNotesChange:          (notes: string) => void;
  onRemoveProperty:       (id: string) => void;
}

export function ScheduleStep({
  selectedProperties,
  scheduledDate,
  startTime,
  notes,
  onShowDatePicker,
  onScheduledDateChange,
  onStartTimeChange,
  onNotesChange,
  onRemoveProperty,
}: Readonly<Props>) {
  const navigation = useNavigation<any>();
  const [showTimePicker, setShowTimePicker] = useState(false);

  return (
    <View>
      <StepHeader
        icon="📅"
        title="Schedule Tour"
        subtitle="Set date/time and review selected properties"
      />

      <Card style={s.formCard}>
        <CardContent>
          <Text style={ss.inputLabel}>Tour Date *</Text>
          <TouchableOpacity
            style={s.dateInput}
            onPress={onShowDatePicker}
            activeOpacity={0.7}
          >
            <Text style={scheduledDate ? s.dateInputValue : s.dateInputPlaceholder}>
              {scheduledDate ? formatTourDate(scheduledDate) : 'Select a date'}
            </Text>
            <Text style={s.dateInputIcon}>📅</Text>
          </TouchableOpacity>

          <Text style={[ss.inputLabel, { marginTop: 16 }]}>Start Time</Text>
          <TouchableOpacity
            style={s.dateInput}
            onPress={() => setShowTimePicker(true)}
            activeOpacity={0.7}
          >
            <Text style={startTime ? s.dateInputValue : s.dateInputPlaceholder}>
              {startTime || 'Select a start time'}
            </Text>
            <Text style={s.dateInputIcon}>🕒</Text>
          </TouchableOpacity>

          {/* <Text style={[ss.inputLabel, { marginTop: 16 }]}>Notes (Optional)</Text>
          <TextInput
            style={[ss.formInput, s.textArea]}
            placeholder="Any special instructions or notes..."
            value={notes}
            onChangeText={onNotesChange}
            multiline
            numberOfLines={3}
            placeholderTextColor="#94a3b8"
          /> */}
        </CardContent>
      </Card>

      {selectedProperties.length > 0 && (
        <View style={{ marginTop: 16 }}>
          <Card style={s.formCard}>
            <CardHeader>
              <View style={s.propertyScheduleListHeader}>
                <CardTitle>Property Schedule</CardTitle>
                <Text style={s.propertyScheduleCount}>{selectedProperties.length} selected</Text>
              </View>
              <Text style={s.propertyScheduleHint}>Review property order before creating the tour.</Text>
            </CardHeader>
            <CardContent>
              {selectedProperties.map((property) => (
                <TouchableOpacity
                  key={property.id}
                  style={[ss.selectCard, s.propertyScheduleSelectableCard]}
                  activeOpacity={0.8}
                  onPress={() => {
                    navigation.navigate('PropertyDetails', {
                      propertyId: Number(property.id),
                      userType: 'agent',
                    });
                  }}
                >
                  <View style={ss.selectCardContent}>
                    <View style={ss.selectCardInfo}>
                      <Text style={ss.selectCardTitle} numberOfLines={1}>
                        {property.address}
                      </Text>
                      <Text style={ss.selectCardSubtitle}>
                        {property.city}, {property.province}
                      </Text>

                      <View style={s.propertyMeta}>
                        <View style={ss.typeBadge}>
                          <Text style={ss.typeBadgeText}>{property.propertyType}</Text>
                        </View>
                        <Text style={s.propertySpecs}>
                          {property.bedrooms}br / {property.bathrooms}ba
                        </Text>
                        <Text style={s.propertyPrice}>{formatPrice(property.price)}</Text>
                      </View>
                    </View>
                  </View>

                  <View style={s.propertyCardActions}>
                    <Text style={s.propertySelectHint}>Tap card to view full property details</Text>
                    <TouchableOpacity
                      style={s.propertyRemoveButton}
                      onPress={(event) => {
                        event.stopPropagation();
                        onRemoveProperty(property.id);
                      }}
                      activeOpacity={0.75}
                    >
                      <Text style={s.propertyRemoveButtonText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              ))}
            </CardContent>
          </Card>
        </View>
      )}

      <DateTimePickerModal
        visible={showTimePicker}
        initialDate={scheduledDate}
        initialTime={startTime}
        initialStep="time"
        onConfirm={({ date, time }) => {
          onScheduledDateChange(date);
          onStartTimeChange(time);
          setShowTimePicker(false);
        }}
        onDismiss={() => setShowTimePicker(false)}
      />
    </View>
  );
}
