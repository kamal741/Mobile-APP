import React, { useState } from 'react';
import { View, Text, TextInput } from 'react-native';
import { OFFER_STRINGS, OFFER_STEP_LABELS } from '../../constants/createOffer.constants';
import { sharedOfferStyles as ss } from '../../styles/shared.styles';
import { createOfferStyles as s } from '../../styles/createOffer.styles';
import { C } from '../../styles/shared.styles';
import { OfferStepHeader } from './OfferStepHeader';
import { Input } from '../../../../../components/Input';
import type { CreateOfferAmountErrors } from '../../types/createOffer.types';

interface Props {
  amount:  string;
  notes:   string;
  errors:  CreateOfferAmountErrors;
  onAmountChange: (v: string) => void;
  onNotesChange:  (v: string) => void;
}

export function OfferPriceStep({
  amount,
  notes,
  errors,
  onAmountChange,
  onNotesChange,
}: Props) {
  const [notesFocused, setNotesFocused] = useState(false);
  const { icon, title, subtitle } = OFFER_STEP_LABELS[3];

  return (
    <View>
      <OfferStepHeader icon={icon} title={title} subtitle={subtitle} />

      {/* Amount */}
      <Input
        label={OFFER_STRINGS.LABEL_AMOUNT}
        required
        error={errors.amount}
        placeholder="Enter price in $"
        value={amount}
        onChangeText={onAmountChange}
        keyboardType="numeric"
        returnKeyType="next"
      />

      {/* Notes */}
      <Text style={[ss.inputLabel, { marginTop: 8 }]}>{OFFER_STRINGS.LABEL_NOTES}</Text>
      <TextInput
        style={[
          ss.formInput,
          s.notesInput,
          notesFocused && { borderColor: C.borderFocus },
          !!errors.notes && { borderColor: C.borderError },
        ]}
        placeholder={OFFER_STRINGS.PLACEHOLDER_NOTE}
        placeholderTextColor={C.textMuted}
        value={notes}
        onChangeText={onNotesChange}
        multiline
        maxLength={OFFER_STRINGS.NOTES_MAX}
        onFocus={() => setNotesFocused(true)}
        onBlur={() => setNotesFocused(false)}
      />
      <Text style={s.charCount}>{notes.length}/{OFFER_STRINGS.NOTES_MAX}</Text>
      {!!errors.notes && (
        <Text style={s.errorText}>{errors.notes}</Text>
      )}
    </View>
  );
}
