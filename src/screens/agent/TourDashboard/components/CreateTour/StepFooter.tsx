import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createTourStyles as s } from '../../screens/createTour.styles';

interface Props {
  currentStep:  number;
  canProceed:   boolean;
  isPending:    boolean;
  onPrevious:   () => void;
  onNext:       () => void;
  onCreate:     () => void;
}

export function StepFooter({
  currentStep,
  canProceed,
  isPending,
  onPrevious,
  onNext,
  onCreate,
}: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        s.footer,
        { paddingBottom: 12 + Math.max(insets.bottom, 0) },
      ]}
    >
      {currentStep > 1 && (
        <TouchableOpacity style={s.backButton} onPress={onPrevious}>
          <Text style={s.backButtonText}>← Back</Text>
        </TouchableOpacity>
      )}

      <View style={s.flex1} />

      {currentStep < 4 ? (
        <TouchableOpacity
          style={[s.nextButton, !canProceed && s.buttonDisabled]}
          onPress={onNext}
          disabled={!canProceed}
        >
          <Text style={s.nextButtonText}>Next →</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={[s.createButton, isPending && s.buttonDisabled]}
          onPress={onCreate}
          disabled={isPending}
        >
          {isPending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={s.createButtonText}>Create Tour</Text>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}
