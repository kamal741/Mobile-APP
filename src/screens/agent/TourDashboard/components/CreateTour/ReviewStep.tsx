import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../../components/Card';
import { Client, SelectedProperty } from '../../types/tour.types';
import { createTourStyles as s } from '../../screens/createTour.styles';
import { sharedStyles as ss } from '../../styles/shared.styles';
import { StepHeader } from './StepHeader';
import { formatPrice } from '../../utils/tourValidation.utils';

interface Props {
  selectedClient: Client | null;
  selectedProperties: SelectedProperty[];
  scheduledDate: string;
  startTime: string;
  notes: string;
}

export function ReviewStep({
  selectedClient,
  selectedProperties,
  scheduledDate,
  startTime,
  notes,
}: Readonly<Props>) {
  const navigation = useNavigation<any>();

  return (
    <View>
      <StepHeader
        icon="✅"
        title="Review & Create"
        subtitle="Confirm all details before creating the tour"
      />

      <Card style={s.formCard}>
        <CardHeader>
          <CardTitle>Tour Details</CardTitle>
        </CardHeader>
        <CardContent>
          <ReviewRow
            label="Client"
            value={
              selectedClient
                ? `${selectedClient.firstName} ${selectedClient.lastName}`
                : '-'
            }
          />
          {selectedClient && (
            <ReviewRow label="Type" value={selectedClient.clientType || 'buyer'} />
          )}
          <ReviewRow label="Date" value={scheduledDate || '-'} />
          <ReviewRow label="Start Time" value={startTime || 'Not set'} />
          {notes ? <ReviewRow label="Notes" value={notes} /> : null}
        </CardContent>
      </Card>

      <View style={{ marginTop: 16 }}>
        <Card style={s.formCard}>
          <CardHeader>
            <View style={s.propertyScheduleListHeader}>
              <CardTitle>Property Schedule</CardTitle>
              <Text style={s.propertyScheduleCount}>
                {selectedProperties.length} selected
              </Text>
            </View>
            <Text style={s.propertyScheduleHint}>
              Tap a property to view full details.
            </Text>
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
                      <Text style={s.propertyPrice}>
                        {formatPrice(property.price)}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={s.propertyCardActions}>
                  <Text style={s.propertySelectHint}>
                    Tap card to view full property details
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </CardContent>
        </Card>
      </View>
    </View>
  );
}

function ReviewRow({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <View style={s.reviewRow}>
      <Text style={s.reviewLabel}>{label}</Text>
      <Text style={s.reviewValue}>{value}</Text>
    </View>
  );
}
