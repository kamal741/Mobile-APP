import { useState } from 'react';
import { Client, SelectedProperty, Property, AlertModalState } from '../types/tour.types';
import { DEFAULT_PROPERTY_DURATION } from '../constants/tour.constants';
import { isValidDate } from '../utils/tourValidation.utils';

export function useCreateTourForm() {
  const [currentStep, setCurrentStep]               = useState(1);
  const [selectedClient, setSelectedClient]         = useState<Client | null>(null);
  const [selectedProperties, setSelectedProperties] = useState<SelectedProperty[]>([]);
  const [searchQuery, setSearchQuery]               = useState('');
  const [clientSearch, setClientSearch]             = useState('');
  const [scheduledDate, setScheduledDate]           = useState('');
  const [showDatePicker, setShowDatePicker]         = useState(false);
  const [startTime, setStartTime]                   = useState('');
  const [notes, setNotes]                           = useState('');
  const [alertModal, setAlertModal]                 = useState<AlertModalState | null>(null);

  /* ── Alert helpers ── */
  const showAlert = (
    title: string,
    message: string,
    buttons?: AlertModalState['buttons'],
  ) => {
    setAlertModal({ visible: true, title, message, buttons: buttons ?? [{ text: 'OK' }] });
  };

  const dismissAlert = () => setAlertModal(null);

  /* ── Property selection ── */
  const isPropertySelected = (id: string) =>
    selectedProperties.some((p) => p.id === id);

  const toggleProperty = (property: Property) => {
    if (isPropertySelected(property.id)) {
      setSelectedProperties((prev) => prev.filter((p) => p.id !== property.id));
    } else {
      setSelectedProperties((prev) => [
        ...prev,
        { ...property, scheduledTime: '', estimatedDuration: DEFAULT_PROPERTY_DURATION },
      ]);
    }
  };

  const updatePropertyTime = (propertyId: string, time: string) =>
    setSelectedProperties((prev) =>
      prev.map((p) => (p.id === propertyId ? { ...p, scheduledTime: time } : p)),
    );

  const updatePropertyDuration = (propertyId: string, duration: number) =>
    setSelectedProperties((prev) =>
      prev.map((p) => (p.id === propertyId ? { ...p, estimatedDuration: duration } : p)),
    );

  const removeProperty = (propertyId: string) =>
    setSelectedProperties((prev) => prev.filter((p) => p.id !== propertyId));

  /* ── Step navigation ── */
  const canProceed = (): boolean => {
    switch (currentStep) {
      case 1: return !!selectedClient;
      case 2: return selectedProperties.length > 0;
      case 3:
        return (
          isValidDate(scheduledDate)
          && /^\d{2}:\d{2}\s(?:AM|PM)$/i.test(startTime.trim())
        );
      case 4: return true;
      default: return false;
    }
  };

  const handleNext     = () => { if (currentStep < 4) setCurrentStep((s) => s + 1); };
  const handlePrevious = () => { if (currentStep > 1) setCurrentStep((s) => s - 1); };

  return {
    // step state
    currentStep,
    canProceed,
    handleNext,
    handlePrevious,
    // client state
    selectedClient,
    setSelectedClient,
    clientSearch,
    setClientSearch,
    // property state
    selectedProperties,
    searchQuery,
    setSearchQuery,
    isPropertySelected,
    toggleProperty,
    updatePropertyTime,
    updatePropertyDuration,
    removeProperty,
    // schedule state
    scheduledDate,
    setScheduledDate,
    showDatePicker,
    setShowDatePicker,
    startTime,
    setStartTime,
    notes,
    setNotes,
    // alert state
    alertModal,
    showAlert,
    dismissAlert,
  };
}
