import React, { useCallback, useRef } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';

// Hooks
import { useCreateTourForm } from '../hooks/useCreateTourForm';
import { useCreateTourData } from '../hooks/useCreateTourData';
import { useCreateShowingRequest } from '@/lib/agentRoutePlanningAPI';

// Step components
import { SelectClientStep }     from '../components/CreateTour/SelectClientStep';
import { SelectPropertiesStep } from '../components/CreateTour/SelectPropertiesStep';
import { ScheduleStep }         from '../components/CreateTour/ScheduleStep';
import { ReviewStep }           from '../components/CreateTour/ReviewStep';

// Shared UI
import { StepIndicator } from '../components/CreateTour/StepIndicator';
import { StepFooter }    from '../components/CreateTour/StepFooter';
import { AlertModal }    from '@/components/AlertModal';
import { DatePickerModal } from '../../../../components/DatePickerModal';

// Styles
import { createTourStyles as s } from './createTour.styles';

export function CreateTourScreen() {
  const navigation = useNavigation<any>();
  const form       = useCreateTourForm();
  const data       = useCreateTourData();
  const mutation   = useCreateShowingRequest();

  // Holds the newly created showing request ID so the dismiss handler can navigate.
  const createdRequestIdRef = useRef<string | null>(null);

  const handleCreate = useCallback(() => {
    if (!form.canProceed()) return;
    if (!form.selectedClient) return;

    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const preferredDate = form.scheduledDate.includes('T')
      ? form.scheduledDate.slice(0, 10)
      : form.scheduledDate;

    mutation.mutate(
      {
        clientId:      Number(form.selectedClient.id),
        propertyIds:   form.selectedProperties.map((p) => Number(p.id)),
        preferredDate,
        preferredTime: form.startTime,
        timezone,
      },
      {
        onSuccess: (response) => {
          createdRequestIdRef.current = response.id;
          form.showAlert('success', 'Showing request created successfully!');
        },
        onError: (err) => {
          createdRequestIdRef.current = null;
          form.showAlert('error', err.message ?? 'Failed to create showing request.');
        },
      },
    );
  }, [form, mutation]);

  // Wraps dismissAlert: if the modal was a success, navigate to RoutePlanning after closing.
  const handleDismissAlert = useCallback(() => {
    const requestId = createdRequestIdRef.current;
    createdRequestIdRef.current = null;
    form.dismissAlert();

    if (requestId) {
      navigation.navigate('RoutePlanning', { showingRequestId: requestId });
    }
  }, [form, navigation]);

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StepIndicator currentStep={form.currentStep} />

      <ScrollView style={s.scrollView} contentContainerStyle={s.scrollContent}>
        {form.currentStep === 1 && (
          <SelectClientStep
            clients={data.clients}
            clientsLoading={data.clientsLoading}
            selectedClient={form.selectedClient}
            clientSearch={form.clientSearch}
            onSearchChange={form.setClientSearch}
            onSelectClient={form.setSelectedClient}
          />
        )}

        {form.currentStep === 2 && (
          <SelectPropertiesStep
            selectedCount={form.selectedProperties.length}
            searchQuery={form.searchQuery}
            onSearchChange={form.setSearchQuery}
            isPropertySelected={form.isPropertySelected}
            onToggleProperty={form.toggleProperty}
          />
        )}

        {form.currentStep === 3 && (
          <ScheduleStep
            selectedProperties={form.selectedProperties}
            scheduledDate={form.scheduledDate}
            startTime={form.startTime}
            notes={form.notes}
            onShowDatePicker={() => form.setShowDatePicker(true)}
            onScheduledDateChange={form.setScheduledDate}
            onStartTimeChange={form.setStartTime}
            onNotesChange={form.setNotes}
            onRemoveProperty={form.removeProperty}
          />
        )}

        {form.currentStep === 4 && (
          <ReviewStep
            selectedClient={form.selectedClient}
            selectedProperties={form.selectedProperties}
            scheduledDate={form.scheduledDate}
            startTime={form.startTime}
            notes={form.notes}
          />
        )}
      </ScrollView>

      <StepFooter
        currentStep={form.currentStep}
        canProceed={form.canProceed()}
        isPending={mutation.isPending}
        onPrevious={form.handlePrevious}
        onNext={form.handleNext}
        onCreate={handleCreate}
      />

      <DatePickerModal
        visible={form.showDatePicker}
        value={form.scheduledDate}
        onConfirm={(date) => {
          form.setScheduledDate(date);
          form.setShowDatePicker(false);
        }}
        onDismiss={() => form.setShowDatePicker(false)}
      />

      <AlertModal modal={form.alertModal} onDismiss={handleDismissAlert} />
    </KeyboardAvoidingView>
  );
}
