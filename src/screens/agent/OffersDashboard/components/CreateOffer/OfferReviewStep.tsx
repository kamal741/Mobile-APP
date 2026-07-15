import React from 'react';
import { View, Text } from 'react-native';
import type { OfferClient, OfferProperty } from '../../types/createOffer.types';
import { OFFER_STEP_LABELS } from '../../constants/createOffer.constants';
import { sharedOfferStyles as ss } from '../../styles/shared.styles';
import { createOfferStyles as s } from '../../styles/createOffer.styles';
import { OfferStepHeader } from './OfferStepHeader';
import { formatIndianPrice } from '../../utils/createOffer.utils';

interface Props {
  selectedClient:   OfferClient | null;
  selectedProperty: OfferProperty | null;
  amount:           string;
  notes:            string;
  submitError:      string | null;
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.reviewRow}>
      <Text style={s.reviewLabel}>{label}</Text>
      <Text style={s.reviewValue}>{value}</Text>
    </View>
  );
}

export function OfferReviewStep({
  selectedClient,
  selectedProperty,
  amount,
  notes,
  submitError,
}: Props) {
  const { icon, title, subtitle } = OFFER_STEP_LABELS[4];
  const parsedAmount = Number(amount.trim());

  return (
    <View>
      <OfferStepHeader icon={icon} title={title} subtitle={subtitle} />

      {/* Submit error */}
      {submitError ? (
        <View style={s.errorBanner}>
          <Text style={s.errorBannerText}>{submitError}</Text>
        </View>
      ) : null}

      {/* Hero amount */}
      <View style={s.heroCard}>
        <Text style={s.heroLabel}>Offer Amount</Text>
        <Text style={s.heroAmount}>${formatIndianPrice(parsedAmount)}</Text>
      </View>

      {/* Client summary */}
      <View style={ss.card}>
        <Text style={ss.sectionTitle}>Client</Text>
        {selectedClient ? (
          <>
            <ReviewRow
              label="Name"
              value={`${selectedClient.firstName} ${selectedClient.lastName}`}
            />
            <ReviewRow label="Email" value={selectedClient.email} />
            {selectedClient.clientType ? (
              <ReviewRow label="Type" value={selectedClient.clientType} />
            ) : null}
          </>
        ) : (
          <Text style={{ color: '#9CA3AF' }}>No client selected</Text>
        )}
      </View>

      {/* Property summary */}
      <View style={ss.card}>
        <Text style={ss.sectionTitle}>Property</Text>
        {selectedProperty ? (
          <>
            <ReviewRow label="Address"  value={selectedProperty.address} />
            <ReviewRow label="City"     value={selectedProperty.city} />
            <ReviewRow label="Type"     value={selectedProperty.propertyType} />
            <ReviewRow
              label="Specs"
              value={`${selectedProperty.bedrooms}br / ${selectedProperty.bathrooms}ba`}
            />
            <ReviewRow
              label="Listed Price"
              value={`$${formatIndianPrice(selectedProperty.price)}`}
            />
          </>
        ) : (
          <Text style={{ color: '#9CA3AF' }}>No property selected</Text>
        )}
      </View>

      {/* Notes */}
      {notes.trim() ? (
        <View style={ss.card}>
          <Text style={ss.sectionTitle}>Notes</Text>
          <Text style={s.notesBlock}>{notes}</Text>
        </View>
      ) : null}
    </View>
  );
}
