import React from 'react';
import { View, Text } from 'react-native';
import { TOUR_STEPS } from '../../constants/tour.constants';
import { createTourStyles as s } from '../../screens/createTour.styles';

interface Props {
  currentStep: number;
}

export function StepIndicator({ currentStep }: Props) {
  return (
    <View style={s.stepIndicator}>
      {TOUR_STEPS.map((step) => (
        <View key={step.id} style={s.stepItem}>
          <View
            style={[
              s.stepCircle,
              step.id < currentStep && s.stepCompleted,
              step.id === currentStep && s.stepActive,
            ]}
          >
            {step.id < currentStep ? (
              <Text style={s.stepCheckmark}>✓</Text>
            ) : (
              <Text style={[s.stepNumber, step.id === currentStep && s.stepNumberActive]}>
                {step.id}
              </Text>
            )}
          </View>
          <Text
            style={[s.stepTitle, step.id === currentStep && s.stepTitleActive]}
            numberOfLines={1}
          >
            {step.title}
          </Text>
        </View>
      ))}
    </View>
  );
}
