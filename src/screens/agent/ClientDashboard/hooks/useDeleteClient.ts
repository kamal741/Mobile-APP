import { Alert, Platform } from 'react-native';
import { useMutation } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { queryClient } from '../../../../lib/queryClient';
import { clientProfileService } from '../services/clientProfile.service';
import { Client } from '../types/client.types';

interface Options {
  clientId: string;
  client: Client;
  onRequestConfirm: () => void;   // open native confirm modal on iOS/Android
  onDismissConfirm: () => void;   // close it
}

export function useDeleteClient({
  clientId,
  client,
  onRequestConfirm,
  onDismissConfirm,
}: Options) {
  const navigation = useNavigation<any>();

  const goBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('Main' as any);
    }
  };

  const mutation = useMutation({
    mutationFn: () => clientProfileService.deleteClient(clientId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      onDismissConfirm();
      if (Platform.OS === 'web') {
        globalThis.alert('Client has been removed successfully.');
        goBack();
      } else {
        Alert.alert('Deleted', 'Client has been removed successfully.', [
          { text: 'OK', onPress: goBack },
        ]);
      }
    },
    onError: (error: any) => {
      console.log('Delete client error:', JSON.stringify(error?.response?.data), error?.message);
      const msg =
        error?.response?.data?.message ||
        error?.message ||
        'Failed to delete client. Please try again.';
      onDismissConfirm();
      if (Platform.OS === 'web') {
        globalThis.alert(msg);
      } else {
        Alert.alert('Error', msg);
      }
    },
  });

  /** Initiates delete — shows native confirm on mobile, window.confirm on web. */
  const handleDelete = () => {
    if (Platform.OS === 'web') {
      const confirmed = globalThis.confirm(
        `Are you sure you want to delete ${client?.firstName} ${client?.lastName}? This action cannot be undone.`
      );
      if (confirmed) mutation.mutate();
    } else {
      onRequestConfirm();
    }
  };

  return {
    handleDelete,
    confirmDelete: () => mutation.mutate(),
    isPending:     mutation.isPending,
  };
}
