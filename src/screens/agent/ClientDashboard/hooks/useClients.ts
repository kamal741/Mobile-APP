import { Alert } from 'react-native';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '../../../../lib/queryClient';
import { clientService } from '../services/client.service';
import { QUERY_KEYS } from '../constants/clients.constants';
import { Client, FilterType } from '../types/client.types';

export function useClients(filterType: FilterType = 'all') {
  const {
    data: clients = [],
    isLoading,
    refetch,
  } = useQuery<Client[]>({
    queryKey: [...QUERY_KEYS.agentClients, filterType] as const,
    queryFn:  () => clientService.fetchClients(filterType),
  });

  const addClientMutation = useMutation({
    mutationFn: clientService.addClient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.agentClients });
      Alert.alert('Success', 'New client has been added successfully.');
    },
    onError: (error: any) => {
      Alert.alert(
        'Error',
        error?.response?.data?.message ||
          error.message ||
          'Failed to add client. Please try again.',
      );
    },
  });

  return {
    clients,
    isLoading,
    refetch,
    addClient:   addClientMutation.mutate,
    isAddingClient: addClientMutation.isPending,
  };
}
