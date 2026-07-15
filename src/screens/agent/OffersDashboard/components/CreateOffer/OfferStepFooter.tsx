import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { createOfferStyles as s } from '../../styles/createOffer.styles';
import { OFFER_STRINGS, TOTAL_STEPS } from '../../constants/createOffer.constants';
import { C } from '../../styles/shared.styles';

interface Props {
  currentStep:  number;
  canProceed:   boolean;
  isSubmitting: boolean;
  onBack:       () => void;
  onNext:       () => void;
  onSubmit:     () => void;
}

export function OfferStepFooter({
  currentStep,
  canProceed,
  isSubmitting,
  onBack,
  onNext,
  onSubmit,
}: Props) {
  const isLastStep = currentStep === TOTAL_STEPS;

  return (
    <View style={s.footer}>
      {currentStep > 1 && (
        <TouchableOpacity style={s.backButton} onPress={onBack} disabled={isSubmitting}>
          <Text style={s.backButtonText}>{OFFER_STRINGS.BACK}</Text>
        </TouchableOpacity>
      )}

      {!isLastStep ? (
        <TouchableOpacity
          style={[s.nextButton, !canProceed && s.buttonDisabled]}
          onPress={onNext}
          disabled={!canProceed}
          activeOpacity={0.85}
        >
          <Text style={s.nextButtonText}>{OFFER_STRINGS.NEXT}</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={[s.submitButton, (!canProceed || isSubmitting) && s.buttonDisabled]}
          onPress={onSubmit}
          disabled={!canProceed || isSubmitting}
          activeOpacity={0.85}
        >
          {isSubmitting ? (
            <ActivityIndicator color={C.textOnPrimary} size="small" />
          ) : (
            <Text style={s.submitButtonText}>{OFFER_STRINGS.SUBMIT}</Text>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}
