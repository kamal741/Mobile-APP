import { useState } from 'react';
import { Alert } from 'react-native';
import { ClientType, AddClientPayload } from '../types/client.types';
import { validateClientForm, clientTypeLabel } from '../utils/client.utils';

interface UseAddClientFormOptions {
  onSubmit: (payload: AddClientPayload) => void;
  onClose:  () => void;
}

export function useAddClientForm({ onSubmit, onClose }: UseAddClientFormOptions) {
  const [firstName,      setFirstName]      = useState('');
  const [lastName,       setLastName]       = useState('');
  const [email,          setEmail]          = useState('');
  const [clientType,     setClientType]     = useState<ClientType>('');
  const [showTypePicker, setShowTypePicker] = useState(false);

  const reset = () => {
    setFirstName('');
    setLastName('');
    setEmail('');
    setClientType('');
    setShowTypePicker(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = () => {
    const error = validateClientForm(firstName, lastName, email, clientType);
    if (error) {
      Alert.alert('Validation', error);
      return;
    }
    onSubmit({
      firstName: firstName.trim(),
      lastName:  lastName.trim(),
      email:     email.trim(),
      clientType,
    });
    reset();
  };

  const selectedTypeLabel = clientTypeLabel(clientType);

  return {
    // Field values
    firstName,  setFirstName,
    lastName,   setLastName,
    email,      setEmail,
    clientType, setClientType,
    // Picker
    showTypePicker, setShowTypePicker,
    selectedTypeLabel,
    // Actions
    handleClose,
    handleSubmit,
  };
}
