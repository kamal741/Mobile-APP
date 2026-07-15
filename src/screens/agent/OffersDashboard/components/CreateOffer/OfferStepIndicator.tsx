import React from 'react';
import { View, Text } from 'react-native';
import { OFFER_STEPS } from '../../types/createOffer.types';
import { createOfferStyles as s } from '../../styles/createOffer.styles';

interface Props {
  currentStep: number;
}

export function OfferStepIndicator({ currentStep }: Props) {
  return (
    <View style={s.stepBar}>
      {OFFER_STEPS.map((step, index) => {
        const isActive    = step.id === currentStep;
        const isCompleted = step.id < currentStep;

        return (
          <View key={step.id} style={s.stepItem}>
            {/* Connector line (not on last item) */}
            {index < OFFER_STEPS.length - 1 && (
              <View style={[s.stepConnector, isCompleted && s.stepConnectorDone]} />
            )}

            <View
              style={[
                s.stepCircle,
                isCompleted && s.stepCompleted,
                isActive    && s.stepActive,
              ]}
            >
              {isCompleted ? (
                <Text style={s.stepCheckmark}>✓</Text>
              ) : (
                <Text style={[s.stepNumber, isActive && s.stepNumberActive]}>
                  {step.id}
                </Text>
              )}
            </View>

            <Text
              style={[
                s.stepLabel,
                isActive    && s.stepLabelActive,
                isCompleted && s.stepLabelCompleted,
              ]}
              numberOfLines={1}
            >
              {step.title}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
